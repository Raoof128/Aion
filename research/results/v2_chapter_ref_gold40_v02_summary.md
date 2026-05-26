# v2 chapter-ref — gold_40 v0.2 Benchmark Summary

**Date:** 2026-05-26
**System:** v2 hybrid_rag (chapter-aware parser + numeric keyword suppression)
**Dataset:** `aion_bibleqa_gold_40_v0.2.jsonl` (40 Qs, expanded clusters)

## Overall Results

| Metric      | v1 on v0.1 | v1 on v0.2 (annot. only) | **v2 on v0.2** |
|-------------|------------|--------------------------|----------------|
| Recall@5    | 0.676      | 0.853 (+0.177)           | **0.882 (+0.029)** |
| Precision@5 | —          | —                        | 0.253          |
| MRR         | —          | —                        | 0.700          |
| Scored / N  | 29 / 40    | 29 / 29                  | 34 / 34        |
| Errors      | 0          | 0                        | 0              |

> Annotation-only gain (v0.1→v0.2 clusters): +0.177  
> System v2 gain (chapter parser + keyword fix): +0.029  
> Cumulative gain since v1 baseline: +0.206

## By Category

| Category     | n  | Recall@5 | Precision@5 | MRR  |
|--------------|-----|----------|-------------|------|
| direct       | 10  | 1.00     | 0.22        | 1.00 |
| interpretive | 7   | 0.86     | 0.26        | 0.79 |
| multi_hop    | 5   | 0.80     | 0.32        | 0.60 |
| thematic     | 12  | 0.83     | 0.25        | 0.44 |
| false_premise | 4  | N/A      | N/A         | N/A  |
| adversarial  | 2   | N/A      | N/A         | N/A  |

*false_premise and adversarial are not scored for retrieval (no gold verses).*

## Failures (n=4)

| ID        | Category     | Root cause label              |
|-----------|--------------|-------------------------------|
| aion_023  | thematic     | `gold_too_narrow`             |
| aion_027  | thematic     | `semantic_drift`              |
| aion_033  | interpretive | `gold_too_narrow` (within-chapter miss) |
| aion_035  | multi_hop    | `chapter_filter_miss`         |

See `v2_chapter_ref_gold40_v02_failures.md` for details.

## Key Findings

- **Direct refs are solved** (R@5=1.00, MRR=1.00) — verse-level parser is exact.
- **Chapter-ref path works for most cases** — aion_033 retrieved 1CO.15 verses correctly; gold wants vv.42,52 specifically.
- **Multi-hop chapter miss (aion_035):** "Psalm 23 and John 10" — broad semantic search for "shepherd" returned shepherd verses from other books (MIC, ISA, PSA.95/100/136) rather than from PSA.23 or JHN.10. Chapter filter found no matches → fell back to unrestricted semantic results. Fix: direct chapter DB lookup rather than semantic filter.
- **Thematic semantic drift (aion_027):** Query "grace" matches salutation formulas ("Grace and peace to you") instead of the salvific EPH.2.8-9 passage. v3 fix.
- **Thematic gold_too_narrow (aion_023):** Retrieved valid strength verses (2TI.1.7, EPH.1.19) but gold pinned to PHP.4.13 and ISA.40.31. Clusters may need expansion.

## Next

- **v2.1:** aion_023 cluster expansion (add PHP.4.13/ISA.40.31 acceptable cluster); keep aion_027 and aion_033 as open issues.
- **v3:** Fix aion_035 chapter_filter_miss with direct DB chapter lookup (no semantic fallback for chapter refs with `chapter_only=true`).
- **v3.1:** Semantic drift fix for salutation-vs-theological "grace" disambiguation.
