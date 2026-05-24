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
      'today_recorded',        false,
      'rejected_stale_date',   true
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

  -- Reset freeze count on new ISO week. Intentional: the freeze budget is per-week,
  -- not keyed to the missed day's week. A gap that straddles two weeks correctly
  -- gets the new week's freeze allowance applied.
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
