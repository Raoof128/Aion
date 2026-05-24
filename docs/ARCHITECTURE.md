# Aion Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React Native)                     │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │  Home    │  │   Chat   │  │  Reader  │  │  Supabase      │  │
│  │  Screen  │  │  Screen  │  │  Screen  │  │  Client (anon) │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────┬────────┘  │
│       │              │             │                 │            │
└───────┼──────────────┼─────────────┼─────────────────┼───────────┘
        │              │             │                 │
        │         SSE Stream         │           PostgREST
        │              │             │              (RLS)
        ▼              ▼             ▼                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                     SUPABASE (Backend)                            │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐  │
│  │  Edge Function   │  │         PostgreSQL + pgvector         │  │
│  │  (chat)          │  │                                      │  │
│  │  - Auth check    │  │  bible_verses    (31K rows + vectors)│  │
│  │  - IP rate limit │  │  conversations   (user sessions)     │  │
│  │  - Keyword regex │  │  messages        (chat history)      │  │
│  │  - OpenAI embed  │  │  user_verse_data (highlights/marks)  │  │
│  │  - Hybrid search │  │  user_notes      (verse annotations) │  │
│  │  - Gemini stream │  │  rate_limits     (IP-based tracking) │  │
│  │  - Persist msgs  │  │  global_usage    (daily cap counter) │  │
│  └──────────────────┘  │  response_cache  (exact-match cache) │  │
│                         └──────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
        │                       │
        ▼                       ▼
┌──────────────┐    ┌──────────────────┐
│  OpenAI API  │    │  Gemini 3.1      │
│  (embeddings │    │  Flash Lite      │
│  + Whisper)  │    │  Preview         │
└──────────────┘    └──────────────────┘
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Mobile App | React Native + Expo | Cross-platform iOS/Android |
| Desktop App | Tauri v2 | Native macOS/Windows/Linux (~5MB) |
| Routing | Expo Router | File-based navigation with tab + stack layout |
| Styling | React Native StyleSheet | Cross-platform styling with centralised theme |
| State | React Query | Server state caching for chat history |
| Backend | Supabase Edge Functions | Serverless RAG pipeline (Deno runtime) |
| Database | PostgreSQL + pgvector | Relational data + vector embeddings |
| Auth | Supabase Anonymous Auth | Zero-friction device-level identity |
| Embeddings | OpenAI text-embedding-3-small | 1536-dimension text vectors (stored as halfvec) |
| Chat LLM | Gemini 3.1 Flash Lite Preview | Fast, cost-effective conversational AI |
| Voice Transcription | OpenAI Whisper | Native iOS/Android voice-to-text |
| Data Source | bible.helloao.org | BSB Bible translation (31,086 verses, all 66 books) |

## Data Flow

### Chat Request Pipeline

```
1. USER SENDS MESSAGE
   │
2. KEYWORD EXTRACTION (regex, no LLM call)
   │  References: /Book \d+:\d+/       → "John 3:16"
   │  Numbers: /\b\d{2,}\b/            → "444"
   │
3. EMBED QUERY (OpenAI API)
   │  text-embedding-3-small → 1536-dim vector
   │
4. CHECK RESPONSE CACHE
   │  SHA-256 hash of normalised query
   │  Cache hit → skip steps 5-6, serve from DB
   │
5. HYBRID SEARCH (pgvector RPC)
   │  Keyword filter: content ILIKE '%keyword%' (wildcards escaped)
   │  Semantic rank: 1 - (embedding <=> query_vector)
   │  Returns top 6 matching verses
   │
6. STREAM GEMINI RESPONSE (SSE)
   │  System prompt + retrieved verses + user question
   │  Chunks streamed back to client in real-time
   │
7. PERSIST & CACHE
   │  Save user msg + assistant response to messages table
   │  Cache response for future exact-match queries
   │
8. FINAL SSE EVENTS
      verses: [{book, chapter, verse, content}, ...]
      conversation: {id: "uuid"}
      done: {}
```

