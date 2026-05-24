# Streak System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Supabase-backed daily study streak that increments when the user opens the app, supports one freeze per week, celebrates milestones at 7/30/100 days, and displays a fire badge in the Home header + a streak card on the Home screen.

**Architecture:** Three Supabase tables (`user_streaks`, `user_streak_days`, `user_streak_milestones`) hold all state. A single Edge Function (`record-open`) receives the user's timezone, computes the local date server-side, and updates all tables inside a locked Postgres RPC (`update_streak`). The RPC is callable only by service_role. A `StreakProvider` at the root layout calls `record-open` on app mount and resume (via AppState), exposes state via context. Home screen reads from context to render `StreakBadge`, `StreakCard`, `StreakSheet`, and `MilestoneCelebration`.

**Tech Stack:** Supabase (PostgreSQL, Edge Functions, Deno), React Native + Expo, react-native-reanimated, expo-localization, AppState API, tsx (test runner)

**Spec:** `docs/superpowers/specs/2026-05-25-streak-system-design.md`

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `supabase/migrations/20260525000000_streak_system.sql` | All three tables + RLS + `update_streak` RPC + permission grants |
| Create | `supabase/functions/record-open/index.ts` | Edge Function — timezone → local_date + streak update |
| Modify | `lib/types.ts` | Add `StreakState`, `RecordOpenResponse`, `StreakDayRecord` |
| Create | `lib/streak-helpers.ts` | Pure helpers: `isoWeekStart`, `buildWeekDays` (testable, no React) |
| Create | `lib/streak.ts` | `StreakProvider`, `useStreak` hook — AppState lifecycle + API calls |
| Create | `components/StreakBadge.tsx` | `🔥 N` header badge, tap to open sheet |
| Create | `components/StreakCard.tsx` | Home screen streak card (numeral, freeze pill, status) |
| Create | `components/StreakSheet.tsx` | Bottom sheet — 7-day calendar, milestone badges, stats |
| Create | `components/MilestoneCelebration.tsx` | Full-screen milestone overlay with reduce-motion support |
| Modify | `app/_layout.tsx` | Wrap with `StreakProvider` |
| Modify | `app/(tabs)/index.tsx` | Consume `useStreak`, render components |
| Create | `tests/streak-helpers.test.ts` | Unit tests importing real helpers from `lib/streak-helpers.ts` |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260525000000_streak_system.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260525000000_streak_system.sql

-- ── user_streaks ──────────────────────────────────────────
-- One row per user. Summary state. Service role owns all writes.
CREATE TABLE user_streaks (
  user_id               uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_active_date      date,
  current_streak        int  NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak        int  NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  freeze_uses_this_week int  NOT NULL DEFAULT 0 CHECK (freeze_uses_this_week >= 0 AND freeze_uses_this_week <= 1),
  freeze_week_start     date,
  timezone              text DEFAULT 'UTC',
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own streak"
  ON user_streaks FOR SELECT USING (auth.uid() = user_id);

-- ── user_streak_days ──────────────────────────────────────
-- One row per user per active/frozen day.
-- Missed days derived from gaps — not stored.
CREATE TABLE user_streak_days (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_date  date NOT NULL,
  status      text NOT NULL CHECK (status IN ('active', 'frozen')),
  timezone    text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, local_date)
);

ALTER TABLE user_streak_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own streak days"
  ON user_streak_days FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_streak_days_user_date
  ON user_streak_days (user_id, local_date DESC);

-- ── user_streak_milestones ────────────────────────────────
-- Prevents milestone modal firing more than once per user.
CREATE TABLE user_streak_milestones (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone  int  NOT NULL CHECK (milestone IN (7, 30, 100)),
  sent_at    timestamptz DEFAULT now(),
  PRIMARY KEY(user_id, milestone)
);

ALTER TABLE user_streak_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own milestones"
  ON user_streak_milestones FOR SELECT USING (auth.uid() = user_id);

