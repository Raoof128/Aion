-- ===================
-- USER VERSE DATA (Highlights & Bookmarks)
-- ===================
CREATE TABLE user_verse_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  book_id TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  is_bookmarked BOOLEAN DEFAULT false,
  highlight_color TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, book_id, chapter, verse)
);

ALTER TABLE user_verse_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own verse data"
  ON user_verse_data FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_user_verse_data_user
  ON user_verse_data (user_id, book_id, chapter);

-- ===================
-- USER NOTES (separate for large text payloads)
-- ===================
CREATE TABLE user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  book_id TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  note_content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own notes"
  ON user_notes FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_user_notes_user
  ON user_notes (user_id, book_id, chapter, verse);
