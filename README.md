# Aion

AI-powered Bible companion using Agentic Hybrid RAG (Retrieval-Augmented Generation).

Users interact through a Perplexity-style chat interface with dynamic prompt suggestions and rich verse cards. All AI responses are grounded in actual Bible data retrieved via combined keyword and semantic search.

## Tech Stack

- **Frontend:** React Native + Expo + Expo Router + NativeWind
- **Backend:** Supabase (PostgreSQL + pgvector + Edge Functions)
- **Auth:** Supabase Anonymous Auth
- **Embedding Model:** OpenAI `text-embedding-3-small` (1536 dimensions)
- **Chat LLM:** Gemini 3 Flash
- **Data Source:** [bible.helloao.org](https://bible.helloao.org/docs/) (BSB translation)
- **Client Caching:** @tanstack/react-query

## Architecture

```
User Message
    |
    v
[React Native App] ---> [Supabase Edge Function]
                              |
                    +---------+---------+
                    |                   |
              [Regex Extract]    [OpenAI Embed]
              (keyword: "444")   (1536-dim vector)
                    |                   |
                    +---------+---------+
                              |
                    [Hybrid Search (pgvector)]
                    Keyword match + Semantic similarity
                              |
                    [Retrieved Verses]
                              |
                    [Gemini 3 Flash - SSE Stream]
                              |
                    [Chat Response + Verse Cards]
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
│   └── types.ts                  # TypeScript interfaces
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

1. `supabase/migrations/20260402080000_initial_schema.sql` - Tables, indexes, RLS, hybrid search function
2. `supabase/migrations/20260402081000_rate_limits.sql` - Rate limiting, response cache, global usage

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
npx expo start
```

## Security

- **API keys server-side only:** OpenAI, Gemini, and service_role keys stored as Edge Function secrets
- **IP-based rate limiting:** 5/min burst, 30/3hrs per IP, 200/day global cap
- **Response cache:** Exact-match queries served from DB at zero LLM cost
- **Message length cap:** 500 characters max to prevent token-stuffing
- **RLS enforced:** All tables protected, users can only access their own data
- **Dev bypass:** Secret header for testing, excluded from production builds
- **Fail-closed:** Rate limit errors default to deny

## License

Private project.
