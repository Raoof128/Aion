-- ===================
-- RATE LIMITS TABLE
-- ===================
-- Persisted rate limiting that survives Edge Function cold starts

CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by user + time window
CREATE INDEX idx_rate_limits_user_time
  ON rate_limits (user_id, created_at DESC);

-- Auto-cleanup: delete entries older than 24 hours
-- Run this as a Supabase cron job or pg_cron
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM rate_limits WHERE created_at < now() - interval '24 hours';
END;
$$;

-- RLS: Edge Function uses service_role key so RLS doesn't apply,
-- but lock it down anyway for defense-in-depth
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- No client access at all
CREATE POLICY "No client access to rate_limits"
  ON rate_limits FOR ALL
  USING (false);

-- ===================
-- GLOBAL USAGE COUNTER
-- ===================
-- Hard ceiling: max N requests per day across ALL users (demo protection)

CREATE TABLE global_usage (
  date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  request_count INTEGER DEFAULT 0
);

ALTER TABLE global_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No client access to global_usage"
  ON global_usage FOR ALL
  USING (false);

-- ===================
-- CHECK RATE LIMIT FUNCTION
-- ===================
-- Returns: allowed (boolean), message (text if denied)
-- Checks: 5/min per user, 50/3hrs per user, 200/day global

CREATE OR REPLACE FUNCTION check_rate_limit(p_user_id UUID)
RETURNS TABLE (allowed BOOLEAN, message TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  minute_count INTEGER;
  window_count INTEGER;
  daily_global INTEGER;
BEGIN
  -- Per-user: requests in last 1 minute
  SELECT count(*) INTO minute_count
  FROM rate_limits
  WHERE user_id = p_user_id AND created_at > now() - interval '1 minute';

  IF minute_count >= 5 THEN
    RETURN QUERY SELECT false, 'Too many requests. Please wait a moment.'::text;
    RETURN;
  END IF;

  -- Per-user: requests in last 3 hours
  SELECT count(*) INTO window_count
  FROM rate_limits
  WHERE user_id = p_user_id AND created_at > now() - interval '3 hours';

  IF window_count >= 50 THEN
    RETURN QUERY SELECT false, 'You''ve reached the limit. Please try again later.'::text;
    RETURN;
  END IF;

  -- Global: total requests today (hard demo cap)
  INSERT INTO global_usage (date, request_count)
  VALUES (CURRENT_DATE, 0)
  ON CONFLICT (date) DO NOTHING;

  SELECT request_count INTO daily_global
  FROM global_usage
  WHERE date = CURRENT_DATE;

  IF daily_global >= 200 THEN
    RETURN QUERY SELECT false, 'Aion has reached its daily limit. Please come back tomorrow!'::text;
    RETURN;
  END IF;

  -- All checks passed: record this request
  INSERT INTO rate_limits (user_id) VALUES (p_user_id);
  UPDATE global_usage SET request_count = request_count + 1 WHERE date = CURRENT_DATE;

  RETURN QUERY SELECT true, NULL::text;
END;
$$;
