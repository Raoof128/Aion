-- ===================
-- STORAGE OPTIMIZATION
-- 2026-05-24
-- ===================
-- bible_verses embeddings are consuming ~400-500 MB on free tier (31K rows × vector(1536)).
-- Fix 1: swap HNSW index for IVFFlat — leaner storage, negligible query speed difference at 31K rows.
-- Fix 2: cast embedding column to halfvec — half-precision cuts vector storage ~50% with no data loss.

-- Step 1: Drop the HNSW index
DROP INDEX IF EXISTS idx_bible_verses_embedding;

-- Step 2: Cast column from vector(1536) to halfvec(1536)
ALTER TABLE bible_verses
  ALTER COLUMN embedding TYPE halfvec(1536)
  USING embedding::halfvec(1536);

-- Step 3: Rebuild as IVFFlat using halfvec ops (smaller + faster build than HNSW)
-- Raise maintenance_work_mem for this session to allow index build (free tier default is 32 MB)
SET LOCAL maintenance_work_mem = '64MB';
CREATE INDEX idx_bible_verses_embedding
  ON bible_verses USING ivfflat (embedding halfvec_cosine_ops)
  WITH (lists = 50);

-- Step 4: Update search_verses to use halfvec-compatible operators
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
  hv halfvec(1536);
BEGIN
  -- Cast query embedding to halfvec to match stored column type
  hv := query_embedding::halfvec(1536);

  -- Escape LIKE metacharacters
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
    1 - (bv.embedding <=> hv) AS similarity
  FROM bible_verses bv
  WHERE
    (safe_keyword = '' OR bv.content ILIKE '%' || safe_keyword || '%' ESCAPE '\')
  ORDER BY bv.embedding <=> hv
  LIMIT match_count;
END;
$$;
