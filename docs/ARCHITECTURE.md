# Aion Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React Native)                     │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │  Home    │  │   Chat   │  │ History  │  │  Supabase      │  │
│  │  Screen  │  │  Screen  │  │ Drawer   │  │  Client (anon) │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────┬────────┘  │
│       │              │             │                 │            │
└───────┼──────────────┼─────────────┼─────────────────┼───────────┘
        │              │             │                 │
        │         SSE Stream    PostgREST          PostgREST
        │              │         (RLS)              (RLS)
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
│  │  - OpenAI embed  │  │  rate_limits     (IP-based tracking) │  │
│  │  - Hybrid search │  │  global_usage    (daily cap counter) │  │
│  │  - Gemini stream │  │  response_cache  (exact-match cache) │  │
│  │  - Persist msgs  │  │                                      │  │
│  └──────────────────┘  └──────────────────────────────────────┘  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
        │                       │
        ▼                       ▼
┌──────────────┐    ┌──────────────────┐
│  OpenAI API  │    │  Gemini 3 Flash  │
│  (embeddings)│    │  (chat streaming)│
└──────────────┘    └──────────────────┘
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Mobile App | React Native + Expo | Cross-platform iOS/Android |
| Routing | Expo Router | File-based navigation with deep linking |
| Styling | NativeWind (Tailwind) | Utility-first styling with full design control |
| State | React Query | Server state caching for history drawer |
| Backend | Supabase Edge Functions | Serverless RAG pipeline (Deno runtime) |
| Database | PostgreSQL + pgvector | Relational data + vector embeddings |
| Auth | Supabase Anonymous Auth | Zero-friction device-level identity |
| Embeddings | OpenAI text-embedding-3-small | 1536-dimension text vectors |
| Chat LLM | Gemini 3 Flash | Fast, cost-effective conversational AI |
| Data Source | bible.helloao.org | BSB Bible translation (23,583 verses) |

## Data Flow

### Chat Request Pipeline

```
1. USER SENDS MESSAGE
   │
2. KEYWORD EXTRACTION (regex, no LLM call)
   │  Numbers: /\b\d{2,}\b/           → "444"
   │  References: /Book \d+:\d+/       → "John 3:16"
   │
3. EMBED QUERY (OpenAI API)
   │  text-embedding-3-small → 1536-dim vector
   │
4. CHECK RESPONSE CACHE
   │  SHA-256 hash of normalized query
   │  Cache hit → skip steps 5-6, serve from DB
   │
5. HYBRID SEARCH (pgvector RPC)
   │  Keyword filter: content ILIKE '%keyword%'
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

**`bible_verses`** — 23,583 BSB verses with semantic embeddings
- Unique constraint on `(translation_id, book_id, chapter, verse)`
- HNSW index on `embedding` for fast cosine similarity search
- RLS: SELECT only for all users

**`conversations`** — Chat sessions tied to anonymous users
- RLS: Full CRUD restricted to `auth.uid() = user_id`

**`messages`** — Individual messages with cached verse card data
- `verses` JSONB column stores retrieved verse references for instant card rendering
- FK to conversations with CASCADE delete
- RLS: Read/insert restricted to own conversations

### Security Tables

**`rate_limits`** — Per-request log keyed on IP address
- Indexed on `(ip_address, created_at DESC)` for fast window queries
- RLS: No client access

**`global_usage`** — Daily request counter across all users
- Hard cap of 200 requests/day (configurable)
- RLS: No client access

**`response_cache`** — Exact-match query cache
- SHA-256 hash index for O(1) lookups
- Eliminates LLM costs for repeated queries
- RLS: No client access

### Key Function

**`search_verses(query_embedding, search_keyword, match_count)`**
- Hybrid search combining keyword ILIKE filter with vector cosine distance
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

**Defense in Depth:**
1. JWT validation (Supabase auth)
2. IP-based rate limiting (database-persisted, survives cold starts)
3. Global daily cap (hard ceiling on total API spend)
4. Message length validation (500 char cap)
5. Response caching (reduces API call surface)
6. RLS on all tables (data isolation)
7. Server-side API keys (never exposed to client)
8. Fail-closed design (errors default to deny)

## Frontend Component Tree

```
RootLayout (_layout.tsx)
├── QueryClientProvider
│   └── GestureHandlerRootView
│       └── Drawer
│           ├── HomeScreen (index.tsx)
│           │   ├── PromptPill (x4)
│           │   └── ChatInput
│           ├── ChatScreen (chat/[id].tsx)
│           │   ├── MessageList (FlatList)
│           │   │   └── ChatBubble
│           │   │       ├── User bubble (text only)
│           │   │       └── Assistant bubble
│           │   │           ├── Streaming text
│           │   │           └── VerseCard (x6)
│           │   └── ChatInput
│           └── HistoryDrawer
│               └── Conversation rows (FlatList)
```

## Future Scaling Path

- **Multi-translation support:** Add KJV, ESV, etc. by re-running ingestion with new `translation_id`
- **Real accounts:** Upgrade anonymous auth to Google/Apple sign-in for cross-device sync
- **Daily devotionals:** Passive content tab with scheduled verse reflections
- **Verse bookmarking:** Save and organize favorite verses
- **App Attestation:** Apple App Attest + Google Play Integrity to block script-based abuse
- **Edge caching:** CDN-level caching for the response cache layer
