# Deployment

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed and linked to your project
- [Rust toolchain](https://rustup.rs/) installed (for Tauri desktop builds only)
- Expo account (for EAS builds to App Store / Google Play)

---

## 1. Database Migrations

Apply all migrations in order. Existing data is preserved — migrations use `IF NOT EXISTS` and `ALTER TABLE … ADD COLUMN IF NOT EXISTS` patterns where possible.

```bash
supabase db push
```

Or apply individually via the Supabase SQL Editor in the order below:

```
supabase/migrations/20260402080000_initial_schema.sql
supabase/migrations/20260402081000_rate_limits.sql
supabase/migrations/20260403010000_user_verse_data.sql
supabase/migrations/20260524000000_backend_hardening.sql
supabase/migrations/20260524000001_optimize_embeddings.sql
```

> **Production caution:** Migration `20260524000000_backend_hardening.sql` adds FK constraints to existing tables. Run `EXPLAIN` on the migration and verify data integrity (no orphaned `user_id` values) before applying to a populated production database.

---

## 2. Edge Function

### Set Secrets

```bash
supabase secrets set \
  OPENAI_API_KEY="your-openai-key" \
  GEMINI_API_KEY="your-gemini-key" \
  DEV_BYPASS_SECRET="your-dev-secret"
```

Verify secrets are present:

```bash
supabase secrets list
```

### Deploy

```bash
supabase functions deploy chat --no-verify-jwt
```

`--no-verify-jwt` is intentional — the function performs its own JWT validation using `supabase.auth.getUser()`.

### Verify

After deployment, run a test query against the function (replace values with your project details):

```bash
curl -X POST https://your-project.supabase.co/functions/v1/chat \
  -H "Authorization: Bearer <anon-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"message": "What does John 3:16 say?", "conversation_id": null}'
```

Expected: SSE stream of `text`, `verses`, `conversation`, and `done` events.

---

## 3. Bible Data Ingestion (One-Time)

This only needs to run once per Supabase project. Re-running is safe (upserts only).

```bash
cd scripts
npm install
npx tsx ingest.ts
```

Takes ~20 minutes. Costs ~$0.02 in OpenAI embedding usage. Result: 31,086 verses across all 66 BSB books.

If some books are missing verses after ingestion (e.g. after an interrupted run), use the targeted fix script:

```bash
cd scripts
npx tsx fix-incomplete.ts
```

---

## 4. Mobile App (Expo / EAS)

### Development Build

```bash
npx expo start
```

### Production Build via EAS

Ensure you have an Expo account and the EAS CLI:

```bash
npm install -g eas-cli
eas login
eas build --platform ios     # iOS App Store build
eas build --platform android # Google Play build
```

Configure `eas.json` with your build profiles before submitting.

**Before submitting to App Store / Google Play:**
- Remove or clear `EXPO_PUBLIC_DEV_BYPASS` from your `.env` and EAS environment variables
- Verify `app.json` has `NSMicrophoneUsageDescription` set (already present: `"Used for voice-to-text input"`)
- Verify Android `RECORD_AUDIO` permission is declared (already present in `app.json`)

### Web Build

```bash
npx expo export --platform web
```

The output in `dist/` can be hosted on any static file server or CDN.

---

## 5. Desktop App (Tauri)

### Requirements

- Rust toolchain (`rustup`)
- Platform toolchain: Xcode CLI tools (macOS), Visual Studio Build Tools (Windows), or `build-essential` (Linux)

### Development

```bash
npm run desktop   # equivalent to: tauri dev
```

### Production Build

```bash
npm run desktop:build   # equivalent to: tauri build
```

Output is placed in `src-tauri/target/release/bundle/`. macOS produces a `.dmg`, Windows an `.msi`, Linux `.deb`/`.AppImage`.

---

## 6. Rate Limit Maintenance

The `rate_limits` table accumulates rows over time. A `cleanup_rate_limits()` function exists in the database but is not yet scheduled.

**TODO:** Schedule via pg_cron in the Supabase dashboard:

```sql
SELECT cron.schedule(
  'cleanup-rate-limits',
  '0 3 * * *',   -- 3am daily
  $$ SELECT cleanup_rate_limits(); $$
);
```

Without this, the `rate_limits` table will grow unbounded.

---

## 7. Monitoring

- **Supabase Storage:** Monitor the Supabase dashboard Storage gauge. After the halfvec migration, expect ~200–250 MB freed on the free tier. If storage remains tight, next step is reducing embedding dimensions to 512 (requires re-ingestion).
- **Edge Function Logs:** Check Supabase Dashboard > Edge Functions > chat > Logs for errors.
- **Rate Limits:** Query `global_usage` to monitor daily request volume.