### SSE Event Protocol

| Event | Payload | When |
|-------|---------|------|
| `text` | `{content: "chunk..."}` | Each Gemini response chunk |
| `verses` | `{verses: [...]}` | After streaming completes |
| `conversation` | `{id: "uuid"}` | After persistence |
| `done` | `{}` | Stream complete |
| `error` | `{message: "..."}` | On any pipeline failure |

## Database Schema

### Core Tables

**`bible_verses`** — 31,086 BSB verses with semantic embeddings
- Unique constraint on `(translation_id, book_id, chapter, verse)`
- Embedding stored as `halfvec(1536)` (half-precision — ~50% storage saving vs `vector(1536)`)
- IVFFlat index on `embedding` (lists=50) for cosine similarity search
- RLS: SELECT only for all users

**`conversations`** — Chat sessions tied to anonymous users
- `title` capped at 300 characters
- `updated_at` auto-triggers on row change
- RLS: Full CRUD restricted to `auth.uid() = user_id`
- FK: `user_id → auth.users(id) ON DELETE CASCADE`

**`messages`** — Individual messages with cached verse card data
- `verses` JSONB column stores retrieved verse references for instant card rendering
- FK to conversations with CASCADE delete
- RLS: Read/insert restricted to own conversations

**`user_verse_data`** — Per-verse highlights and bookmarks
- Unique on `(user_id, book_id, chapter, verse)`
- Stores `is_bookmarked` boolean and `highlight_color` text
- `updated_at` auto-triggers on row change
- RLS: Full CRUD restricted to `auth.uid() = user_id`
- FK: `user_id → auth.users(id) ON DELETE CASCADE`

**`user_notes`** — Per-verse text annotations
- Indexed on `(user_id, book_id, chapter, verse)` for fast lookup
- `updated_at` auto-triggers on row change
- RLS: Full CRUD restricted to `auth.uid() = user_id`
- FK: `user_id → auth.users(id) ON DELETE CASCADE`

### Security Tables

**`rate_limits`** — Per-request log keyed on IP address
- Indexed on `(ip_address, created_at DESC)` for fast window queries
- RLS: No client access

**`global_usage`** — Daily request counter across all users
- Hard cap of 200 requests/day (configurable)
- Global row locked with `FOR UPDATE` to prevent TOCTOU race
- RLS: No client access

**`response_cache`** — Exact-match query cache
- SHA-256 hash index for O(1) lookups
- Eliminates LLM costs for repeated queries
- RLS: No client access

### Key Function

**`search_verses(query_embedding, search_keyword, match_count)`**
- Hybrid search combining keyword ILIKE filter (with `%` and `_` escaped) with vector cosine distance
- Returns verses ranked by semantic similarity, optionally filtered by keyword
- Called via Supabase RPC from the Edge Function

## Security Architecture

```
REQUEST FLOW:

  Client ─── JWT ──► Auth Check ──► IP Rate Limit ──► Message Validation
                        │               │                    │
                      401 if          429 if               400 if
                      invalid       rate exceeded       too long (>500)
                                                            │
                                                     ┌──────┴──────┐
                                                     │ Dev Bypass? │
                                                     │ x-dev-bypass│
                                                     │ header      │
                                                     └──────┬──────┘
                                                            │
                                                   RAG Pipeline
```

**Defence in Depth:**
1. JWT validation (Supabase auth)
2. IP-based rate limiting (database-persisted, survives cold starts)
3. Global daily cap (hard ceiling on total API spend)
4. Message length validation (500 char cap)
5. IDOR protection (conversation ownership verified before writes)
6. SQL injection protection (LIKE wildcards escaped in keyword search)
7. Response caching (reduces API call surface)
8. RLS on all tables (data isolation)
9. Server-side API keys (never exposed to client)
10. Fail-closed design (errors default to deny)

## Frontend Navigation

Aion uses Expo Router with a two-level navigation structure:

