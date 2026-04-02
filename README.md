# Aion

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-20232A?logo=react&logoColor=61DAFB)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow)

AI-powered Bible companion using Agentic Hybrid RAG (Retrieval-Augmented Generation).

Users interact through a Perplexity-style chat interface with dynamic prompt suggestions and rich verse cards. All AI responses are grounded in actual Bible data retrieved via combined keyword and semantic search.

## Features

- **Conversational Bible Q&A** — Ask questions in plain language and receive contextual answers grounded in scripture
- **Hybrid RAG retrieval** — Combines keyword matching and semantic vector search (pgvector) for precise verse lookup
- **Streaming responses** — Real-time SSE streaming from Gemini via Supabase Edge Functions
- **Rich verse cards** — Inline Bible verse display with book, chapter, and verse attribution
- **Prompt suggestions** — Dynamic suggestion pills on the home screen to inspire exploration
- **Conversation history** — Persistent history accessible via a slide-out drawer
- **Anonymous auth** — Zero sign-up friction; users are authenticated silently on first launch
- **Rate limiting & caching** — IP-based rate limits and exact-match response cache to control costs

## Screenshots

> _Screenshots coming soon._

## Tech Stack

- **Frontend:** React Native + Expo + Expo Router
- **Desktop:** Tauri v2 (native macOS/Windows/Linux wrapper, ~5MB)
- **Backend:** Supabase (PostgreSQL + pgvector + Edge Functions)
- **Auth:** Supabase Anonymous Auth
- **Embedding Model:** OpenAI `text-embedding-3-small` (1536 dimensions)
- **Chat LLM:** Gemini 3.1 Flash Lite Preview
- **Data Source:** [bible.helloao.org](https://bible.helloao.org/docs/) (BSB translation)
- **Client Caching:** @tanstack/react-query

## Architecture

```
User Message
    │
    ▼
[React Native App] ──────────────► [Supabase Edge Function]
                                           │
                               ┌───────────┴───────────┐
                               │                       │
                         [Regex Extract]         [OpenAI Embed]
                         keyword: "John 3:16"    1536-dim vector
                               │                       │
                               └───────────┬───────────┘
                                           │
                               [Hybrid Search — pgvector]
                               Keyword match + Semantic similarity
                                           │
                                   [Retrieved Verses]
                                           │
                               [Gemini 3 Flash — SSE Stream]
                                           │
                               [Chat Response + Verse Cards]
                                           │
    [React Native App] ◄─────────────────────────────────
```

## Project Structure

```
Aion/
├── app/                          # Expo Router screens
│   ├── _layout.tsx               # Root layout (drawer + auth)
│   ├── index.tsx                 # Home screen (prompt pills)
│   └── chat/[id].tsx             # Chat screen (streaming + verse cards)
├── components/                   # React Native components
│   ├── VerseCard.tsx             # Bible verse display card
│   ├── PromptPill.tsx            # Suggestion chips
│   ├── ChatBubble.tsx            # Message bubbles
│   ├── ChatInput.tsx             # Text input + send
│   └── HistoryDrawer.tsx         # Conversation history
├── lib/                          # Shared utilities
│   ├── supabase.ts               # Supabase client
│   ├── chat.ts                   # SSE streaming hook
│   ├── theme.ts                  # Design system (colors, fonts)
│   └── types.ts                  # TypeScript interfaces
├── src-tauri/                    # Tauri desktop app wrapper
│   ├── src/                      # Rust entry points
│   ├── icons/                    # App icons (all platforms)
│   └── tauri.conf.json           # Tauri configuration
├── scripts/
│   └── ingest.ts                 # Bible data ingestion pipeline
├── supabase/
│   ├── migrations/               # Database schema
│   └── functions/chat/index.ts   # RAG Edge Function
└── docs/                         # Design specs and plans
```

## Setup

### Prerequisites

- Node.js 20+
- Expo CLI (`npm install -g expo-cli`)
- A Supabase project with pgvector enabled
- OpenAI API key
- Google AI (Gemini) API key

### 1. Install Dependencies

```bash
npm install
cd scripts && npm install && cd ..
```

### 2. Configure Environment

Create `.env` in the project root:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_DEV_BYPASS=your-dev-secret  # Remove for production
```

Create `scripts/.env`:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
```

### 3. Database Setup

Run the SQL migrations in your Supabase SQL Editor:

1. `supabase/migrations/20260402080000_initial_schema.sql` — Tables, indexes, RLS, hybrid search function
2. `supabase/migrations/20260402081000_rate_limits.sql` — Rate limiting, response cache, global usage

Enable **Anonymous Sign-Ins** in Supabase Dashboard > Authentication > Providers.

### 4. Edge Function Secrets

```bash
supabase secrets set OPENAI_API_KEY="your-key" GEMINI_API_KEY="your-key" DEV_BYPASS_SECRET="your-secret"
```

### 5. Deploy Edge Function

```bash
supabase functions deploy chat --no-verify-jwt
```

### 6. Ingest Bible Data

```bash
cd scripts
npx tsx ingest.ts
```

This fetches the entire BSB Bible from bible.helloao.org, generates embeddings via OpenAI, and upserts to Supabase. Takes ~20 minutes, costs ~$0.02.

### 7. Run the App

```bash
# Mobile (iOS/Android via Expo Go)
npx expo start

# Web browser
npx expo start --web

# Desktop (requires Rust installed)
npm run desktop
```

## Development

```bash
# Type-check
npm run type-check

# Lint
npm run lint

# Format
npm run format

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android

# Run desktop app (dev mode)
npm run desktop

# Build desktop app (production)
npm run desktop:build
```

## Security

- **API keys server-side only:** OpenAI, Gemini, and service_role keys stored as Edge Function secrets
- **IP-based rate limiting:** 5/min burst, 30/3hrs per IP, 200/day global cap
- **Response cache:** Exact-match queries served from DB at zero LLM cost
- **Message length cap:** 500 characters max to prevent token-stuffing
- **RLS enforced:** All tables protected, users can only access their own data
- **Dev bypass:** Secret header for testing, excluded from production builds
- **Fail-closed:** Rate limit errors default to deny

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

See [LICENSE](LICENSE) for details.
