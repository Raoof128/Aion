# Aion MVP Design Spec

**Date:** 2026-04-02
**Status:** Approved

## Overview

Aion is an AI-powered Bible companion app using Agentic Hybrid RAG (Retrieval-Augmented Generation). Users interact through a Perplexity-style chat interface with dynamic prompt suggestions and rich verse cards. All AI responses are grounded in actual Bible data retrieved via combined keyword and semantic search.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Native + Expo + Expo Router + NativeWind |
| Backend | Supabase (PostgreSQL + pgvector + Edge Functions) |
| Auth | Supabase Anonymous Auth |
| Embedding Model | OpenAI `text-embedding-3-small` (1536 dimensions) |
| Chat LLM | Gemini 3 Flash |
| Data Source | bible.helloao.org API (BSB translation for MVP) |
| Client Caching | @tanstack/react-query |

## Database Schema

### Extensions

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Table: `bible_verses`

| Column | Type | Constraints |
|--------|------|-------------|
| id | serial | PRIMARY KEY |
| translation_id | text | NOT NULL |
| book_id | text | NOT NULL |
| book_name | text | NOT NULL |
| chapter | integer | NOT NULL |
| verse | integer | NOT NULL |
| content | text | NOT NULL |
| embedding | vector(1536) | |

- Unique constraint: `UNIQUE(translation_id, book_id, chapter, verse)`
- HNSW index: `USING hnsw (embedding vector_cosine_ops)`
- RLS: `SELECT` for all (anon + authenticated). No INSERT/UPDATE/DELETE from client.

### Table: `conversations`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY, default `gen_random_uuid()` |
| user_id | uuid | NOT NULL (from Supabase anonymous auth) |
| title | text | Auto-generated from first message |
| created_at | timestamptz | Default `now()` |
| updated_at | timestamptz | Default `now()` |

- RLS: Users can only CRUD rows where `auth.uid() = user_id`.

### Table: `messages`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY, default `gen_random_uuid()` |
| conversation_id | uuid | NOT NULL, FK -> conversations.id |
| role | text | NOT NULL (`'user'` or `'assistant'`) |
| content | text | NOT NULL |
| verses | jsonb | Array of retrieved verse references for card rendering |
| created_at | timestamptz | Default `now()` |

- RLS: Users can only read/insert messages in their own conversations.

### Hybrid Search Function

```sql
CREATE OR REPLACE FUNCTION search_verses(
  query_embedding vector(1536),
  search_keyword text,
  match_count int
)
RETURNS TABLE (
  id integer,
  book_id text,
  book_name text,
  chapter integer,
  verse integer,
  content text,
  similarity float
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
```

## Backend: Supabase Edge Functions

### `chat` Edge Function

Single Edge Function handling the full RAG pipeline. Called by the React Native app when a user sends a message.

**Request:** `POST /functions/v1/chat`
- Headers: `Authorization: Bearer <supabase_anon_jwt>`
- Body: `{ "message": string, "conversation_id": string | null }`
- Response: Server-Sent Events (SSE) stream

**Pipeline:**
1. **Validate** — Check anonymous JWT, enforce rate limits (5/min burst, 50/3hrs hard cap)
2. **Extract keywords** — Regex patterns for numbers, book references (`John 3:16`), proper nouns. No LLM call needed.
3. **Embed** — Send user message to OpenAI `text-embedding-3-small`, get 1536-dim vector
4. **Hybrid search** — Call `search_verses` RPC with embedding + extracted keyword. Returns top 5-8 matching verses.
5. **Build prompt** — System prompt establishes Aion's persona. User message + retrieved verses injected as grounding context.
6. **Stream Gemini 3 Flash** — Send prompt, stream response back to client via SSE chunk-by-chunk
7. **Persist** — After stream completes, save user message + full assistant response (with `verses` JSONB) to `messages` table. Create `conversations` row if new.
8. **Final SSE event** — Send `verses` JSONB array so client can render VerseCards