-- ── update_streak RPC ─────────────────────────────────────
-- Called ONLY by the record-open Edge Function (service role).
-- Locked to service_role — anon/authenticated users cannot call it.
-- First-open race is handled by INSERT ... ON CONFLICT before the FOR UPDATE.
CREATE OR REPLACE FUNCTION update_streak(
  p_user_id    uuid,
  p_local_date date,
  p_timezone   text,
  p_week_start date
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row           user_streaks%ROWTYPE;
  v_gap           int;
  v_milestone     int;
  v_milestone_new int := NULL;
BEGIN
  -- Ensure row exists before locking (handles first-open race)
  INSERT INTO user_streaks (user_id, freeze_week_start, timezone)
  VALUES (p_user_id, p_week_start, p_timezone)
  ON CONFLICT (user_id) DO NOTHING;

  -- Now lock the row for this transaction
  SELECT * INTO v_row
  FROM user_streaks
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Guard: reject dates in the past (client clock drift or replay)
  IF v_row.last_active_date IS NOT NULL AND p_local_date < v_row.last_active_date THEN
    RETURN jsonb_build_object(
      'current_streak',        v_row.current_streak,
      'longest_streak',        v_row.longest_streak,
      'freeze_uses_this_week', v_row.freeze_uses_this_week,
      'local_date',            p_local_date::text,
      'week_start',            p_week_start::text,
      'today_recorded',        true
    );
  END IF;

  -- Already recorded today
  IF v_row.last_active_date = p_local_date THEN
    RETURN jsonb_build_object(
      'current_streak',        v_row.current_streak,
      'longest_streak',        v_row.longest_streak,
      'freeze_uses_this_week', v_row.freeze_uses_this_week,
      'local_date',            p_local_date::text,
      'week_start',            p_week_start::text,
      'today_recorded',        true
    );
  END IF;

  -- First open (no last_active_date yet)
  IF v_row.last_active_date IS NULL THEN
    UPDATE user_streaks SET
      last_active_date      = p_local_date,
      current_streak        = 1,
      longest_streak        = 1,
      freeze_week_start     = p_week_start,
      timezone              = p_timezone,
      updated_at            = now()
    WHERE user_id = p_user_id;

    INSERT INTO user_streak_days (user_id, local_date, status, timezone)
    VALUES (p_user_id, p_local_date, 'active', p_timezone)
    ON CONFLICT (user_id, local_date) DO NOTHING;

    RETURN jsonb_build_object(
      'current_streak',        1,
      'longest_streak',        1,
      'freeze_uses_this_week', 0,
      'local_date',            p_local_date::text,
      'week_start',            p_week_start::text,
      'today_recorded',        false
    );
  END IF;

  v_gap := p_local_date - v_row.last_active_date;

  -- Reset freeze count when entering a new ISO week
  IF v_row.freeze_week_start IS NULL OR v_row.freeze_week_start < p_week_start THEN
    v_row.freeze_uses_this_week := 0;
    v_row.freeze_week_start := p_week_start;
  END IF;

  -- Apply streak logic
  IF v_gap = 1 THEN
    v_row.current_streak := v_row.current_streak + 1;
    INSERT INTO user_streak_days (user_id, local_date, status, timezone)
    VALUES (p_user_id, p_local_date, 'active', p_timezone)
    ON CONFLICT (user_id, local_date) DO NOTHING;

  ELSIF v_gap = 2 AND v_row.freeze_uses_this_week < 1 THEN
    v_row.current_streak := v_row.current_streak + 1;
    v_row.freeze_uses_this_week := v_row.freeze_uses_this_week + 1;
    -- Frozen row for missed day
    INSERT INTO user_streak_days (user_id, local_date, status, timezone)
    VALUES (p_user_id, v_row.last_active_date + 1, 'frozen', p_timezone)
    ON CONFLICT (user_id, local_date) DO NOTHING;
    -- Active row for today
    INSERT INTO user_streak_days (user_id, local_date, status, timezone)
    VALUES (p_user_id, p_local_date, 'active', p_timezone)
    ON CONFLICT (user_id, local_date) DO NOTHING;

  ELSE
    v_row.current_streak := 1;
    INSERT INTO user_streak_days (user_id, local_date, status, timezone)
    VALUES (p_user_id, p_local_date, 'active', p_timezone)
    ON CONFLICT (user_id, local_date) DO NOTHING;
  END IF;

  -- Update longest
  IF v_row.current_streak > v_row.longest_streak THEN
    v_row.longest_streak := v_row.current_streak;
  END IF;

  -- Check milestones
  FOREACH v_milestone IN ARRAY ARRAY[7, 30, 100] LOOP
    IF v_row.current_streak = v_milestone THEN
      INSERT INTO user_streak_milestones (user_id, milestone)
      VALUES (p_user_id, v_milestone)
      ON CONFLICT (user_id, milestone) DO NOTHING;
      IF FOUND THEN
        v_milestone_new := v_milestone;
      END IF;
    END IF;
  END LOOP;

  UPDATE user_streaks SET
    last_active_date      = p_local_date,
    current_streak        = v_row.current_streak,
    longest_streak        = v_row.longest_streak,
    freeze_uses_this_week = v_row.freeze_uses_this_week,
    freeze_week_start     = v_row.freeze_week_start,
    timezone              = p_timezone,
    updated_at            = now()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'current_streak',        v_row.current_streak,
    'longest_streak',        v_row.longest_streak,
    'freeze_uses_this_week', v_row.freeze_uses_this_week,
    'milestone_unlocked',    v_milestone_new,
    'local_date',            p_local_date::text,
    'week_start',            p_week_start::text,
    'today_recorded',        false
  );
END;
$$;

