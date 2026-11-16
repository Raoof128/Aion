-- Rate limiting for the `transcribe` Edge Function (Whisper proxy for native voice input).
--
-- Kept separate from check_rate_limit so voice notes do not spend a user's chat quota,
-- and so transcription has its own global daily ceiling on OpenAI spend. Anonymous
-- sign-in means any client can mint a JWT, so authentication alone is not an abuse
-- control. Three layers bound spend:
--   * per user (the JWT subject, which cannot be forged; Supabase Auth separately
--     rate-limits anonymous sign-ups per IP, so minting many users is throttled),
--   * per IP (best effort: x-forwarded-for is client-influenced),
--   * a global daily ceiling that holds regardless of either.
-- The Edge Function calls this only after the upload has passed validation, so
-- malformed requests cannot spend quota.

CREATE TABLE transcribe_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_transcribe_rate_limits_ip_time
  ON transcribe_rate_limits (ip_address, created_at DESC);

CREATE INDEX idx_transcribe_rate_limits_user_time
  ON transcribe_rate_limits (user_id, created_at DESC);

ALTER TABLE transcribe_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No client access to transcribe_rate_limits"
  ON transcribe_rate_limits FOR ALL
  USING (false);

CREATE TABLE transcribe_global_usage (
  date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  request_count INTEGER DEFAULT 0
);

ALTER TABLE transcribe_global_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No client access to transcribe_global_usage"
  ON transcribe_global_usage FOR ALL
  USING (false);

-- Limits: per user and per IP, 5/min and 20 per 3 hours; 100/day global.
-- The global row is locked FOR UPDATE so concurrent calls cannot both pass the cap.
CREATE OR REPLACE FUNCTION check_transcribe_rate_limit(p_ip_address TEXT, p_user_id UUID DEFAULT NULL)
RETURNS TABLE (allowed BOOLEAN, message TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  minute_count INTEGER;
  window_count INTEGER;
  daily_global INTEGER;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Unauthorized.'::text;
    RETURN;
  END IF;

  -- Per user (unforgeable JWT subject)
  SELECT count(*) INTO minute_count
  FROM transcribe_rate_limits
  WHERE user_id = p_user_id AND created_at > now() - interval '1 minute';

  IF minute_count >= 5 THEN
    RETURN QUERY SELECT false, 'Too many voice requests. Please wait a moment.'::text;
    RETURN;
  END IF;

  SELECT count(*) INTO window_count
  FROM transcribe_rate_limits
  WHERE user_id = p_user_id AND created_at > now() - interval '3 hours';

  IF window_count >= 20 THEN
    RETURN QUERY SELECT false, 'Voice input limit reached. Please type your question or try later.'::text;
    RETURN;
  END IF;

  -- Per IP (best effort)
  SELECT count(*) INTO minute_count
  FROM transcribe_rate_limits
  WHERE ip_address = p_ip_address AND created_at > now() - interval '1 minute';

  IF minute_count >= 5 THEN
    RETURN QUERY SELECT false, 'Too many voice requests. Please wait a moment.'::text;
    RETURN;
  END IF;

  SELECT count(*) INTO window_count
  FROM transcribe_rate_limits
  WHERE ip_address = p_ip_address AND created_at > now() - interval '3 hours';

  IF window_count >= 20 THEN
    RETURN QUERY SELECT false, 'Voice input limit reached. Please type your question or try later.'::text;
    RETURN;
  END IF;

  INSERT INTO transcribe_global_usage (date, request_count)
  VALUES (CURRENT_DATE, 0)
  ON CONFLICT (date) DO NOTHING;

  SELECT request_count INTO daily_global
  FROM transcribe_global_usage
  WHERE date = CURRENT_DATE
  FOR UPDATE;

  IF daily_global >= 100 THEN
    RETURN QUERY SELECT false, 'Voice input has reached its daily limit. Please type your question.'::text;
    RETURN;
  END IF;

  INSERT INTO transcribe_rate_limits (ip_address, user_id) VALUES (p_ip_address, p_user_id);
  UPDATE transcribe_global_usage SET request_count = request_count + 1 WHERE date = CURRENT_DATE;

  RETURN QUERY SELECT true, NULL::text;
END;
$$;

-- Only the Edge Function (service role) may call the limiter.
REVOKE EXECUTE ON FUNCTION check_transcribe_rate_limit(TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION check_transcribe_rate_limit(TEXT, UUID) TO service_role;

CREATE OR REPLACE FUNCTION cleanup_transcribe_rate_limits()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM transcribe_rate_limits WHERE created_at < now() - interval '24 hours';
END;
$$;

REVOKE EXECUTE ON FUNCTION cleanup_transcribe_rate_limits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_transcribe_rate_limits() TO service_role;
