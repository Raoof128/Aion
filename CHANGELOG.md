# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Change Log

### 2026-05-21 (Australia/Sydney)
**Raouf:**
- **Scope:** ESLint Dependency Conflict
- **Summary:** Resolved `npm install` peer dependency conflict between `eslint` and `eslint-plugin-react` by downgrading `eslint` from `^10.1.0` to `^9.39.0`.
- **Files Changed:**
  - [package.json](file:///Users/raoof.r12/Desktop/Raouf/Aion/package.json) - Downgraded `eslint` dependency from `^10.1.0` to `^9.39.0`.
- **Verification:** Successfully ran `npm install` and verified that the package-lock resolved cleanly. Verified that `npm run lint` executes successfully with 0 errors.
- **Follow-ups:** None.

## [0.2.0] - 2026-04-03

### Added

- Tauri v2 desktop app wrapper for macOS/Windows/Linux (~5MB native binary)
- Design system with centralized theme (lib/theme.ts) — dark luxury aesthetic with amber accents
- Cross-platform clipboard support (navigator.clipboard on web, expo-clipboard on native)
- "Copied!" feedback animation on verse card copy button
- Back navigation button on chat screen header
- npm scripts: `desktop`, `desktop:build`

### Changed

- Replaced NativeWind className with React Native StyleSheet for reliable cross-platform rendering
- Updated Gemini model from gemini-3-flash to gemini-3.1-flash-lite-preview
- Chat navigation now uses unique route IDs to prevent stale state

### Fixed

- Chat screen not resetting when starting a new conversation from home screen
- Prompt pills navigating back to previous chat instead of creating fresh session
- Copy button not working on web platform
- Gemini API 404 errors (model name corrections)

---

## [0.1.0] - 2026-04-02

### Added

- React Native + Expo project scaffold with TypeScript
- StyleSheet-based styling with dark theme and amber accents
- Expo Router with file-based routing and drawer navigation
- Supabase PostgreSQL schema with pgvector for semantic embeddings
- HNSW index on embedding column for fast vector similarity search
- Hybrid search function combining keyword matching and semantic similarity
- Chat Edge Function with full RAG pipeline (extract, embed, search, generate, persist)
- Server-Sent Events (SSE) streaming for real-time Gemini responses
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