-- Lock the RPC down to service_role only
REVOKE ALL ON FUNCTION update_streak(uuid, date, text, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION update_streak(uuid, date, text, date) FROM anon;
REVOKE ALL ON FUNCTION update_streak(uuid, date, text, date) FROM authenticated;
GRANT EXECUTE ON FUNCTION update_streak(uuid, date, text, date) TO service_role;
```

- [ ] **Step 2: Apply migration**

```bash
supabase db push
```

Expected: migration applies cleanly. Verify three tables appear in Studio. Verify `update_streak` function is listed in Functions and is not callable by the anon role.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260525000000_streak_system.sql
git commit -m "feat(db): add streak tables, update_streak RPC, service_role-only grants"
```

---

## Task 2: Types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Append to `lib/types.ts`**

```ts
// ── Streak ────────────────────────────────────────────────

export interface StreakState {
  current_streak: number;
  longest_streak: number;
  freeze_uses_this_week: number;
  last_active_date: string | null; // "YYYY-MM-DD" — server's local date
  week_start: string | null;       // "YYYY-MM-DD" — ISO week Monday
}

export interface RecordOpenResponse {
  current_streak: number;
  longest_streak: number;
  freeze_uses_this_week: number;
  local_date: string;    // "YYYY-MM-DD" — server-derived, use this for UI
  week_start: string;    // "YYYY-MM-DD" — ISO week Monday
  milestone_unlocked?: 7 | 30 | 100;
  today_recorded: boolean;
}

export interface StreakDayRecord {
  local_date: string; // "YYYY-MM-DD"
  status: "active" | "frozen";
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat(types): add StreakState, RecordOpenResponse, StreakDayRecord"
```

---

## Task 3: Edge Function — `record-open`

**Files:**
- Create: `supabase/functions/record-open/index.ts`

- [ ] **Step 1: Create the Edge Function**

```ts
// supabase/functions/record-open/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const anonSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_TIMEZONE_LENGTH = 64;

// Returns "YYYY-MM-DD" for now() converted to an IANA timezone.
function toLocalDateString(utcDate: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(utcDate);
  } catch {
    return utcDate.toISOString().slice(0, 10);
  }
}

// Returns the ISO week Monday "YYYY-MM-DD" for a local date string.
function isoWeekStart(localDate: string): string {
  const d = new Date(localDate + "T00:00:00Z");
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Parse Bearer token strictly
  const authHeader = req.headers.get("Authorization") ?? "";
  const tokenMatch = authHeader.match(/^Bearer\s+(\S+)$/);
  if (!tokenMatch) {
    return new Response(JSON.stringify({ error: "Missing or malformed Authorization header" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { data: { user }, error: authError } = await anonSupabase.auth.getUser(tokenMatch[1]);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const rawTimezone = typeof body.timezone === "string" ? body.timezone : "UTC";
  // Validate and cap timezone string
  const timezone =
    rawTimezone.length > MAX_TIMEZONE_LENGTH || !/^[A-Za-z0-9/_+-]+$/.test(rawTimezone)
      ? "UTC"
      : rawTimezone;

  const localDate = toLocalDateString(new Date(), timezone);
  const weekStart = isoWeekStart(localDate);

  const { data, error } = await serviceSupabase.rpc("update_streak", {
    p_user_id: user.id,
    p_local_date: localDate,
    p_timezone: timezone,
    p_week_start: weekStart,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
```

- [ ] **Step 2: Deploy function**

```bash
supabase functions deploy record-open
```

Expected: deployed successfully. No error in Supabase dashboard logs.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/record-open/index.ts
git commit -m "feat(edge): add record-open Edge Function with strict auth, timezone validation"
```

---

## Task 4: Pure helpers + unit tests

**Files:**
- Create: `lib/streak-helpers.ts`
- Create: `tests/streak-helpers.test.ts`

- [ ] **Step 1: Write the failing tests first**

```ts
// tests/streak-helpers.test.ts
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isoWeekStart, buildWeekDays } from "../lib/streak-helpers.js";

describe("isoWeekStart", () => {
  test("Monday returns itself", () => {
    assert.equal(isoWeekStart("2026-05-25"), "2026-05-25");
  });

  test("Sunday returns previous Monday", () => {
    assert.equal(isoWeekStart("2026-05-24"), "2026-05-18");
  });

  test("Saturday returns previous Monday", () => {
    assert.equal(isoWeekStart("2026-05-23"), "2026-05-18");
  });

  test("Wednesday mid-week returns Monday", () => {
    assert.equal(isoWeekStart("2026-05-27"), "2026-05-25");
  });
});

