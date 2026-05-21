# Agent Rules

These rules govern the development of the Aion project.

## Rules
- **Dependency Cleanliness:** Maintain clean package dependencies. Resolve peer dependency conflicts by aligning versions in `package.json` rather than relying on `--legacy-peer-deps` or `--force`.
- **Cross-Platform Compatibility:** Keep cross-platform requirements in mind. The app runs on Expo (iOS, Android, Web) and Tauri (macOS, Windows, Linux).
- **Linter & Formatter:** Ensure ESLint runs cleanly on `app/`, `components/`, and `lib/` directories. Use prettier for formatting.

## Change Log

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
