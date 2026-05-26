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

| File | Suites | What it covers |
|------|--------|----------------|
| `tests/bible-data.test.ts` | Bible Books Data | Book list count, OT/NT split, VOTD rotation by day-of-year |
| `tests/notifications.test.ts` | Notifications | AsyncStorage toggle, calendar-index day wrap, notification payload structure |
| `tests/settings.test.ts` | Settings | Font size scale values, theme colour token presence |
| `tests/supabase.test.ts` | Supabase Config | Environment variable presence and non-placeholder values |
| `tests/tts.test.ts` | TTS | Markdown cleaning regex (bold, italic, headers, links), web/native dispatch paths |
| `tests/utils.test.ts` | Utils | `timeAgo()` relative time formatting (minutes, hours, days) |
| `tests/bookBackgroundSettings.test.ts` | BookBackground | Load defaults, save→load round-trip, partial merge, per-book isolation, reset, corrupt JSON fallback |
| `tests/streak-helpers.test.ts` | Streak Helpers | `isoWeekStart` across DST boundaries, `buildWeekDays` 7-day calendar construction |
| `tests/bible-reference-parser.test.ts` | Reference Parser | Full names, abbreviations, numbered books (1 John, 2 Timothy), verse ranges (Matt 6:14–15), multi-ref, chapter-only refs (Psalm 23, 1 Corinthians 15), CHAPTER_REGEX backtrack edge cases, case-insensitive matching, null for non-refs |

**Total: 79 tests across 9 files.** All must pass before any PR is merged.

## Benchmark Harness

The research benchmark (`research/harness/`) exercises the live Edge Function and is **not** part of `npm test`. It runs via:

```bash
npm run research:benchmark   # full gold_40 run against live Edge Function
npm run research:metrics     # compute R@5 / P@5 / MRR from a frozen JSONL result file
```

The benchmark directly exercises:

- SSE streaming from the Supabase Edge Function
- The hybrid RAG retrieval pipeline (keyword + semantic)
- The bible-reference-parser (verse and chapter-only resolution)
- The direct DB chapter lookup path (v3)

Current benchmark result (v3 system, gold_40 v0.3): **R@5=0.941**, MRR=0.773, 34/34 scored, 0 errors.

## What Is Not Tested by `npm test`

- UI rendering (no component snapshot or interaction tests)
- Edge Function behaviour (covered by benchmark harness — see above)
- SSE streaming (covered by benchmark harness)
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

Tests run in Node, not in a React Native environment. Modules that use platform APIs must be mocked before import. See `tests/notifications.test.ts` for the `AsyncStorage` mock pattern and `tests/tts.test.ts` for the `expo-speech` mock pattern. For module-level state (e.g. `cachedSettings`), use `require.cache` busting with a `freshModule()` helper to reset between tests — see `tests/bookBackgroundSettings.test.ts`.