describe("buildWeekDays", () => {
  test("today without a record shows today status", () => {
    const days = buildWeekDays("2026-05-25", "2026-05-25", []);
    const today = days.find((d) => d.date === "2026-05-25");
    assert.equal(today?.status, "today");
  });

  test("today with active record shows active", () => {
    const days = buildWeekDays("2026-05-25", "2026-05-25", [
      { local_date: "2026-05-25", status: "active" },
    ]);
    const today = days.find((d) => d.date === "2026-05-25");
    assert.equal(today?.status, "active");
  });

  test("past day with no record shows missed", () => {
    const days = buildWeekDays("2026-05-27", "2026-05-25", []);
    const mon = days.find((d) => d.date === "2026-05-25");
    assert.equal(mon?.status, "missed");
  });

  test("frozen day shows frozen", () => {
    const days = buildWeekDays("2026-05-26", "2026-05-25", [
      { local_date: "2026-05-25", status: "active" },
      { local_date: "2026-05-26", status: "frozen" },
    ]);
    assert.equal(days.find((d) => d.date === "2026-05-26")?.status, "frozen");
  });

  test("future days show future status", () => {
    const days = buildWeekDays("2026-05-25", "2026-05-25", []);
    assert.ok(days.some((d) => d.status === "future"));
  });

  test("produces exactly 7 days", () => {
    const days = buildWeekDays("2026-05-25", "2026-05-25", []);
    assert.equal(days.length, 7);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../lib/streak-helpers.js'`

- [ ] **Step 3: Create `lib/streak-helpers.ts`**

```ts
// lib/streak-helpers.ts
import type { StreakDayRecord } from "./types";

export type WeekDayStatus = "active" | "frozen" | "missed" | "today" | "future";

export interface WeekDay {
  date: string;
  status: WeekDayStatus;
}

// Returns ISO week Monday "YYYY-MM-DD" for a given "YYYY-MM-DD".
export function isoWeekStart(localDate: string): string {
  const d = new Date(localDate + "T00:00:00Z");
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

// Builds a 7-day array for the week containing `weekStart`.
// `today` and `weekStart` come from the server response — never computed client-side.
export function buildWeekDays(
  today: string,
  weekStart: string,
  days: StreakDayRecord[],
): WeekDay[] {
  const result: WeekDay[] = [];
  const weekStartDate = new Date(weekStart + "T00:00:00Z");
  const statusMap = new Map(days.map((d) => [d.local_date, d.status]));

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStartDate);
    d.setUTCDate(weekStartDate.getUTCDate() + i);
    const dateStr = d.toISOString().slice(0, 10);

    if (dateStr > today) {
      result.push({ date: dateStr, status: "future" });
    } else if (dateStr === today) {
      result.push({ date: dateStr, status: statusMap.has(dateStr) ? "active" : "today" });
    } else {
      result.push({ date: dateStr, status: statusMap.get(dateStr) ?? "missed" });
    }
  }
  return result;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test
```

Expected: all streak-helpers tests pass. Other test files also pass (no regressions).

- [ ] **Step 5: Commit**

```bash
git add lib/streak-helpers.ts tests/streak-helpers.test.ts
git commit -m "feat(lib): add streak-helpers with isoWeekStart and buildWeekDays + tests"
```

---

## Task 5: `StreakProvider` and `useStreak` hook

**Files:**
- Create: `lib/streak.ts`

- [ ] **Step 1: Create `lib/streak.ts`**

```ts
// lib/streak.ts
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { AppState, type AppStateStatus } from "react-native";
import * as Localization from "expo-localization";
import { supabase } from "./supabase";
import { buildWeekDays, type WeekDay } from "./streak-helpers";
import type { RecordOpenResponse, StreakState, StreakDayRecord } from "./types";

const FALLBACK_TIMEZONE = "UTC";

function getTimezone(): string {
  return Localization.getCalendars()[0]?.timeZone ?? FALLBACK_TIMEZONE;
}

async function recordOpen(): Promise<RecordOpenResponse> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("No session token");

  const { data, error } = await supabase.functions.invoke<RecordOpenResponse>("record-open", {
    body: { timezone: getTimezone() },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error || !data) throw error ?? new Error("record-open returned no data");
  return data;
}

async function fetchWeekDays(weekStart: string, today: string): Promise<StreakDayRecord[]> {
  const { data, error } = await supabase
    .from("user_streak_days")
    .select("local_date, status")
    .gte("local_date", weekStart)
    .lte("local_date", today)
    .order("local_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as StreakDayRecord[];
}

// ── Context ───────────────────────────────────────────────

interface StreakContextValue {
  streak: StreakState | null;
  weekDays: WeekDay[];
  milestoneUnlocked: 7 | 30 | 100 | null;
  dismissMilestone: () => void;
  loading: boolean;
}

const StreakContext = createContext<StreakContextValue>({
  streak: null,
  weekDays: [],
  milestoneUnlocked: null,
  dismissMilestone: () => {},
  loading: true,
});

// ── Provider ──────────────────────────────────────────────

export function StreakProvider({ children }: { children: ReactNode }) {
  const [streak, setStreak] = useState<StreakState | null>(null);
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [milestoneUnlocked, setMilestoneUnlocked] = useState<7 | 30 | 100 | null>(null);
  const [loading, setLoading] = useState(true);
  const lastRecordedDate = useRef<string | null>(null);

  const dismissMilestone = useCallback(() => setMilestoneUnlocked(null), []);

  const recordAndRefresh = useCallback(async () => {
    try {
      const response = await recordOpen();

      // Skip re-render if we already recorded today (same date idempotent)
      if (lastRecordedDate.current === response.local_date && streak !== null) return;
      lastRecordedDate.current = response.local_date;

      // Sequential: fetch days only after record-open completes
      const days = await fetchWeekDays(response.week_start, response.local_date);

      setStreak({
        current_streak: response.current_streak,
        longest_streak: response.longest_streak,
        freeze_uses_this_week: response.freeze_uses_this_week,
        last_active_date: response.local_date,
        week_start: response.week_start,
      });
      setWeekDays(buildWeekDays(response.local_date, response.week_start, days));
      if (response.milestone_unlocked) {
        setMilestoneUnlocked(response.milestone_unlocked);
      }
    } catch {
      // Non-fatal — streak UI degrades gracefully when offline or unconfigured
    } finally {
      setLoading(false);
    }
  }, [streak]);

  // Record on mount (app open)
  useEffect(() => {
    recordAndRefresh();
  }, [recordAndRefresh]);

  // Record on app resume (background → foreground)
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        recordAndRefresh();
      }
    });
    return () => sub.remove();
  }, [recordAndRefresh]);

  return (
    <StreakContext.Provider value={{ streak, weekDays, milestoneUnlocked, dismissMilestone, loading }}>
      {children}
    </StreakContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────

export function useStreak(): StreakContextValue {
  return useContext(StreakContext);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/streak.ts
git commit -m "feat(lib): add StreakProvider with AppState lifecycle and useStreak hook"
```

---

## Task 6: UI Components

**Files:**
- Create: `components/StreakBadge.tsx`
- Create: `components/StreakCard.tsx`
- Create: `components/StreakSheet.tsx`
- Create: `components/MilestoneCelebration.tsx`

- [ ] **Step 1: Create `components/StreakBadge.tsx`**

```tsx
// components/StreakBadge.tsx
import { Pressable, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";
import { colors, fonts } from "../lib/theme";

interface Props {
  count: number;
  onPress: () => void;
}

export function StreakBadge({ count, onPress }: Props) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (count > 0) {
      scale.value = withSequence(
        withTiming(1.25, { duration: 200, easing: Easing.out(Easing.back(2)) }),
        withTiming(1, { duration: 200, easing: Easing.in(Easing.quad) }),
      );
    }
  }, [count, scale]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${count}-day streak. Tap for details.`}
    >
      <Animated.View style={[styles.badge, animStyle]}>
        <Text style={styles.fire}>🔥</Text>
        <Text style={styles.count}>{count}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "rgba(217, 119, 6, 0.12)",
    borderWidth: 1,
    borderColor: colors.amberBorder,
    shadowColor: colors.amberGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  fire: { fontSize: 14 },
  count: {
    color: colors.amberGlow,
    fontSize: 13,
    fontFamily: fonts.uiBold,
    fontWeight: "700",
  },
});
```

- [ ] **Step 2: Create `components/StreakCard.tsx`**

```tsx
// components/StreakCard.tsx
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { colors, fonts } from "../lib/theme";
import type { StreakState } from "../lib/types";

interface Props {
  streak: StreakState;
}

export function StreakCard({ streak }: Props) {
  const studiedToday = streak.last_active_date === streak.week_start
    ? false
    : streak.last_active_date !== null; // Use server date, not client Date()
  const freezeAvailable = streak.freeze_uses_this_week < 1;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(750)} style={styles.card}>
      <View style={styles.topAccent} />
      <View style={styles.row}>
        <View style={styles.numeralBlock}>
          <Text style={styles.numeral}>{streak.current_streak}</Text>
          <Text style={styles.numeralLabel}>day streak</Text>
        </View>
        <View style={styles.rightBlock}>
          <Text style={styles.longest}>Best: {streak.longest_streak} days</Text>
          <View style={[styles.freezePill, !freezeAvailable && styles.freezePillUsed]}>
            <Text style={styles.freezeText}>
              {freezeAvailable ? "❄️  1 freeze available" : "❄️  Freeze used"}
            </Text>
          </View>
        </View>
      </View>
      <Text style={[styles.status, studiedToday && styles.statusDone]}>
        {studiedToday ? "Opened today ✓" : "Open daily to keep your streak"}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "rgba(17, 17, 20, 0.85)",
    borderWidth: 1,
    borderColor: colors.amberBorder,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: colors.amber,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
  },
  topAccent: { height: 2, backgroundColor: colors.amberGlow, opacity: 0.6 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  numeralBlock: { alignItems: "flex-start" },
  numeral: {
    color: colors.amberGlow,
    fontSize: 48,
    fontFamily: fonts.verse,
    lineHeight: 52,
  },
  numeralLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.uiMedium,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  rightBlock: { alignItems: "flex-end", gap: 8 },
  longest: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.uiMedium },
  freezePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(59, 130, 246, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.20)",
  },
  freezePillUsed: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  freezeText: { color: colors.textSecondary, fontSize: 11, fontFamily: fonts.uiMedium },
  status: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.uiMedium,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  statusDone: { color: colors.success },
});
```

- [ ] **Step 3: Create `components/StreakSheet.tsx`**

```tsx
// components/StreakSheet.tsx
import { View, Text, StyleSheet, Modal, Pressable } from "react-native";
import { colors, fonts } from "../lib/theme";
import type { StreakState } from "../lib/types";
import type { WeekDay } from "../lib/streak-helpers";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MILESTONES = [7, 30, 100];

