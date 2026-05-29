# Setup Guide

## Prerequisites

- Node.js 22+ (CI runs on 22; 20+ works locally)
- Expo CLI (`npm install -g expo-cli`)
- Supabase CLI (`npm install -g supabase`)
- A Supabase project with pgvector enabled
- OpenAI API key (for embeddings + Whisper voice transcription)
- Google AI (Gemini) API key

---

## 1. Install Dependencies

```bash
npm install
cd scripts && npm install && cd ..
```

---

## 2. Configure Environment

Copy the example files and fill in your credentials:

```bash
cp .env.example .env
cp scripts/.env.example scripts/.env
```

Edit `.env` (client environment):

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_OPENAI_KEY=your-openai-key    # Required for voice-to-text on iOS/Android
EXPO_PUBLIC_DEV_BYPASS=your-dev-secret    # Remove for production builds
```

Edit `scripts/.env` (server/ingestion environment):

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
```

See [ENVIRONMENT.md](ENVIRONMENT.md) for a full description of every variable.

---

## 3. Database Setup

Apply all migrations in order via `supabase db push` or your Supabase SQL Editor:

1. `supabase/migrations/20260402080000_initial_schema.sql` — Tables, indexes, RLS, hybrid search function
2. `supabase/migrations/20260402081000_rate_limits.sql` — Rate limiting, response cache, global usage
3. `supabase/migrations/20260403010000_user_verse_data.sql` — Highlights, bookmarks, and notes tables
4. `supabase/migrations/20260524000000_backend_hardening.sql` — Security hardening, FK constraints, triggers
5. `supabase/migrations/20260524000001_optimize_embeddings.sql` — halfvec migration, IVFFlat index rebuild

Enable **Anonymous Sign-Ins** in Supabase Dashboard > Authentication > Providers.

---

## 4. Edge Function Secrets

Set your backend secrets via the Supabase CLI:

```bash
supabase secrets set \
  OPENAI_API_KEY="your-key" \
  GEMINI_API_KEY="your-key" \
  DEV_BYPASS_SECRET="your-secret"
```

---

## 5. Deploy Edge Function

```bash
supabase functions deploy chat --no-verify-jwt
```

---

## 6. Ingest Bible Data (One-Time)

This fetches the entire BSB Bible from bible.helloao.org, generates embeddings via OpenAI, and upserts to Supabase. Takes ~20 minutes, costs ~$0.02. Result: 31,086 verses across all 66 books.

```bash
cd scripts
npx tsx ingest.ts
```

If some books are missing verses (e.g. after an interrupted run), use the targeted fix script:

```bash
cd scripts
npx tsx fix-incomplete.ts
```

---

## 7. Run the App

```bash
# Mobile (iOS/Android via Expo Go)
npx expo start

# Web browser
npx expo start --web

# Desktop (requires Rust installed)
npm run desktop
```
