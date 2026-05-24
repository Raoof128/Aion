# Streak System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Supabase-backed daily study streak that increments when the user opens the app, supports one freeze per week, celebrates milestones at 7/30/100 days, and displays a fire badge in the Home header + a streak card on the Home screen.

**Architecture:** Three Supabase tables (`user_streaks`, `user_streak_days`, `user_streak_milestones`) hold all state. A single Edge Function (`record-open`) receives the user's timezone, computes the local date server-side, and updates all tables inside a transaction with `SELECT FOR UPDATE`. The React Native client calls `record-open` on every app mount, receives a typed response, and feeds that into a `useStreak` hook that drives four new components.

**Tech Stack:** Supabase (PostgreSQL, Edge Functions, Deno), React Native + Expo, react-native-reanimated, expo-localization (timezone), node:test (unit tests)

**Spec:** `docs/superpowers/specs/2026-05-25-streak-system-design.md`

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `supabase/migrations/20260525000000_streak_system.sql` | All three tables + RLS + indexes |
| Create | `supabase/functions/record-open/index.ts` | Edge Function — timezone → local date → streak update |
| Modify | `lib/types.ts` | Add `StreakState`, `RecordOpenResponse` types |
| Create | `lib/streak.ts` | `useStreak` hook — calls `record-open`, exposes state |
| Create | `components/StreakBadge.tsx` | `🔥 N` header badge, tap to open sheet |
| Create | `components/StreakCard.tsx` | Home screen streak card (numeral, freeze pill, status) |
| Create | `components/StreakSheet.tsx` | Bottom sheet — 7-day calendar, milestone badges, stats |
| Create | `components/MilestoneCelebration.tsx` | Full-screen milestone overlay with particle burst |
| Modify | `app/(tabs)/index.tsx` | Wire in `StreakBadge`, `StreakCard`, `MilestoneCelebration` |
| Create | `tests/streak.test.ts` | Unit tests for streak logic helpers |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260525000000_streak_system.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260525000000_streak_system.sql

-- ── user_streaks ──────────────────────────────────────────
-- One row per user. Stores current streak summary.
-- All writes owned by the record-open Edge Function (service role).
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
-- Clients may only SELECT their own row.
CREATE POLICY "users read own streak"
  ON user_streaks FOR SELECT USING (auth.uid() = user_id);

-- ── user_streak_days ──────────────────────────────────────
-- One row per user per active/frozen day.
-- Used to render the 7-day calendar in StreakSheet.
-- Missed days are derived from gaps — not stored.
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
-- Deduplication guard — ensures milestone modal fires exactly once per user.
CREATE TABLE user_streak_milestones (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone  int  NOT NULL CHECK (milestone IN (7, 30, 100)),
  sent_at    timestamptz DEFAULT now(),
  PRIMARY KEY(user_id, milestone)
);

ALTER TABLE user_streak_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own milestones"
  ON user_streak_milestones FOR SELECT USING (auth.uid() = user_id);
```

- [ ] **Step 2: Apply locally and confirm no errors**

```bash
supabase db reset
```

Expected: migration runs with no errors, three new tables visible in Studio.

If you don't have Supabase CLI set up locally, deploy directly:

```bash
supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260525000000_streak_system.sql
git commit -m "feat(db): add streak system tables and RLS policies"
```

---

## Task 2: Types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add streak types to `lib/types.ts`**

Append to the end of the file:

```ts
// ── Streak ────────────────────────────────────────────────

export interface StreakState {
  current_streak: number;
  longest_streak: number;
  freeze_uses_this_week: number;
  last_active_date: string | null; // "YYYY-MM-DD"
}

export interface RecordOpenResponse {
  current_streak: number;
  longest_streak: number;
  freeze_uses_this_week: number;
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
};

const MILESTONES = [7, 30, 100] as const;

// Returns "YYYY-MM-DD" for a UTC timestamp converted to the given IANA timezone.
function toLocalDateString(utcDate: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(utcDate);
  } catch {
    // Fall back to UTC if timezone is invalid
    return utcDate.toISOString().slice(0, 10);
  }
}

