# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - 2026-04-02

### Added

- React Native + Expo project scaffold with TypeScript
- NativeWind (Tailwind CSS) styling with dark theme and amber accents
- Expo Router with file-based routing and drawer navigation
- Supabase PostgreSQL schema with pgvector for semantic embeddings
- HNSW index on embedding column for fast vector similarity search
- Hybrid search function combining keyword matching and semantic similarity
- Chat Edge Function with full RAG pipeline (extract, embed, search, generate, persist)
- Server-Sent Events (SSE) streaming for real-time Gemini 3 Flash responses
- Anonymous Supabase auth with automatic session initialization
- Home screen with Aion branding and dynamic prompt suggestion pills
- Chat screen with streaming text display and rich verse cards
- Conversation history drawer with React Query caching
- VerseCard component with copy-to-clipboard functionality
- Bible data ingestion script (BSB translation via bible.helloao.org API)
- 23,583 BSB verses with OpenAI text-embedding-3-small embeddings ingested
- Exact-match response cache (SHA-256 hashed queries, zero LLM cost on cache hit)
- Dev bypass header for testing without rate limits

### Security

- Row Level Security (RLS) enabled on all 6 database tables
- IP-based rate limiting (5/min burst, 30/3hrs per IP, 200/day global)
- Fail-closed rate limiting (deny on error)
- Server-side API key isolation (OpenAI, Gemini, service role keys in Edge Function secrets only)
- 500-character message length cap against token-stuffing
- All security tables (rate_limits, global_usage, response_cache) blocked from client access via RLS