```
RootLayout (_layout.tsx)
└── QueryClientProvider
    └── GestureHandlerRootView
        └── (tabs) — Bottom tab bar
            ├── Home (index.tsx)
            │   ├── VOTD Card (tappable → reader)
            │   ├── PromptPill × N
            │   └── ChatInput
            ├── Read (read.tsx) — Bible browser
            │   ├── OT / NT tab switcher
            │   └── Book grid → reader/[bookId]/index.tsx
            ├── Chat (chat.tsx) — New conversation entry
            │   └── ChatInput → chat/[id].tsx
            └── More (more.tsx) — History list
                └── Conversation row → chat/[id].tsx

Stack screens (separate from tabs):
├── chat/[id].tsx — Active chat
│   ├── MessageList (FlatList)
│   │   └── ChatBubble
│   │       ├── User bubble (text only)
│   │       └── Assistant bubble
│   │           ├── Streaming text (react-native-markdown-display)
│   │           └── VerseCard × N
│   └── ChatInput (text + voice)
└── reader/ — Bible reader stack
    └── [bookId]/
        ├── index.tsx — Chapter list
        └── [chapter].tsx — Chapter reader
            ├── BookBackground (per-book art + gradient)
            ├── Verse list (Pressable rows)
            ├── Selected verse actions toolbar
            └── BookArtTuner (long-press title, dev only)
```

## Component Inventory

| Component | Purpose |
|-----------|---------|
| `BookArtTuner` | Dev tool — drag-to-position background image tuner (long-press book title) |
| `BookBackground` | Renders per-book background PNG with transform, overlay, and LinearGradient |
| `ChatBubble` | Message bubble for user and assistant turns; handles streaming text + verse cards |
| `ChatInput` | Text field with character counter, voice-to-text toggle, and send button |
| `HistoryDrawer` | Legacy conversation history sidebar (superseded by More tab) |
| `Onboarding` | First-launch welcome screen |
| `PromptPill` | Tappable suggestion chip that pre-fills ChatInput |
| `SettingsSheet` | Bottom sheet with font size and theme selectors |
| `VerseCard` | Displays a single verse with book/chapter/verse attribution and copy button |

## Lib Inventory

| Module | Purpose |
|--------|---------|
| `bible-data.ts` | Static OT/NT book list with chapter counts; VOTD rotation by day-of-year |
| `bookBackgroundSettings.ts` | AsyncStorage load/save/reset for per-book background position, scale, and overlay |
| `chat.ts` | SSE streaming hook; Supabase conversation/message API calls |
| `notifications.ts` | Daily verse push notification scheduling and storage toggle |
| `settings.tsx` | App-wide settings context (font size scale, theme selection) |
| `supabase.ts` | Supabase anon client; `isSupabaseConfigured` helper for dev warning banner |
| `theme.ts` | Centralised design tokens — colours, font families, sizes, spacing |
| `tts.ts` | Text-to-speech: Web Speech API on web, `expo-speech` on native |
| `types.ts` | Shared TypeScript interfaces (Message, Verse, Conversation, etc.) |
| `utils.ts` | `timeAgo()` — relative time formatting for history timestamps |

## Future Scaling Path

- **Multi-translation support:** Add KJV, ESV, etc. by re-running ingestion with a new `translation_id`
- **Real accounts:** Upgrade anonymous auth to Google/Apple sign-in for cross-device sync
- **Daily devotionals:** Passive content tab with scheduled verse reflections
- **Verse bookmarking UI:** Surface `user_verse_data` highlights in the reader (schema exists)
- **Notes UI:** Surface `user_notes` annotations in the reader (schema exists)
- **App Attestation:** Apple App Attest + Google Play Integrity to block script-based abuse
- **Edge caching:** CDN-level caching for the response cache layer
- **Reduce embedding dimensions:** Migrate to 512-dim embeddings to further cut storage (requires re-ingestion)
- **BookArtTuner production gate:** Add a `__DEV__` guard before shipping to app stores
