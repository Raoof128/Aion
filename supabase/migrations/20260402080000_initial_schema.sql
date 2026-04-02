-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ===================
-- BIBLE VERSES TABLE
-- ===================
CREATE TABLE bible_verses (
  id SERIAL PRIMARY KEY,
  translation_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  book_name TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536)
);

-- Prevent duplicate verse ingestion
CREATE UNIQUE INDEX idx_bible_verses_unique
  ON bible_verses (translation_id, book_id, chapter, verse);

-- HNSW index for fast vector similarity search
CREATE INDEX idx_bible_verses_embedding
  ON bible_verses USING hnsw (embedding vector_cosine_ops);

-- RLS: read-only for everyone
ALTER TABLE bible_verses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bible verses are publicly readable"
  ON bible_verses FOR SELECT
  USING (true);

-- ===================
-- CONVERSATIONS TABLE
-- ===================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
  ON conversations FOR DELETE
  USING (auth.uid() = user_id);

-- ===================
-- MESSAGES TABLE
-- ===================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  verses JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND c.user_id = auth.uid()
    )
  );

-- Index for fast message lookups by conversation
CREATE INDEX idx_messages_conversation
  ON messages (conversation_id, created_at);

-- Index for fast conversation listing
CREATE INDEX idx_conversations_user
  ON conversations (user_id, updated_at DESC);

-- ===================
-- HYBRID SEARCH FUNCTION
-- ===================
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
BEGIN
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
    (search_keyword = '' OR bv.content ILIKE '%' || search_keyword || '%')
  ORDER BY bv.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