interface Props {
  visible: boolean;
  onClose: () => void;
  streak: StreakState;
  weekDays: WeekDay[];
}

export function StreakSheet({ visible, onClose, streak, weekDays }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close streak details"
      />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Your Streak</Text>

        {/* 7-day calendar row */}
        <View style={styles.calendarRow}>
          {weekDays.map((day, i) => (
            <View key={day.date} style={styles.dayCol}>
              <Text style={styles.dayLabel}>{DAYS[i]}</Text>
              <View style={[styles.dayDot, dotStyle(day.status)]} />
            </View>
          ))}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <LegendItem color={colors.amberGlow} label="Active" />
          <LegendItem color="#60A5FA" label="Frozen" />
          <LegendItem color={colors.graphite} label="Missed" />
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatBlock label="Current" value={streak.current_streak} />
          <View style={styles.statDivider} />
          <StatBlock label="Best" value={streak.longest_streak} />
        </View>

        {/* Milestone badges */}
        <Text style={styles.milestonesLabel}>Milestones</Text>
        <View style={styles.milestonesRow}>
          {MILESTONES.map((m) => {
            const earned = streak.longest_streak >= m;
            return (
              <View key={m} style={[styles.badge, earned && styles.badgeEarned]}>
                <Text style={[styles.badgeNum, earned && styles.badgeNumEarned]}>{m}</Text>
                <Text style={[styles.badgeDay, earned && styles.badgeDayEarned]}>days</Text>
              </View>
            );
          })}
        </View>

        <Pressable style={styles.closeBtn} onPress={onClose} accessibilityRole="button">
          <Text style={styles.closeBtnText}>Close</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function dotStyle(status: WeekDay["status"]): object {
  switch (status) {
    case "active":
      return {
        backgroundColor: colors.amberGlow,
        shadowColor: colors.amberGlow,
        shadowOpacity: 0.6,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 0 },
      };
    case "frozen":
      return { backgroundColor: "#60A5FA" };
    case "today":
      return { backgroundColor: "transparent", borderWidth: 2, borderColor: colors.amberGlow };
    case "future":
      return { backgroundColor: colors.graphite, opacity: 0.3 };
    default: // missed
      return { backgroundColor: colors.graphite };
  }
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    backgroundColor: colors.onyx,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: colors.amberBorder,
  },
  handle: {
    width: 36,
    height: 3,
    backgroundColor: colors.steel,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontFamily: fonts.verse,
    textAlign: "center",
    marginBottom: 24,
  },
  calendarRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  dayCol: { alignItems: "center", gap: 6 },
  dayLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: fonts.uiMedium,
    letterSpacing: 0.5,
  },
  dayDot: { width: 28, height: 28, borderRadius: 14 },
  legend: { flexDirection: "row", justifyContent: "center", gap: 16, marginBottom: 24 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { color: colors.textMuted, fontSize: 11, fontFamily: fonts.uiMedium },
  statsRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 28 },
  statBlock: { alignItems: "center", paddingHorizontal: 32 },
  statValue: { color: colors.amberGlow, fontSize: 36, fontFamily: fonts.verse },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.uiMedium,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  statDivider: { width: 1, height: 40, backgroundColor: colors.glass },
  milestonesLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: fonts.uiBold,
    letterSpacing: 2,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 12,
  },
  milestonesRow: { flexDirection: "row", justifyContent: "center", gap: 16, marginBottom: 28 },
  badge: {
    alignItems: "center",
    width: 60,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.graphite,
    borderWidth: 1,
    borderColor: colors.steel,
    opacity: 0.4,
  },
  badgeEarned: {
    backgroundColor: "rgba(217, 119, 6, 0.12)",
    borderColor: colors.amberBorder,
    opacity: 1,
    shadowColor: colors.amberGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  badgeNum: { color: colors.textGhost, fontSize: 20, fontFamily: fonts.verse },
  badgeNumEarned: { color: colors.amberGlow },
  badgeDay: {
    color: colors.textGhost,
    fontSize: 9,
    fontFamily: fonts.uiMedium,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  badgeDayEarned: { color: colors.amberGlow },
  closeBtn: {
    alignSelf: "center",
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  closeBtnText: { color: colors.textSecondary, fontSize: 13, fontFamily: fonts.uiMedium },
});
```

- [ ] **Step 4: Create `components/MilestoneCelebration.tsx`**

Note: uses `AccessibilityInfo` from React Native directly — no extra dependency needed.

```tsx
// components/MilestoneCelebration.tsx
import { View, Text, StyleSheet, Modal, Pressable, AccessibilityInfo } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useEffect, useState } from "react";
import { colors, fonts } from "../lib/theme";

