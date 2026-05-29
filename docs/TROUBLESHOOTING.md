# Troubleshooting Guide

This guide covers common issues encountered during development and deployment of Aion.

## 1. Missing or Invalid Environment Variables

**Issue:** The app shows a warning banner about Supabase environment variables, or API calls fail instantly.
**Fix:** 
- Ensure you have copied `.env.example` to `.env` and filled in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Restart the Expo server (`npx expo start -c`) to clear the bundler cache.

## 2. Edge Function Rate Limits

**Issue:** The chat function returns a `429 Too Many Requests` error.
**Fix:**
- The system enforces a strict 5/min burst and 30/3hrs limit per IP.
- For local development, set `EXPO_PUBLIC_DEV_BYPASS=your-secret` in your `.env`, and ensure the identical secret is set as `DEV_BYPASS_SECRET` in your Supabase Edge Function secrets.

## 3. Empty Reader / Missing Verses

**Issue:** The Bible reader shows no verses, or the chat function cannot find verses.
**Fix:**
- Ensure you have run the ingestion script: `cd scripts && npx tsx ingest.ts`
- If the script was interrupted, run `npx tsx fix-incomplete.ts` to retry the missing books.

## 4. Voice-to-Text Not Working on Native

**Issue:** The microphone button doesn't do anything or throws an error on iOS/Android.
**Fix:**
- Ensure `EXPO_PUBLIC_OPENAI_KEY` is set in your `.env`. Native platforms rely on OpenAI Whisper for transcription.
- Ensure the app has microphone permissions enabled in your device settings.

## 5. Supabase CLI Auth Errors

**Issue:** Commands like `supabase functions deploy` fail with authentication errors.
**Fix:**
- Aion's Supabase CLI session is authenticated to a different account. Always prefix your commands with the Personal Access Token (PAT) from your `.env`:
  ```bash
  PAT=$(grep '^SUPABASE_ACCESS_TOKEN=' .env | cut -d'=' -f2-) && SUPABASE_ACCESS_TOKEN="$PAT" supabase <command>
  ```

## 6. Tauri Desktop Build Fails

**Issue:** `npm run desktop` fails to compile.
**Fix:**
- Ensure the Rust toolchain is installed (`rustup`).
- Ensure Xcode CLI tools (macOS) or Visual Studio Build Tools (Windows) are fully installed and updated.

## 7. Migration Errors

**Issue:** `supabase db push` fails with foreign key constraint errors on migration 4.
**Fix:**
- Migration `20260524000000_backend_hardening.sql` adds strict FKs. If you have orphaned rows in `conversations` or `user_verse_data` from earlier testing without auth, you must delete them manually before the migration will succeed.
