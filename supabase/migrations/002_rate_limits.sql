-- ===================
-- RATE LIMITS TABLE
-- ===================
-- IP-based rate limiting — anonymous user_ids can be spoofed, IPs cannot (easily)

CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast IP-based lookups (primary rate limit key)
CREATE INDEX idx_rate_limits_ip_time
  ON rate_limits (ip_address, created_at DESC);

-- Auto-cleanup: delete entries older than 24 hours
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM rate_limits WHERE created_at < now() - interval '24 hours';
END;
$$;

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No client access to rate_limits"
  ON rate_limits FOR ALL
  USING (false);

-- ===================
-- GLOBAL USAGE COUNTER
-- ===================
-- Hard ceiling: max N requests per day across ALL users/IPs (demo bill protection)

CREATE TABLE global_usage (
  date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  request_count INTEGER DEFAULT 0
);

ALTER TABLE global_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No client access to global_usage"
  ON global_usage FOR ALL
  USING (false);

-- ===================
-- RESPONSE CACHE TABLE
-- ===================
-- Exact-match cache: if someone asks the same question twice, serve from DB — zero LLM cost

CREATE TABLE response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT NOT NULL UNIQUE,
  query_text TEXT NOT NULL,
  response_text TEXT NOT NULL,
  verses JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_response_cache_hash ON response_cache (query_hash);

ALTER TABLE response_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No client access to response_cache"
  ON response_cache FOR ALL
  USING (false);

-- ===================
-- CHECK RATE LIMIT FUNCTION
-- ===================
-- Rate limits by IP address (not user_id which can be spoofed)
-- Checks: 5/min per IP, 30/3hrs per IP, 200/day global

CREATE OR REPLACE FUNCTION check_rate_limit(p_ip_address TEXT, p_user_id UUID DEFAULT NULL)
RETURNS TABLE (allowed BOOLEAN, message TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  minute_count INTEGER;
  window_count INTEGER;
  daily_global INTEGER;
BEGIN
  -- Per-IP: requests in last 1 minute (burst protection)
  SELECT count(*) INTO minute_count
  FROM rate_limits
  WHERE ip_address = p_ip_address AND created_at > now() - interval '1 minute';

  IF minute_count >= 5 THEN
    RETURN QUERY SELECT false, 'Too many requests. Please wait a moment.'::text;
    RETURN;
  END IF;

  -- Per-IP: requests in last 3 hours
  SELECT count(*) INTO window_count
  FROM rate_limits
  WHERE ip_address = p_ip_address AND created_at > now() - interval '3 hours';

  IF window_count >= 30 THEN
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
  INSERT INTO rate_limits (ip_address, user_id) VALUES (p_ip_address, p_user_id);
  UPDATE global_usage SET request_count = request_count + 1 WHERE date = CURRENT_DATE;

  RETURN QUERY SELECT true, NULL::text;
END;
$$;