const MESSAGES: Record<number, string> = {
  7: "One week of daily scripture. Your commitment is taking root.",
  30: "A full month. The Word is becoming part of your rhythm.",
  100: "One hundred days. A testimony written in faithfulness.",
};

interface Props {
  milestone: 7 | 30 | 100;
  onDismiss: () => void;
}

export function MilestoneCelebration({ milestone, onDismiss }: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const pulse = useSharedValue(1);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (!reduceMotion) {
      pulse.value = withRepeat(
        withSequence(withTiming(1.15, { duration: 600 }), withTiming(1, { duration: 600 })),
        3,
        false,
      );
    }
  }, [pulse, reduceMotion]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    shadowOpacity: reduceMotion ? 0.5 : pulse.value * 0.8,
  }));

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onDismiss}>
      <Animated.View
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        style={styles.overlay}
      >
        <Animated.View style={[styles.card, glowStyle]}>
          <View style={styles.glowRing} />
          <Text style={styles.fire}>🔥</Text>
          <Text style={styles.number}>{milestone}</Text>
          <Text style={styles.days}>DAYS</Text>
          <Text style={styles.message}>{MESSAGES[milestone]}</Text>
          <Pressable
            style={styles.button}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Continue"
          >
            <Text style={styles.buttonText}>Continue</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.onyx,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.amberBorder,
    alignItems: "center",
    padding: 36,
    shadowColor: colors.amberGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 32,
    shadowOpacity: 0.5,
  },
  glowRing: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(217, 119, 6, 0.05)",
    top: "50%",
    left: "50%",
    marginTop: -100,
    marginLeft: -100,
  },
  fire: { fontSize: 48, marginBottom: 8 },
  number: { color: colors.amberGlow, fontSize: 72, fontFamily: fonts.verse, lineHeight: 76 },
  days: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.uiBold,
    letterSpacing: 4,
    marginBottom: 20,
  },
  message: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: fonts.verseItalic,
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  button: {
    paddingHorizontal: 36,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: "rgba(217, 119, 6, 0.15)",
    borderWidth: 1,
    borderColor: colors.amberBorder,
  },
  buttonText: { color: colors.amberGlow, fontSize: 14, fontFamily: fonts.uiBold },
});
```

- [ ] **Step 5: Commit all four components**

```bash
git add components/StreakBadge.tsx components/StreakCard.tsx components/StreakSheet.tsx components/MilestoneCelebration.tsx
git commit -m "feat(ui): add StreakBadge, StreakCard, StreakSheet, MilestoneCelebration"
```

---

## Task 7: Wire `StreakProvider` into root layout

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Add import**

In `app/_layout.tsx`, add after the existing provider imports:

```tsx
import { StreakProvider } from "../lib/streak";
```

- [ ] **Step 2: Wrap the tree**

Find the `<SettingsProvider>` wrapper in the return statement. Wrap it with `StreakProvider`:

```tsx
<StreakProvider>
  <SettingsProvider>
    <QueryClientProvider client={queryClient}>
      {/* ... existing content ... */}
    </QueryClientProvider>
  </SettingsProvider>
