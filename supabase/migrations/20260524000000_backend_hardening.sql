-- ===================
-- BACKEND HARDENING
-- 2026-05-24
-- ===================

-- 1. Fix LIKE wildcard injection in search_verses
--    Escape % and _ in keyword before ILIKE to prevent accidental full-table scans
--    and query manipulation via user-supplied wildcards.
CREATE OR REPLACE FUNCTION search_verses(
  query_embedding vector(1536),
  search_keyword TEXT,
  match_count INT
)
RETURNS TABLE (
  id INTEGER,
  book_id TEXT,
  book_name TEXT,
  chapter INTEGER,
  verse INTEGER,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  safe_keyword TEXT;
BEGIN
  -- Escape LIKE metacharacters so user input is treated as a literal string
  safe_keyword := replace(replace(search_keyword, '\', '\\'), '%', '\%');
  safe_keyword := replace(safe_keyword, '_', '\_');

  RETURN QUERY
  SELECT
    bv.id,
    bv.book_id,
    bv.book_name,
    bv.chapter,
    bv.verse,
    bv.content,
    1 - (bv.embedding <=> query_embedding) AS similarity
  FROM bible_verses bv
  WHERE
    (safe_keyword = '' OR bv.content ILIKE '%' || safe_keyword || '%' ESCAPE '\')
  ORDER BY bv.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 2. Fix TOCTOU race in check_rate_limit global daily cap
--    Use FOR UPDATE to lock the global_usage row so concurrent requests
--    cannot both read count=199 and both pass the cap check.
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
  -- Upsert first to ensure the row exists, then lock it for the read+increment.
  INSERT INTO global_usage (date, request_count)
  VALUES (CURRENT_DATE, 0)
  ON CONFLICT (date) DO NOTHING;

  SELECT request_count INTO daily_global
  FROM global_usage
  WHERE date = CURRENT_DATE
  FOR UPDATE;

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

-- 3. Add updated_at auto-trigger to keep sort order accurate on rename/update.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_user_verse_data_updated_at
  BEFORE UPDATE ON user_verse_data
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_user_notes_updated_at
  BEFORE UPDATE ON user_notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Add FK constraints — user_id references auth.users with cascade delete.
--    Orphaned rows from deleted anonymous sessions are cleaned up automatically.
ALTER TABLE conversations
  ADD CONSTRAINT fk_conversations_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE user_verse_data
  ADD CONSTRAINT fk_user_verse_data_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE user_notes
  ADD CONSTRAINT fk_user_notes_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. Constrain conversation title length to prevent unbounded storage.
ALTER TABLE conversations
  ADD CONSTRAINT chk_conversations_title_length
  CHECK (title IS NULL OR char_length(title) <= 300);