**System Prompt Template:**
```
You are Aion, a wise and warm Bible companion.
Answer using ONLY the provided verses. Cite each verse you reference.
If the verses don't answer the question, say so honestly.

[Retrieved Verses]
Genesis 1:1 - "In the beginning God created the heavens and the earth."
...

[User Question]
"What does the Bible say about new beginnings?"
```

**Rate Limiting:**
- Token bucket: 5 requests per minute (burst protection)
- Hard cap: 50 requests per 3 hours (anonymous users)
- Exceeded cap: Return 429 with prompt to create a real account for higher limits

### No Edge Function for CRUD

Conversation listing, message reading, and conversation deletion are handled directly by the React Native client via Supabase PostgREST. RLS policies enforce `auth.uid() = user_id` so no server-side logic is needed.

## Frontend: React Native App

### Screens (3)

**1. Home / New Chat**
- Aion branding at top
- 4 rotating prompt pills above the chat input bar
  - Examples: "Find verses with the number 444", "What is a stoic perspective on Ecclesiastes?", "I'm feeling completely burnt out today"
- Tapping a pill or typing starts a new conversation -> navigates to Chat
- Hamburger/drawer menu opens History

**2. Chat**
- Scrollable message stream (FlatList, auto-scroll to bottom)
- User messages: simple text bubbles
- Assistant messages: streaming text rendered in real-time, followed by VerseCards that pop in when the final SSE event arrives
- Input bar pinned to bottom with send button

**3. History (Drawer)**
- List of past conversations, sorted by most recent
- Each row: conversation title + relative timestamp
- Swipe to delete (Supabase client call, RLS-protected)
- Tap to load conversation messages
- Cached with React Query for zero-latency drawer opens

### Navigation

Expo Router with file-based routing:
- `app/index.tsx` — Home screen
- `app/chat/[id].tsx` — Chat screen (dynamic route)
- Drawer layout for history sidebar

### Key Components

- **`VerseCard`** — Styled card showing `Book Chapter:Verse` header, verse content body, copy/share button. Built with NativeWind.
- **`PromptPill`** — Tappable suggestion chip with subtle animation
- **`ChatBubble`** — User and assistant message wrappers
- **`MessageList`** — FlatList of messages with auto-scroll

### Data Flow

1. User sends message -> optimistically render user bubble
2. Call `chat` Edge Function -> show streaming text as chunks arrive
3. Final SSE event -> render VerseCards from `verses` JSONB
4. Conversation auto-saved server-side by Edge Function

## Data Ingestion Pipeline

One-time local Node.js script (`scripts/ingest.ts`). Not part of the app.

**Steps:**
1. **Fetch** — `GET https://bible.helloao.org/api/BSB/complete.json`
2. **Parse & Flatten** — Walk chapter content arrays. For each verse, join the `content` array into plain text, stripping footnote objects (`{noteId: N}`).
3. **Batch embed** — Send to OpenAI in batches of ~100 verses. ~311 batches for 31,086 verses.
4. **Upsert to Supabase** — Insert rows with unique constraint for idempotent re-runs.
5. **Progress logging** — Log per-book progress.

**Cost:** ~$0.02 (775K tokens at $0.02/1M tokens)
**Runtime:** ~15-20 minutes

Re-runnable for future translations by changing the translation ID parameter.

## Security

- **API keys server-side only:** `OPENAI_API_KEY`, `GEMINI_API_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` stored as Edge Function environment variables. Never exposed to client.
- **Client key:** React Native app only has `SUPABASE_ANON_KEY` (public, safe to expose).
- **`.env` gitignored:** Ingestion script keys stored in `.env`, excluded from version control.
- **RLS enforced:** All tables protected. Users can only access their own data.
- **Rate limiting:** Token bucket + hard cap prevents LLM spend abuse.

## Future Scaling Path

- Add translations (KJV, etc.) by re-running ingestion with new `translation_id`
- Add Google sign-in for cross-device sync (upgrade from anonymous auth)
- Add daily devotional screen (passive content tab)
- Add verse bookmarking/favoriting
- Increase rate limits for authenticated users