</StreakProvider>
```

`StreakProvider` must be inside the auth-ready guard (after `if (!ready ...)` checks pass) so `supabase.auth.getSession()` returns a valid session when `record-open` is called.

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat(root): add StreakProvider to root layout with AppState lifecycle"
```

---

## Task 8: Wire components into Home screen

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Add imports**

Add after the existing imports:

```tsx
import { useState } from "react";
import { useStreak } from "../../lib/streak";
import { StreakBadge } from "../../components/StreakBadge";
import { StreakCard } from "../../components/StreakCard";
import { StreakSheet } from "../../components/StreakSheet";
import { MilestoneCelebration } from "../../components/MilestoneCelebration";
```

- [ ] **Step 2: Add hook inside `HomeScreen`**

After `const votd = getVerseOfTheDay();`:

```tsx
const { streak, weekDays, milestoneUnlocked, dismissMilestone } = useStreak();
const [sheetVisible, setSheetVisible] = useState(false);
```

- [ ] **Step 3: Replace logo `Animated.Text` with a row**

Find:

```tsx
<Animated.Text
  entering={FadeInDown.duration(600).delay(100)}
  style={styles.logo}
  accessibilityRole="header"
>
  A I O N
</Animated.Text>
```

Replace with:

```tsx
<Animated.View
  entering={FadeInDown.duration(600).delay(100)}
  style={styles.logoRow}
  accessibilityRole="header"
>
  <Text style={styles.logo}>A I O N</Text>
  {streak && (
    <StreakBadge count={streak.current_streak} onPress={() => setSheetVisible(true)} />
  )}
</Animated.View>
```

- [ ] **Step 4: Add `StreakCard` after the VOTD section**

Find the closing `</Animated.View>` that wraps the VOTD `<Pressable>`. After it, add:

```tsx
{streak && <StreakCard streak={streak} />}
```

- [ ] **Step 5: Add modals before closing `</ImageBackground>`**

```tsx
{streak && (
  <StreakSheet
    visible={sheetVisible}
    onClose={() => setSheetVisible(false)}
    streak={streak}
    weekDays={weekDays}
  />
)}

{milestoneUnlocked && (
  <MilestoneCelebration
    milestone={milestoneUnlocked}
    onDismiss={dismissMilestone}
  />
)}
```

- [ ] **Step 6: Add `logoRow` style**

In the `StyleSheet.create({})` block, add:

```ts
logoRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  marginBottom: 14,
},
```

Remove `marginBottom` from the existing `logo` style if present (spacing is now owned by `logoRow`).

