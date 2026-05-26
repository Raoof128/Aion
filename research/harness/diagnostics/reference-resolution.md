# Diagnostic: Reference Resolution Failure in Hybrid RAG v0

**Date:** 2026-05-26
**Finding:** Pilot Result 1
**Status:** Fixed in hybrid_rag v1

## Observation

stub_10 run on hybrid_rag v0 (`research/results/baseline_hybrid_v0_stub10.jsonl`):

| id       | category | question                       | R@5  | P@5  |
|----------|----------|--------------------------------|------|------|
| aion_001 | direct   | What does John 3:16 say?       | 0.00 | 0.00 |
| aion_002 | direct   | What is written in Psalm 23:1? | 0.00 | 0.00 |

Both direct-lookup questions scored R@5=0.00. These are the easiest possible queries — canonical references with a single gold verse each.

## Root cause

The v0 pipeline passes the raw user message into `embedText()` and `searchVerses()`. For a query like "What does John 3:16 say?", the hybrid search:

1. Embeds the full sentence semantically → retrieves thematically *similar* verses, not JHN.3.16
2. Passes `extractKeyword("John 3:16")` → the keyword string is used in ILIKE against verse `content` — no match because content is verse text, not a reference label

Neither path resolves the structured coordinate `(JHN, 3, 16)` to the actual row.

## Fix

Added `parseReferences()` before the hybrid search path in `supabase/functions/chat/index.ts`. If a reference is detected, `lookupByRefs()` queries `bible_verses` directly:

```sql
SELECT * FROM bible_verses
WHERE book_id = 'JHN' AND chapter = 3 AND verse IN (16)
```

Falls back to hybrid search if exact lookup returns no rows.

Parser (`lib/bible-reference-parser.ts`) handles:
- Full names: "John 3:16", "Psalm 23:1"
- Abbreviations: "Jn 3:16", "Ps 23:1"
- Numbered books: "1 John 4:8", "2 Timothy 3:16"
- Verse ranges: "Matthew 6:14-15"
- Multi-ref: "Compare Matthew 6:14 and Ephesians 4:32"
- Case-insensitive matching

## Expected outcome after fix

| id       | category | R@5 before | R@5 after |
|----------|----------|-----------|-----------|
| aion_001 | direct   | 0.00      | 1.00      |
| aion_002 | direct   | 0.00      | 1.00      |

Overall R@5: 0.286 → expected ≥ 0.571
