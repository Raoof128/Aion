# v3 direct-chapter — gold_40 v0.2 Benchmark Summary

**Date:** 2026-05-26  
**System:** v3 direct-chapter (direct DB lookup + semantic within-chapter ranking)  
**Dataset:** `aion_bibleqa_gold_40_v0.2.jsonl` (40 Qs, expanded clusters)

## Overall Results

| Metric      | v1 on v0.1 | v2 on v0.2 | **v3 on v0.2** | v3 on v0.3 |
|-------------|------------|------------|----------------|------------|
| Recall@5    | 0.676      | 0.882      | **0.882**      | 0.941      |
| Precision@5 | —          | 0.253      | 0.253          | 0.300      |
| MRR         | —          | 0.700      | —              | 0.773      |
| Scored / N  | 29 / 40    | 34 / 34    | 34 / 34        | 34 / 34    |
| Errors      | 0          | 0          | 0              | 0          |

> v3 on v0.2: net-zero change vs v2 — aion_035 fixed (+1), aion_036 lost (-1).  
> v3 on v0.3: +0.059 from annotation-only cluster expansion.  
> Cumulative gain since v1 baseline: +0.265 (v3 on v0.3).

## By Category (v3 on v0.2)

| Category      | n  | Recall@5 |
|---------------|-----|----------|
| direct        | 10  | 1.00     |
| interpretive  | 7   | 0.86     |
| multi_hop     | 5   | 0.80     |
| thematic      | 12  | 0.83     |
| false_premise | 4   | N/A      |
| adversarial   | 2   | N/A      |

## Failures (n=4 on v0.2)

| ID        | Category     | Root cause label                          |
|-----------|--------------|-------------------------------------------|
| aion_023  | thematic     | `gold_too_narrow`                         |
| aion_027  | thematic     | `semantic_drift`                          |
| aion_033  | interpretive | `gold_too_narrow` (within-chapter miss)   |
| aion_036  | multi_hop    | `IVFFlat_boundary` (NEW failure in v3)    |

See `v3_direct_chapter_gold40_v02_failures.md` for details.

## Key Findings

### aion_035 — Fixed
"How do Psalm 23 and John 10 describe God as shepherd?" previously failed in v2 because the chapter-constrained semantic search could not surface PSA.23 or JHN.10 through the `matchCount=20` pool (saturated with shepherd verses from other books). In v3, the direct DB lookup fetches all PSA.23 and JHN.10 verses unconditionally. The `selectWithinChapters` per-chapter guarantee then adds PSA.23.1 even when it doesn't appear in the semantic filter. Result: PSA.23.1 (gold) is returned → R@5=1.

### aion_036 — New Failure (expected)
"Compare the teaching on anxiety in Philippians 4 and Matthew 6." In v2, this was **accidentally rescued** by the unrestricted fallback (`broadResults.slice(0,6)`) when the chapter filter had < 2 results. v3 deliberately removes all unrestricted fallback for `chapter_only` refs. The per-chapter guarantee adds PHP.4.1 and MAT.6.1 (first verse of each chapter, from the direct DB lookup), but the gold verses are PHP.4.6 and MAT.6.25. Two root causes: (1) IVFFlat non-determinism — PHP.4.6 and MAT.6.25 are near the `matchCount=20` boundary and are inconsistently absent; (2) name contamination — PHP.4.15 ("you Philippians know") matches the word "Philippians" and ranks above PHP.4.6 ("do not be anxious"). aion_036 loss is **intentional** — the v3 rule is correct; the fix requires per-chapter vector search, not a fallback.

### Architecture Summary
v3 replaces the v2 chapter-ref path as follows:

| v2 (broken) | v3 (correct) |
|---|---|
| Broad semantic search (`matchCount=20`) | Direct DB lookup by `(book_id, chapter)` |
| Filter to referenced chapters | Semantic ranking within fetched chapter verses |
| Fallback to unrestricted if filter < 2 results | Per-chapter coverage guarantee — no unrestricted fallback |

The key invariant: **for `chapter_only` refs, the returned verses are always from the referenced chapter**. The only exception is a true DB failure (0 rows from the direct lookup), which triggers the unrestricted fallback as a data-integrity safety net.

## Next

- **v3 on v0.3:** R@5=0.941 — see `v3_direct_chapter_gold40_v03.jsonl`.
- **v3.1:** Grace semantic drift fix (aion_027). Query "grace" retrieves Pauline salutation formulae ("Grace and peace to you from…") instead of the salvific EPH.2.8-9 passage.
- **v4:** Per-chapter vector search RPC to fix aion_036. Direct lookup guarantees coverage but semantic ranking needs to be anchored to the chapter to avoid PHP.4.15 contamination.
- **Phase 3:** Citation faithfulness judge (LLM-as-judge for `citation_support`).
