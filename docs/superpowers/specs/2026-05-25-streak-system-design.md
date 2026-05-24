# Streak System Design

**Date:** 2026-05-25
**Status:** Approved
**Scope:** Daily study streak tracking — counter, freeze, milestones, UI

---

## Overview

Users earn a streak for every day they open Aion. The streak is Supabase-backed (tied to the anonymous user UUID), supports one freeze per week, and celebrates milestones at 7, 30, and 100 days. Push notification support is scoped to a future phase.

---

## Database Schema

All `user_id` foreign keys use `ON DELETE CASCADE`.

### `user_streaks`

One row per user. Stores the current summary state.

```sql
CREATE TABLE user_streaks (
  user_id               uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_active_date      date,
  current_streak        int  DEFAULT 0,
  longest_streak        int  DEFAULT 0,
  freeze_uses_this_week int  DEFAULT 0,
  freeze_week_start     date,
  timezone              text DEFAULT 'UTC',
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own streak" ON user_streaks
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### `user_streak_days`

One row per user per active/frozen day. Drives the 7-day calendar in the UI. Missed days are derived from gaps — not stored.

```sql
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
CREATE POLICY "users manage own streak days" ON user_streak_days
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### `user_streak_milestones`

Deduplication guard — prevents milestone modal/notification firing more than once per milestone.

```sql
CREATE TABLE user_streak_milestones (
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone  int NOT NULL CHECK (milestone IN (7, 30, 100)),
  sent_at    timestamptz DEFAULT now(),
  PRIMARY KEY(user_id, milestone)
);

ALTER TABLE user_streak_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own milestones" ON user_streak_milestones
  USING (auth.uid() = user_id);
```

---

## Edge Function: `record-open`

Called once on every app open. Client sends local context; server owns all logic.

### Request

```ts
POST /functions/v1/record-open
Authorization: Bearer <anon-jwt>

{
  local_date: string; // "YYYY-MM-DD" — user's local date
  timezone: string;   // e.g. "Australia/Sydney"
}
```

### Logic

1. Fetch the user's `user_streaks` row (or initialise defaults if first open).
2. If `last_active_date == local_date` → return early (`today_recorded: true`, no changes).
3. Calculate `gap` = days between `last_active_date` and `local_date`.
4. Reset freeze count if `local_date` is in a new ISO week vs `freeze_week_start`.
5. Apply streak logic:
   - `gap == 1` → increment `current_streak`, insert `active` row for `local_date`.
   - `gap == 2` AND `freeze_uses_this_week < 1` → use freeze:
     - Insert `frozen` row for the missed date (`local_date - 1 day`).
     - Insert `active` row for `local_date`.
     - Increment `current_streak`, increment `freeze_uses_this_week`.
     - Set `freeze_week_start` if not already set for this week.
   - `gap > 2` OR (`gap == 2` AND no freeze left) → reset `current_streak` to 1, insert `active` row for `local_date`.
6. Update `longest_streak` if `current_streak > longest_streak`.
7. Update `last_active_date`, `updated_at`.
8. Check if `current_streak` is 7, 30, or 100 and no row exists in `user_streak_milestones` → insert milestone row, set `milestone_unlocked` in response.

**Freeze day example:**
```
Saturday → active
Sunday   → missed, freeze applied → frozen
Monday   → active
```

### Response

```ts
{
  current_streak:        number;
  longest_streak:        number;
  freeze_uses_this_week: number;
  milestone_unlocked?:   7 | 30 | 100;  // present only when newly unlocked
  today_recorded:        boolean;
}
```

The frontend drives all UI decisions (streak card update, milestone modal) from this response. Client never writes streak data directly.

---

## UI Components

### Aesthetic Direction

Deep ember/amber flame. Dark backgrounds with warm gold glow accents. Spiritual weight, not gamified urgency. Typography uses `DM Serif Display` for numerals, system sans for labels.

### `StreakBadge`

- Location: top-right of Home screen header
- Shows: `🔥 N` where N is `current_streak`
- Style: amber glow (`shadowColor: #F59E0B`), pulses once on mount if streak > 0
- Tap: opens `StreakSheet`

### `StreakCard`

- Location: Home screen, between VOTD and prompt pills
- Shows:
  - Large streak numeral in `DM Serif Display`
  - "N-day streak" label
  - Longest streak secondary line
  - Freeze pill: `❄️ 1 freeze available` or `❄️ Used` (greyed)
  - Status line: "Studied today ✓" or "Open daily to keep your streak"
- Style: dark card, amber top-border accent, subtle grain texture

### `StreakSheet`

- Trigger: tap `StreakBadge`
- Shows:
  - 7-day calendar row: amber circle (active), ice-blue circle (frozen), dark circle (missed), outlined circle (today)
  - Milestone badges: grey/locked until earned, glowing amber when unlocked (7d, 30d, 100d)
  - Stats: current streak + longest streak

### `MilestoneCelebration`

- Trigger: `milestone_unlocked` present in `record-open` response
- Shows: full-screen overlay, large milestone number, short spiritual message, dismiss button
- Animation: amber particle burst via `react-native-reanimated`
- Accessibility: if `reduceMotionEnabled` is true, show static amber glow instead of particle burst

---

## Milestone Logic

| Milestone | Trigger | In-app | Push (phase 2) |
|-----------|---------|--------|----------------|
| 7 days    | `current_streak == 7` | `MilestoneCelebration` modal | see below |
| 30 days   | `current_streak == 30` | `MilestoneCelebration` modal | see below |
| 100 days  | `current_streak == 100` | `MilestoneCelebration` modal | see below |

`user_streak_milestones` ensures each milestone fires exactly once per user.

---

## Push Notifications (Phase 2)

Push notifications at milestones are deferred. Implementation requires:

- Push permission request flow
- Device push token storage table
- Notification provider integration (e.g. Expo Notifications + APNs/FCM)
- Duplicate prevention via `user_streak_milestones` (already designed)

The schema is ready. No additional changes required when phase 2 is built.

---

## Anonymous Session Caveat

Streaks are tied to the Supabase anonymous user UUID. If the session is lost (e.g. app data cleared, device change without session recovery), the streak resets. This is acceptable for the current anonymous-auth model. Account linking or session recovery would mitigate this in a future auth upgrade.

---

## Out of Scope

- Leaderboards or social streak sharing
- Streak freeze purchase/earn mechanics
- Reading-plan-based streak tracking (separate system)
- Per-book or per-chapter streak variants
