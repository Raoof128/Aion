# Environment Variables

This document describes every environment variable used by Aion. Never commit real secrets — both `.env` and `scripts/.env` are listed in `.gitignore`.

---

## App Environment (`.env`)

These are read at build time by Expo. All `EXPO_PUBLIC_` prefixed variables are bundled into the client — treat them as publicly visible.

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (e.g. `https://abcdef.supabase.co`) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous (public) API key — safe to expose |
| `EXPO_PUBLIC_DEV_BYPASS` | No | Secret string sent as `x-dev-bypass` header to skip rate limiting during development. **Remove or leave empty for any production/App Store build.** |

### Example `.env`

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_DEV_BYPASS=
```

Copy from the example: `cp .env.example .env`

> **No OpenAI key in the client.** Native voice input posts the recording to the `transcribe` Edge Function with the user's Supabase session JWT; the function calls Whisper with the server-side `OPENAI_API_KEY` secret. Web uses the browser Web Speech API.

The research harness reads `GEMINI_API_KEY` (Gemini judge) and `OPENAI_API_KEY` (GPT judge) from the same `.env`. Neither has the `EXPO_PUBLIC_` prefix, so neither is bundled.

---

## Script Environment (`scripts/.env`)

Used only by the server-side ingestion scripts. These are **never** bundled into the app.

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL (same value as `EXPO_PUBLIC_SUPABASE_URL`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key — bypasses RLS for bulk data writes. **Never expose in client code.** |
| `OPENAI_API_KEY` | Yes | OpenAI API key — used for generating `text-embedding-3-small` vectors during ingestion |

### Example `scripts/.env`

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
```

Copy from the example: `cp scripts/.env.example scripts/.env`

---

## Edge Function Secrets

Stored in Supabase, never in source control. Set via the Supabase CLI:

```bash
supabase secrets set \
  OPENAI_API_KEY="your-openai-key" \
  GEMINI_API_KEY="your-gemini-key" \
  DEV_BYPASS_SECRET="your-dev-secret"
```

| Secret | Purpose |
|--------|---------|
| `OPENAI_API_KEY` | Query embeddings (`chat`) and Whisper transcription for native voice input (`transcribe`) |
| `GEMINI_API_KEY` | Calls Gemini 3.1 Flash Lite for streaming chat responses |
| `DEV_BYPASS_SECRET` | Must match `EXPO_PUBLIC_DEV_BYPASS` to allow rate limit bypass |
| `SUPABASE_URL` | Auto-injected by Supabase — do not set manually |
| `SUPABASE_ANON_KEY` | Auto-injected by Supabase — do not set manually |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected by Supabase — do not set manually |

---

## Tauri Desktop

The Tauri desktop wrapper (`src-tauri/`) inherits the Expo web build's environment. No additional variables are required.