- [ ] **Step 7: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "feat(home): add StreakBadge, StreakCard, StreakSheet, MilestoneCelebration to Home screen"
```

---

## Task 9: Dependency check

**Files:**
- Check: `package.json`

- [ ] **Step 1: Verify expo-localization is present**

```bash
grep "expo-localization" package.json
```

If missing:

```bash
npx expo install expo-localization
git add package.json package-lock.json
git commit -m "chore: add expo-localization for server-side timezone detection"
```

---

## Task 10: Final verification

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: all tests pass including the new `streak-helpers` tests.

- [ ] **Step 2: Run quality gate**

```bash
./check.sh
```

Expected: format ✓, lint ✓, type-check ✓, all tests ✓.

- [ ] **Step 3: Start the app and test manually**

```bash
npx expo start
```

Verify:
- Fire badge appears in header on Home screen with streak count
- Streak card appears below VOTD
- Tapping the badge opens `StreakSheet`
- 7-day calendar shows correct day statuses
- Milestone badges render (locked until earned)
- Backgrounding and foregrounding the app does not double-increment (idempotent)

- [ ] **Step 4: Update AGENT.md**

Append to the `## Change Log` section in `AGENT.md`:

```markdown
### 2026-05-25 (Australia/Sydney)
**Raouf:**
- **Scope:** Streak system — daily study counter with freeze and milestones
- **Summary:** Added Supabase-backed daily streak tracking. Three new tables: `user_streaks` (summary), `user_streak_days` (history), `user_streak_milestones` (dedupe). `update_streak` Postgres RPC handles all state mutations atomically with FOR UPDATE locking; callable only by service_role. `record-open` Edge Function receives timezone, derives local_date server-side, returns streak state + server dates. `StreakProvider` at root layout records on app mount and resume via AppState. UI: StreakBadge in header, StreakCard on Home, StreakSheet (7-day calendar + milestones), MilestoneCelebration overlay (reduce-motion safe).
- **Files Changed:**
  - supabase/migrations/20260525000000_streak_system.sql (created)
  - supabase/functions/record-open/index.ts (created)
  - lib/types.ts (StreakState, RecordOpenResponse, StreakDayRecord added)
  - lib/streak-helpers.ts (created)
  - lib/streak.ts (created)
  - components/StreakBadge.tsx (created)
  - components/StreakCard.tsx (created)
  - components/StreakSheet.tsx (created)
  - components/MilestoneCelebration.tsx (created)
  - app/_layout.tsx (StreakProvider added)
  - app/(tabs)/index.tsx (streak UI wired in)
  - tests/streak-helpers.test.ts (created)
- **Verification:** `./check.sh` passes — format ✓, lint ✓, type-check ✓, all tests ✓.
- **Follow-ups:** Push notification milestones (phase 2) — requires push token table + permission flow + provider integration.
```

- [ ] **Step 5: Update CHANGELOG.md**

Add an entry under `## [Unreleased]` (or create the section if it doesn't exist):

```markdown
### Added
- Daily study streak system: fire badge in header, streak card on Home, 7-day history sheet, milestone celebrations at 7/30/100 days
- Streak freeze mechanic: one grace day per ISO week
- `update_streak` Postgres RPC with service_role-only access and FOR UPDATE locking
- `record-open` Edge Function with server-side timezone/date derivation
```

- [ ] **Step 6: Commit final housekeeping**

```bash
git add AGENT.md CHANGELOG.md
git commit -m "docs: update AGENT.md and CHANGELOG.md for streak system"
```

---

## Self-Review

**Spec coverage:**

| Requirement | Task |
|---|---|
| Three tables + RLS + cascade deletes | Task 1 |
| NOT NULL + CHECK constraints | Task 1 |
| `update_streak` RPC, service_role only, SET search_path | Task 1 |
| INSERT ON CONFLICT first-open race fix | Task 1 |
| Past-date guard (p_local_date < last_active_date) | Task 1 |
| Client sends timezone only | Task 3 |
| Server derives local_date | Task 3 |
| Timezone validation + length cap | Task 3 |
| Strict Bearer token parsing | Task 3 |
| Access-Control-Allow-Methods | Task 3 |
| `RecordOpenResponse` returns `local_date` + `week_start` | Tasks 2 + 3 |
| Pure helpers in separate file with real tests | Task 4 |
| `npm test` runner (tsx) | Task 4 |
| `buildWeekDays` uses server dates, not client Date() | Tasks 4 + 5 |
| Sequential `fetchWeekDays` after `recordOpen` | Task 5 |
| `StreakProvider` + AppState lifecycle (not just Home mount) | Task 5 |
| `StreakBadge` pulse animation | Task 6 |
| `StreakCard` freeze pill, status line | Task 6 |
| `StreakSheet` 7-day calendar + milestone badges | Task 6 |
| `MilestoneCelebration` + reduce-motion via AccessibilityInfo | Task 6 |
| No `@react-native/hooks` dependency | Task 6 |
| `StreakProvider` in root layout | Task 7 |
| Home screen wiring | Task 8 |
| expo-localization dependency check | Task 9 |
| `./check.sh` gate | Task 10 |
| AGENT.md + CHANGELOG.md entries | Task 10 |

All spec requirements and reviewer fixes covered.

**Placeholder scan:** None.

**Type consistency:** `WeekDay` exported from `streak-helpers.ts`, imported by `StreakSheet` and `streak.ts`. `RecordOpenResponse.local_date`/`week_start` added in Task 2, consumed in Tasks 3 and 5. `StreakState.week_start` added in Task 2, used in `StreakCard` for "Opened today" check. All names consistent throughout.