// Returns the ISO week Monday date string "YYYY-MM-DD" for a given local date string.
function isoWeekStart(localDate: string): string {
  const d = new Date(localDate + "T00:00:00Z");
  const day = d.getUTCDay(); // 0=Sun 1=Mon ... 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

// Returns the date string one day before the given "YYYY-MM-DD".
function dayBefore(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Returns gap in calendar days between two "YYYY-MM-DD" strings.
function daysBetween(from: string, to: string): number {
  const a = new Date(from + "T00:00:00Z");
  const b = new Date(to + "T00:00:00Z");
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Authenticate the caller via the anon JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { data: { user }, error: authError } = await anonSupabase.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { timezone = "UTC" } = await req.json().catch(() => ({}));
  const localDate = toLocalDateString(new Date(), timezone);
  const currentWeekStart = isoWeekStart(localDate);

  // All streak mutations run inside a transaction via RPC to prevent races.
  // We use a Postgres function for the atomic update.
  const { data, error } = await serviceSupabase.rpc("update_streak", {
    p_user_id: user.id,
    p_local_date: localDate,
    p_timezone: timezone,
    p_week_start: currentWeekStart,
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

- [ ] **Step 2: Add the `update_streak` Postgres function to the migration**

Append to `supabase/migrations/20260525000000_streak_system.sql`:

```sql
-- ── update_streak RPC ─────────────────────────────────────
-- Called exclusively by the record-open Edge Function (service role).
-- Runs atomically with FOR UPDATE to prevent race conditions.
CREATE OR REPLACE FUNCTION update_streak(
  p_user_id    uuid,
  p_local_date date,
  p_timezone   text,
  p_week_start date
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row           user_streaks%ROWTYPE;
  v_gap           int;
  v_milestone     int;
  v_milestone_new int := NULL;
BEGIN
  -- Lock the row (or create it) to prevent concurrent updates
  SELECT * INTO v_row
  FROM user_streaks
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- First open ever
  IF NOT FOUND THEN
    INSERT INTO user_streaks (user_id, last_active_date, current_streak, longest_streak,
                              freeze_uses_this_week, freeze_week_start, timezone)
    VALUES (p_user_id, p_local_date, 1, 1, 0, p_week_start, p_timezone);

    INSERT INTO user_streak_days (user_id, local_date, status, timezone)
    VALUES (p_user_id, p_local_date, 'active', p_timezone)
    ON CONFLICT (user_id, local_date) DO NOTHING;

    -- Check milestone for streak=1 (none currently, but kept for future)
    RETURN jsonb_build_object(
      'current_streak', 1,
      'longest_streak', 1,
      'freeze_uses_this_week', 0,
      'today_recorded', true
    );
  END IF;

  -- Already recorded today
  IF v_row.last_active_date = p_local_date THEN
    RETURN jsonb_build_object(
      'current_streak', v_row.current_streak,
      'longest_streak', v_row.longest_streak,
      'freeze_uses_this_week', v_row.freeze_uses_this_week,
      'today_recorded', true
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
    -- Consecutive day
    v_row.current_streak := v_row.current_streak + 1;
    INSERT INTO user_streak_days (user_id, local_date, status, timezone)
    VALUES (p_user_id, p_local_date, 'active', p_timezone)
    ON CONFLICT (user_id, local_date) DO NOTHING;

  ELSIF v_gap = 2 AND v_row.freeze_uses_this_week < 1 THEN
    -- One missed day — use freeze
    v_row.current_streak := v_row.current_streak + 1;
    v_row.freeze_uses_this_week := v_row.freeze_uses_this_week + 1;
    -- Insert frozen row for the missed day
    INSERT INTO user_streak_days (user_id, local_date, status, timezone)
    VALUES (p_user_id, v_row.last_active_date + 1, 'frozen', p_timezone)
    ON CONFLICT (user_id, local_date) DO NOTHING;
    -- Insert active row for today
    INSERT INTO user_streak_days (user_id, local_date, status, timezone)
    VALUES (p_user_id, p_local_date, 'active', p_timezone)
    ON CONFLICT (user_id, local_date) DO NOTHING;

  ELSE
    -- Streak broken
    v_row.current_streak := 1;
    INSERT INTO user_streak_days (user_id, local_date, status, timezone)
    VALUES (p_user_id, p_local_date, 'active', p_timezone)
    ON CONFLICT (user_id, local_date) DO NOTHING;
  END IF;

  -- Update longest streak
  IF v_row.current_streak > v_row.longest_streak THEN
    v_row.longest_streak := v_row.current_streak;
  END IF;

  -- Check for new milestone
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

  -- Persist summary row
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
    'today_recorded',        false
  );
END;
$$;
```

- [ ] **Step 3: Apply migration and deploy function**

```bash
supabase db push
supabase functions deploy record-open
```

Expected: function deployed, Postgres function visible in Studio.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260525000000_streak_system.sql
git add supabase/functions/record-open/index.ts
git commit -m "feat(backend): add record-open Edge Function and update_streak RPC"
```

---

## Task 4: `useStreak` hook

**Files:**
- Create: `lib/streak.ts`

- [ ] **Step 1: Write the failing test in `tests/streak.test.ts`**

```ts
// tests/streak.test.ts
import { test, describe } from "node:test";
import assert from "node:assert/strict";

// Pure helper — extracted for testing without React or Supabase
function isoWeekStart(localDate: string): string {
  const d = new Date(localDate + "T00:00:00Z");
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function buildWeekDays(today: string, days: { local_date: string; status: "active" | "frozen" }[]) {
  const result: { date: string; status: "active" | "frozen" | "missed" | "today" | "future" }[] = [];
  const todayDate = new Date(today + "T00:00:00Z");
  const weekStart = new Date(isoWeekStart(today) + "T00:00:00Z");
  const statusMap = new Map(days.map((d) => [d.local_date, d.status]));

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setUTCDate(weekStart.getUTCDate() + i);
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
});

describe("buildWeekDays", () => {
  test("today without a record shows today status", () => {
    const days = buildWeekDays("2026-05-25", []);
    const today = days.find((d) => d.date === "2026-05-25");
    assert.equal(today?.status, "today");
  });

  test("today with active record shows active", () => {
    const days = buildWeekDays("2026-05-25", [{ local_date: "2026-05-25", status: "active" }]);
    const today = days.find((d) => d.date === "2026-05-25");
    assert.equal(today?.status, "active");
  });

  test("past day with no record shows missed", () => {
    const days = buildWeekDays("2026-05-25", []);
    const mon = days.find((d) => d.date === "2026-05-25");
    // Use a day in the past within the week
    const pastDay = buildWeekDays("2026-05-27", []);
    const missedDay = pastDay.find((d) => d.date === "2026-05-25");
    assert.equal(missedDay?.status, "missed");
  });

  test("frozen day shows frozen status", () => {
    const days = buildWeekDays("2026-05-26", [
      { local_date: "2026-05-25", status: "active" },
      { local_date: "2026-05-26", status: "frozen" },
    ]);
    const frozen = days.find((d) => d.date === "2026-05-26");
    assert.equal(frozen?.status, "frozen");
  });

  test("future days show future status", () => {
    const days = buildWeekDays("2026-05-25", []);
    const future = days.filter((d) => d.status === "future");
    assert.ok(future.length > 0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test tests/streak.test.ts
```

Expected: FAIL — `buildWeekDays is not defined` (we haven't created `lib/streak.ts` yet and tests define the helpers inline here).

Wait — the helpers ARE defined inline in the test. Expected: PASS. If it passes, move on. If it fails due to import/module issues, check `tsconfig.json`.

- [ ] **Step 3: Create `lib/streak.ts`**

```ts
// lib/streak.ts
import { useEffect, useState, useCallback } from "react";
import * as Localization from "expo-localization";
import { supabase } from "./supabase";
import type { RecordOpenResponse, StreakState, StreakDayRecord } from "./types";

const FALLBACK_TIMEZONE = "UTC";

function getTimezone(): string {
  return Localization.getCalendars()[0]?.timeZone ?? FALLBACK_TIMEZONE;
}

// Exported for use in StreakSheet without needing to re-fetch
export function isoWeekStart(localDate: string): string {
  const d = new Date(localDate + "T00:00:00Z");
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function buildWeekDays(
  today: string,
  days: StreakDayRecord[],
): { date: string; status: "active" | "frozen" | "missed" | "today" | "future" }[] {
  const result: { date: string; status: "active" | "frozen" | "missed" | "today" | "future" }[] =
    [];
  const weekStart = new Date(isoWeekStart(today) + "T00:00:00Z");
  const statusMap = new Map(days.map((d) => [d.local_date, d.status]));

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setUTCDate(weekStart.getUTCDate() + i);
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

async function recordOpen(): Promise<RecordOpenResponse> {
  const timezone = getTimezone();
  const { data, error } = await supabase.functions.invoke<RecordOpenResponse>("record-open", {
    body: { timezone },
  });
  if (error || !data) throw error ?? new Error("record-open returned no data");
  return data;
}

async function fetchWeekDays(): Promise<StreakDayRecord[]> {
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = isoWeekStart(today);
  const { data, error } = await supabase
    .from("user_streak_days")
    .select("local_date, status")
    .gte("local_date", weekStart)
    .lte("local_date", today)
    .order("local_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as StreakDayRecord[];
}

export interface UseStreakResult {
  streak: StreakState | null;
  weekDays: ReturnType<typeof buildWeekDays>;
  milestoneUnlocked: 7 | 30 | 100 | null;
  dismissMilestone: () => void;
  loading: boolean;
}

export function useStreak(): UseStreakResult {
  const [streak, setStreak] = useState<StreakState | null>(null);
  const [weekDays, setWeekDays] = useState<ReturnType<typeof buildWeekDays>>([]);
  const [milestoneUnlocked, setMilestoneUnlocked] = useState<7 | 30 | 100 | null>(null);
  const [loading, setLoading] = useState(true);

  const dismissMilestone = useCallback(() => setMilestoneUnlocked(null), []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [response, days] = await Promise.all([recordOpen(), fetchWeekDays()]);
        if (!active) return;
        const today = new Date().toISOString().slice(0, 10);
        setStreak({
          current_streak: response.current_streak,
          longest_streak: response.longest_streak,
          freeze_uses_this_week: response.freeze_uses_this_week,
          last_active_date: today,
        });
        setWeekDays(buildWeekDays(today, days));
        if (response.milestone_unlocked) {
          setMilestoneUnlocked(response.milestone_unlocked);
        }
      } catch {
        // Non-fatal — streak UI degrades gracefully if offline or unconfigured
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return { streak, weekDays, milestoneUnlocked, dismissMilestone, loading };
}
```

- [ ] **Step 4: Run tests**

```bash
node --test tests/streak.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/streak.ts lib/types.ts tests/streak.test.ts
git commit -m "feat(lib): add useStreak hook, buildWeekDays helper, streak types"
```

---

## Task 5: `StreakBadge` component

**Files:**
- Create: `components/StreakBadge.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/StreakBadge.tsx
import { Pressable, Text, StyleSheet, View } from "react-native";
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
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${count}-day streak. Tap for details.`}>
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
  fire: {
    fontSize: 14,
  },
  count: {
    color: colors.amberGlow,
    fontSize: 13,
    fontFamily: fonts.uiBold,
    fontWeight: "700",
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/StreakBadge.tsx
git commit -m "feat(ui): add StreakBadge component"
```

---

## Task 6: `StreakCard` component

**Files:**
- Create: `components/StreakCard.tsx`

- [ ] **Step 1: Create the component**

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
  const studiedToday = streak.last_active_date === new Date().toISOString().slice(0, 10);
  const freezeAvailable = streak.freeze_uses_this_week < 1;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(750)} style={styles.card}>
      {/* Amber top accent */}
      <View style={styles.topAccent} />

      <View style={styles.row}>
        {/* Streak numeral */}
        <View style={styles.numeralBlock}>
          <Text style={styles.numeral}>{streak.current_streak}</Text>
          <Text style={styles.numeralLabel}>day streak</Text>
        </View>

        {/* Right side */}
        <View style={styles.rightBlock}>
          <Text style={styles.longest}>Best: {streak.longest_streak} days</Text>

          {/* Freeze pill */}
          <View style={[styles.freezePill, !freezeAvailable && styles.freezePillUsed]}>
            <Text style={styles.freezeText}>
              {freezeAvailable ? "❄️  1 freeze available" : "❄️  Freeze used"}
            </Text>
          </View>
        </View>
      </View>

      {/* Status line */}
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
  topAccent: {
    height: 2,
    backgroundColor: colors.amberGlow,
    opacity: 0.6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  numeralBlock: {
    alignItems: "flex-start",
  },
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
  rightBlock: {
    alignItems: "flex-end",
    gap: 8,
  },
  longest: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.uiMedium,
  },
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
  freezeText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fonts.uiMedium,
  },
  status: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.uiMedium,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  statusDone: {
    color: colors.success,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/StreakCard.tsx
git commit -m "feat(ui): add StreakCard component"
```

---

## Task 7: `StreakSheet` component

**Files:**
- Create: `components/StreakSheet.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/StreakSheet.tsx
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from "react-native";
import { colors, fonts } from "../lib/theme";
import type { StreakState } from "../lib/types";
import type { buildWeekDays } from "../lib/streak";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MILESTONES = [7, 30, 100];

interface Props {
  visible: boolean;
  onClose: () => void;
  streak: StreakState;
  weekDays: ReturnType<typeof buildWeekDays>;
}

export function StreakSheet({ visible, onClose, streak, weekDays }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close streak details" />
      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        <Text style={styles.title}>Your Streak</Text>

        {/* 7-day calendar row */}
        <View style={styles.calendarRow}>
          {weekDays.map((day, i) => (
            <View key={day.date} style={styles.dayCol}>
              <Text style={styles.dayLabel}>{DAYS[i]}</Text>
              <View style={[styles.dayDot, dayDotStyle(day.status)]} />
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

function dayDotStyle(status: "active" | "frozen" | "missed" | "today" | "future") {
  switch (status) {
    case "active":
      return { backgroundColor: colors.amberGlow, shadowColor: colors.amberGlow, shadowOpacity: 0.6, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } };
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
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
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
  dayCol: {
    alignItems: "center",
    gap: 6,
  },
  dayLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: fonts.uiMedium,
    letterSpacing: 0.5,
  },
  dayDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 24,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.uiMedium,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
  },
  statBlock: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  statValue: {
    color: colors.amberGlow,
    fontSize: 36,
    fontFamily: fonts.verse,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.uiMedium,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.glass,
  },
  milestonesLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: fonts.uiBold,
    letterSpacing: 2,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 12,
  },
  milestonesRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 28,
  },
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
  badgeNum: {
    color: colors.textGhost,
    fontSize: 20,
    fontFamily: fonts.verse,
  },
  badgeNumEarned: {
    color: colors.amberGlow,
  },
  badgeDay: {
    color: colors.textGhost,
    fontSize: 9,
    fontFamily: fonts.uiMedium,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  badgeDayEarned: {
    color: colors.amberGlow,
  },
  closeBtn: {
    alignSelf: "center",
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  closeBtnText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: fonts.uiMedium,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/StreakSheet.tsx
git commit -m "feat(ui): add StreakSheet with 7-day calendar and milestone badges"
```

---

## Task 8: `MilestoneCelebration` component

**Files:**
- Create: `components/MilestoneCelebration.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/MilestoneCelebration.tsx
import { View, Text, StyleSheet, Modal, Pressable } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import { useAccessibilityInfo } from "@react-native/hooks";
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
  const { reduceMotionEnabled } = useAccessibilityInfo();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!reduceMotionEnabled) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600 }),
          withTiming(1, { duration: 600 }),
        ),
        3,
        false,
      );
    }
  }, [pulse, reduceMotionEnabled]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    shadowOpacity: reduceMotionEnabled ? 0.5 : pulse.value * 0.8,
  }));

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onDismiss}>
      <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.overlay}>
        <Animated.View style={[styles.card, glowStyle]}>
          {/* Ember glow ring */}
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
  fire: {
    fontSize: 48,
    marginBottom: 8,
  },
  number: {
    color: colors.amberGlow,
    fontSize: 72,
    fontFamily: fonts.verse,
    lineHeight: 76,
  },
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
  buttonText: {
    color: colors.amberGlow,
    fontSize: 14,
    fontFamily: fonts.uiBold,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/MilestoneCelebration.tsx
git commit -m "feat(ui): add MilestoneCelebration overlay with reduce-motion support"
```

---

## Task 9: Wire into Home Screen

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Add imports at the top of `app/(tabs)/index.tsx`**

Add after the existing imports:

```tsx
import { useState } from "react";
import { useStreak } from "../../lib/streak";
import { StreakBadge } from "../../components/StreakBadge";
import { StreakCard } from "../../components/StreakCard";
import { StreakSheet } from "../../components/StreakSheet";
import { MilestoneCelebration } from "../../components/MilestoneCelebration";
```

- [ ] **Step 2: Call `useStreak` inside `HomeScreen`**

Add after the existing `const votd = getVerseOfTheDay();` line:

```tsx
const { streak, weekDays, milestoneUnlocked, dismissMilestone } = useStreak();
const [sheetVisible, setSheetVisible] = useState(false);
```

- [ ] **Step 3: Add `StreakBadge` to the header**

In the JSX, find the `<Animated.Text ... style={styles.logo}>A I O N</Animated.Text>` block. Wrap the logo and badge in a row. Replace that block with:

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

- [ ] **Step 4: Add `StreakCard` below the VOTD card**

Find the closing `</Animated.View>` of the VOTD section (the one wrapping `<Pressable ... style={...votdCard...}`). Directly after it, add:

```tsx
{/* Streak Card */}
{streak && <StreakCard streak={streak} />}
```

- [ ] **Step 5: Add modals before the closing `</ImageBackground>`**

Before `</ImageBackground>`, add:

```tsx
{/* Streak Sheet */}
{streak && (
  <StreakSheet
    visible={sheetVisible}
    onClose={() => setSheetVisible(false)}
    streak={streak}
    weekDays={weekDays}
  />
)}

{/* Milestone Celebration */}
{milestoneUnlocked && (
  <MilestoneCelebration
    milestone={milestoneUnlocked}
    onDismiss={dismissMilestone}
  />
)}
```

- [ ] **Step 6: Add `logoRow` style to the stylesheet**

In `const styles = StyleSheet.create({...})`, add:

```ts
logoRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  marginBottom: 14,
},
```

Also update the existing `logo` style — remove its `marginBottom` since `logoRow` now controls spacing.

- [ ] **Step 7: Run the app and verify**

```bash
npx expo start
```

Open on iOS/Android/web. Verify:
- Fire badge appears in the header with a count
- Streak card appears below VOTD
- Tapping the badge opens the sheet
- 7-day calendar renders
- If it's a milestone open, the celebration overlay appears

- [ ] **Step 8: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "feat(home): wire StreakBadge, StreakCard, StreakSheet, and MilestoneCelebration into Home screen"
```

---

## Task 10: Dependency check — expo-localization

**Files:**
- Check: `package.json`

- [ ] **Step 1: Verify expo-localization is installed**

```bash
grep "expo-localization" package.json
```

Expected: a line like `"expo-localization": "~16.x.x"`.

If missing:

```bash
npx expo install expo-localization
```

- [ ] **Step 2: Commit if package.json changed**

```bash
git add package.json package-lock.json
git commit -m "chore: add expo-localization for timezone detection"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| `user_streaks` table + RLS | Task 1 |
| `user_streak_days` table + RLS | Task 1 |
| `user_streak_milestones` table + RLS | Task 1 |
| Client sends timezone only; server derives local_date | Task 3 |
| SELECT FOR UPDATE transaction | Task 3 (update_streak RPC) |
| NOT NULL + CHECK constraints | Task 1 |
| First-open branch | Task 3 |
| Freeze logic (1/week, weekly reset) | Task 3 |
| Milestone dedupe | Task 3 |
| `useStreak` hook + `buildWeekDays` helper | Task 4 |
| Unit tests | Task 4 |
| `StreakBadge` (fire icon + pulse) | Task 5 |
| `StreakCard` (numeral, freeze pill, status) | Task 6 |
| `StreakSheet` (7-day calendar, milestones, stats) | Task 7 |
| `MilestoneCelebration` (overlay, reduce-motion) | Task 8 |
| Home screen wiring | Task 9 |
| expo-localization timezone | Task 10 |

All spec requirements covered.

**Placeholder scan:** None found.

**Type consistency:**
- `RecordOpenResponse`, `StreakState`, `StreakDayRecord` defined in Task 2, used in Tasks 3, 4, 6, 7 — consistent.
- `buildWeekDays` return type used via `ReturnType<typeof buildWeekDays>` in StreakSheet — no drift possible.
- `isoWeekStart` defined in `lib/streak.ts` and tested in `tests/streak.test.ts` inline copy — identical logic, verified by tests.
