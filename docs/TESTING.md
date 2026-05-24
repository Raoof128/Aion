# Testing

## Running Tests

```bash
npm test
```

The suite runs all files matching `tests/**/*.test.ts` using Node's built-in `node:test` runner via `tsx`. No separate test framework is required.

## Full Quality Gate

```bash
./check.sh
```

Runs four steps in sequence, exiting immediately on failure:

1. **Prettier format check** — `npm run format:check`
2. **ESLint lint** — `npm run lint`
3. **TypeScript type-check** — `npm run type-check`
4. **Tests** — `npm test`

CI (`.github/workflows/ci.yml`) runs the same four steps on every push and pull request.

## Test Suite Overview

| File | Suites | Tests |
|------|--------|-------|
| `tests/bible-data.test.ts` | Bible Books Data | Book list count, OT/NT split, VOTD rotation by day-of-year |
| `tests/notifications.test.ts` | Notifications | AsyncStorage toggle, calendar-index day wrap, notification payload structure |
| `tests/settings.test.ts` | Settings | Font size scale values, theme colour token presence |
| `tests/supabase.test.ts` | Supabase Config | Environment variable presence and non-placeholder values |
| `tests/tts.test.ts` | TTS | Markdown cleaning regex (bold, italic, headers, links), web/native dispatch paths |
| `tests/utils.test.ts` | Utils | `timeAgo()` relative time formatting (minutes, hours, days) |

**Total: 15 tests across 6 files.** All must pass before any PR is merged.

## What Is Not Tested

- UI rendering (no component snapshot or interaction tests)
- Edge Function behaviour (Deno runtime — integration-tested manually against Supabase)
- SSE streaming (manual smoke test required)
- Database queries and RLS policies (manual test against a real Supabase project)

## Writing New Tests

1. Create `tests/your-module.test.ts`.
2. Import from `node:test` and `node:assert`:

```typescript
import { describe, it } from "node:test";
import assert from "node:assert/strict";
```

3. Mock platform dependencies (e.g. `AsyncStorage`, `expo-speech`) at the top of the file before importing the module under test.
4. Run `./check.sh` — your new tests are picked up automatically.
5. Format the file: `npm run format`.

## Mocking Strategy

Tests run in Node, not in a React Native environment. Modules that use platform APIs must be mocked before import. See `tests/notifications.test.ts` for the `AsyncStorage` mock pattern and `tests/tts.test.ts` for the `expo-speech` mock pattern.
