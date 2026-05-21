# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Change Log

### 2026-05-21 (Australia/Sydney)
**Raouf:**
- **Scope:** Syntax Fix & Supabase Resilience
- **Summary:** Fixed a syntax error in the chapter reader screen by removing a duplicate closing parenthesis and semicolon. Additionally, made the Supabase client instantiation resilient by providing fallback values and console warnings when environment variables are missing, preventing import-time app crashes.
- **Files Changed:**
  - [app/reader/[bookId]/[chapter].tsx](file:///Users/raoof.r12/Desktop/Raouf/Aion/app/reader/%5BbookId%5D/%5Bchapter%5D.tsx) - Removed duplicate closing parenthesis and semicolon.
  - [lib/supabase.ts](file:///Users/raoof.r12/Desktop/Raouf/Aion/lib/supabase.ts) - Added fallback environment variable values and warning.
- **Verification:** Ran `npm run lint`, `npm run format`, and `npm run type-check`, all of which completed with 0 errors.
- **Follow-ups:** None.

### 2026-05-21 (Australia/Sydney)
**Raouf:**
- **Scope:** Dependency Upgrades
- **Summary:** Upgraded non-Expo dependencies to their latest compatible versions, aligned Expo modules with Expo SDK 54 recommended versions via `npx expo install --fix`, and pinned `react-dom` to `19.1.0` to resolve a peer dependency conflict with `react@19.1.0` required by `react-native`.
- **Files Changed:**
  - [package.json](file:///Users/raoof.r12/Desktop/Raouf/Aion/package.json) - Upgraded dependencies/devDependencies and pinned `react-dom` to `19.1.0`.
- **Verification:** Ran `npm install` and verified all packages resolved cleanly with 0 vulnerabilities. Ran `npm run lint` and verified linter output is error-free.
- **Follow-ups:** None.

### 2026-05-21 (Australia/Sydney)
**Raouf:**
- **Scope:** Dependency Security Vulnerabilities
- **Summary:** Resolved npm audit security vulnerabilities (XSS in postcss and ReDoS in markdown-it) by configuring npm overrides.
- **Files Changed:**
  - [package.json](file:///Users/raoof.r12/Desktop/Raouf/Aion/package.json) - Added overrides for `postcss` (`^8.5.15`) and `markdown-it` (`^14.1.1`).
- **Verification:** Ran `npm install` and verified `npm audit` reports 0 vulnerabilities. Verified `npm run lint` still runs successfully with 0 errors.
- **Follow-ups:** None.

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
