# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Change Log

### 2026-05-23 (Australia/Sydney)
**Raouf:**
- **Scope:** Main Menu Background & UI/UX Audit
- **Summary:** Added user's custom main menu background image assets, resolved the Expo bundling path mismatch error by aligning the filename case and spelling in `assets/`, created a root `check.sh` quality gate script, and performed a comprehensive UI/UX contrast audit to guarantee high readability of all main menu text. Added a dark obsidian background overlay (`0.65` opacity) and upgraded prompt pills, reader buttons, input forms, and VOTD cards with higher contrast glassmorphic dark surfaces.
- **Files Changed:**
  - [app/(tabs)/index.tsx](file:///Users/raoof.r12/Desktop/Raouf/Aion/app/(tabs)/index.tsx) - Wrapped layout in `ImageBackground`, added `View` with `backgroundOverlay` styles (`0.65` opacity obsidian), changed container background to transparent, boosted tagline and suggestions label text contrast, and upgraded the VOTD card and reader button to use premium glassmorphic dark surfaces (`rgba(17, 17, 20, 0.7-0.8)`).
  - [components/PromptPill.tsx](file:///Users/raoof.r12/Desktop/Raouf/Aion/components/PromptPill.tsx) - Upgraded suggestion prompt pills to use the higher contrast glassmorphic dark background.
  - [components/ChatInput.tsx](file:///Users/raoof.r12/Desktop/Raouf/Aion/components/ChatInput.tsx) - Upgraded bottom wrapper dock to use a semi-transparent dark obsidian surface (`rgba(10, 10, 12, 0.85)`) and input box to a higher contrast glass background (`rgba(17, 17, 20, 0.5)`).
  - [assets/Main_menue.png](file:///Users/raoof.r12/Desktop/Raouf/Aion/assets/Main_menue.png) - Added and renamed the background image asset to resolve Expo's resolver mismatch.
  - [check.sh](file:///Users/raoof.r12/Desktop/Raouf/Aion/check.sh) - Created root script to run format, lint, type-check, and tests sequentially.
- **Verification:** Ran `./check.sh` executing all linter checks, formatter checks, typescript compiler checks, and the 15-test test suite cleanly.
- **Follow-ups:** None.

### 2026-05-21 (Australia/Sydney)
**Raouf:**
- **Scope:** Prettier Formatting Alignment
- **Summary:** Ran Prettier on newly added test modules to resolve style format checker failures.
- **Files Changed:**
  - [tests/notifications.test.ts](file:///Users/raoof.r12/Desktop/Raouf/Aion/tests/notifications.test.ts) - Formatted constructor signatures and assertion arguments.
  - [tests/tts.test.ts](file:///Users/raoof.r12/Desktop/Raouf/Aion/tests/tts.test.ts) - Formatted long strings, constructor checks, and assertion structures.
- **Verification:** Ran `npm run format:check` resulting in successfully formatted verification status.
- **Follow-ups:** None.

### 2026-05-21 (Australia/Sydney)
**Raouf:**
- **Scope:** CI/CD Test Pipeline Integration
- **Summary:** Integrated the native testing pipeline into the GitHub Actions CI workflow to run tests automatically on all push and pull requests.
- **Files Changed:**
  - [.github/workflows/ci.yml](file:///Users/raoof.r12/Desktop/Raouf/Aion/.github/workflows/ci.yml) - Added `Run Tests` step executing `npm test`.
- **Verification:** Verified YAML schema structure and local tests execution.
- **Follow-ups:** None.

### 2026-05-21 (Australia/Sydney)
**Raouf:**
- **Scope:** Expansion of Test Suite (TTS & Notifications)
- **Summary:** Added comprehensive unit and integration test coverage for notifications and text-to-speech modules. Verified AsyncStorage storage access toggles, day-of-year verse rotation logic, HTML5 web notification emission structures, custom markdown regex cleaning (stripping bold, italic, headers, and links), and web/native TTS engine hook dispatches.
- **Files Changed:**
  - [tests/notifications.test.ts](file:///Users/raoof.r12/Desktop/Raouf/Aion/tests/notifications.test.ts) - Unit tests verifying storage checks, calendar-index rotation, and mock Notification object parameters.
  - [tests/tts.test.ts](file:///Users/raoof.r12/Desktop/Raouf/Aion/tests/tts.test.ts) - Unit tests verifying Markdown cleaning regex filters and web/native synthesizers.
- **Verification:** Ran `npm test` executing 15 checks across 6 suites cleanly. Lint and type check tasks run with 0 errors.
- **Follow-ups:** None.

### 2026-05-21 (Australia/Sydney)
**Raouf:**
- **Scope:** Native Test Suite Implementation
- **Summary:** Configured a lightweight TypeScript-ready native test runner using Node's `node:test` and `tsx`. Created comprehensive unit test coverage for core business logic, including Bible metadata validation, daily verse rotation, user setting scales, Supabase environment checks, and timestamp formatting utilities.
- **Files Changed:**
  - [package.json](file:///Users/raoof.r12/Desktop/Raouf/Aion/package.json) - Configured `"test"`, `"lint"`, and `"format"` scripts to include the `tests` directory and added `tsx` dependency.
  - [tests/bible-data.test.ts](file:///Users/raoof.r12/Desktop/Raouf/Aion/tests/bible-data.test.ts) - Unit tests for Bible books data structure, OT/NT division, and VOTD rotation.
  - [tests/settings.test.ts](file:///Users/raoof.r12/Desktop/Raouf/Aion/tests/settings.test.ts) - Unit tests validating font size scales and theme configurations.
  - [tests/supabase.test.ts](file:///Users/raoof.r12/Desktop/Raouf/Aion/tests/supabase.test.ts) - Integration tests for Supabase configuration environment variable checks.
  - [tests/utils.test.ts](file:///Users/raoof.r12/Desktop/Raouf/Aion/tests/utils.test.ts) - Unit tests for the relative timeago formatting utility.
- **Verification:** Ran `npm test`, `npm run lint`, and `npm run type-check`. All 8 tests passed successfully, and linting/type-checking completed with 0 errors.
- **Follow-ups:** None.

### 2026-05-21 (Australia/Sydney)
**Raouf:**
- **Scope:** UI/UX Premium Enhancements
- **Summary:** Applied luxury gold/amber and glassmorphic UI/UX enhancements across Aion. Introduced dual breathing purple/amber ambient glows on the Home screen, styled the Verse of the Day (VOTD) card with glowing amber borders, refined search text focus indicators, added Gutenberg-style large initial drop caps for the first verse of scripture chapters, polished selected verse highlights with gold borders, upgraded the selected verse actions panel with a glassmorphic toolbar, and updated Settings active options and buttons to match the luxury amber Gutenberg aesthetic.
- **Files Changed:**
  - [app/(tabs)/index.tsx](file:///Users/raoof.r12/Desktop/Raouf/Aion/app/(tabs)/index.tsx) - Upgraded with dual ambient glows, luxury gold VOTD cards, and polished button interactions.
  - [app/(tabs)/read.tsx](file:///Users/raoof.r12/Desktop/Raouf/Aion/app/(tabs)/read.tsx) - Upgraded search bar focus indicators and book grid card states.
  - [app/reader/[bookId]/[chapter].tsx](file:///Users/raoof.r12/Desktop/Raouf/Aion/app/reader/%5BbookId%5D/%5Bchapter%5D.tsx) - Implemented Gutenberg initial drop caps, luxury gold selected verse border highlights, and redesigned the glassmorphic actions toolbar.
  - [components/SettingsSheet.tsx](file:///Users/raoof.r12/Desktop/Raouf/Aion/components/SettingsSheet.tsx) - Re-styled option active indicators and action button to use the new amber themes.
- **Verification:** Ran `npm run lint` and `npm run type-check`, both completed successfully with 0 warnings or errors.
- **Follow-ups:** None.

### 2026-05-21 (Australia/Sydney)
**Raouf:**
- **Scope:** Expo Router Layout and Supabase UX Warning
- **Summary:** Resolved the Expo Router nested layout warning `[Layout children]: No route named "reader" exists in nested children` by creating a nested navigation layout wrapper (`app/reader/_layout.tsx`). Also improved user onboarding UX by detecting placeholder/unconfigured Supabase environment variables in `lib/supabase.ts` and showing a modern warning banner on the Home screen guiding the user on how to update their `.env` file.
- **Files Changed:**
  - [app/reader/_layout.tsx](file:///Users/raoof.r12/Desktop/Raouf/Aion/app/reader/_layout.tsx) - Created nested Stack router layout wrapper.
  - [lib/supabase.ts](file:///Users/raoof.r12/Desktop/Raouf/Aion/lib/supabase.ts) - Exported `isSupabaseConfigured` helper checking for default placeholder values.
  - [app/(tabs)/index.tsx](file:///Users/raoof.r12/Desktop/Raouf/Aion/app/(tabs)/index.tsx) - Added amber-colored alert warning banner when Supabase setup is required.
- **Verification:** Ran `npm run lint` and `npm run type-check`, both completed successfully with 0 errors.
- **Follow-ups:** None.

### 2026-05-21 (Australia/Sydney)
**Raouf:**
- **Scope:** Backend IDOR Security Fix
- **Summary:** Performed a backend security audit and fixed an Insecure Direct Object Reference (IDOR) vulnerability in the chat Supabase Edge Function (`supabase/functions/chat/index.ts`). The function now validates the UUID format of incoming `conversation_id` and verifies that the authenticated user owns the conversation before updating it or inserting new messages, preventing users from altering others' conversations.
- **Files Changed:**
  - [supabase/functions/chat/index.ts](file:///Users/raoof.r12/Desktop/Raouf/Aion/supabase/functions/chat/index.ts) - Added UUID format validation and ownership checks before conversation database updates and message inserts.
- **Verification:** Ran `deno check supabase/functions/chat/index.ts`, `npm run lint`, `npm run format`, and `npm run type-check`, all completing with 0 errors.
- **Follow-ups:** None.

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
