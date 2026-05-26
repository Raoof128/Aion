# v1 Hybrid-Ref Gold40 Benchmark — Summary

**Date:** 2026-05-26  
**System:** hybrid_rag v1 (reference-aware — parseReferences + lookupByRefs before hybrid fallback)  
**Dataset:** `research/datasets/aion_bibleqa_gold_40.jsonl` (40 questions, all verified)  
**Output:** `research/results/v1_hybrid_ref_gold40.jsonl`

---

## Aggregate Results

| Metric      | Value |
| ----------- | ----- |
| Recall@5    | 0.676 |
| Precision@5 | 0.182 |
| MRR         | 0.552 |
| Avg latency | 1828ms |
| Scored      | 34 / 40 |
| Errors      | 0 / 40 |

*6 questions (false_premise × 4, adversarial × 2) have no gold verses — retrieval metrics N/A, reserved for Phase 3 judge.*

---

## By Category

| Category      | n  | R@5  | P@5  | MRR  | Notes |
| ------------- | -- | ---- | ---- | ---- | ----- |
| direct        | 10 | 1.00 | 0.22 | 1.00 | Perfect — reference parser resolves all explicit refs |
| thematic      | 12 | 0.58 | 0.13 | 0.32 | Main open problem — see failures |
| interpretive  | 7  | 0.57 | 0.23 | 0.50 | Mixed — 4 pass, 3 fail |
| multi_hop     | 5  | 0.40 | 0.16 | 0.30 | Weakest — chapter-ref gap hurts 3/5 |
| false_premise | 4  | N/A  | N/A  | N/A  | Phase 3 pending |
| adversarial   | 2  | N/A  | N/A  | N/A  | Phase 3 pending |

---

## Direct Category — All Pass ✅

All 10 direct questions scored R@5=1.00, MRR=1.00. The reference parser (`parseReferences`) resolves explicit `Book Chapter:Verse` patterns into exact `bible_verses` lookups before any semantic search runs. This is the v1 fix that moved direct R@5 from 0.00 → 1.00.

---

## Thematic Category — 7 Pass, 5 Fail

| ID       | Question (short)             | Result | Failure pattern |
| -------- | ---------------------------- | ------ | --------------- |
| aion_003 | forgiveness                  | ✅ 1.00 | — |
| aion_004 | anxiety                      | ✅ 1.00 | — |
| aion_019 | love                         | ❌ 0.00 | acceptable_cluster_missing |
| aion_020 | faith                        | ✅ 1.00 | — |
| aion_021 | prayer                       | ✅ 1.00 | — |
| aion_022 | hope                         | ✅ 1.00 | — |
| aion_023 | strength                     | ❌ 0.00 | semantic_drift |
| aion_024 | peace                        | ❌ 0.00 | acceptable_cluster_missing |
| aion_025 | wisdom                       | ✅ 1.00 | — |
| aion_026 | joy                          | ✅ 1.00 | — |
| aion_027 | grace                        | ❌ 0.00 | semantic_drift |
| aion_028 | fear                         | ❌ 0.00 | acceptable_cluster_missing + semantic_drift |

---

## Interpretive Category — 4 Pass, 3 Fail

| ID       | Question (short)                          | Result | Failure pattern |
| -------- | ----------------------------------------- | ------ | --------------- |
| aion_005 | Romans 8 / predestination                 | ✅ 1.00 | — |
| aion_006 | Matthew 5 / non-violence                  | ❌ 0.00 | semantic_drift + acceptable_cluster_missing |
| aion_029 | Ecclesiastes 1 / meaninglessness          | ❌ 0.00 | reference_parser_gap |
| aion_030 | John 14:6 / exclusivism                   | ✅ 1.00 | — |
| aion_031 | James 2 vs Paul / faith alone             | ✅ 1.00 | — |
| aion_032 | Romans 6 / sin under grace                | ✅ 1.00 | — |
| aion_033 | 1 Corinthians 15 / bodily resurrection    | ❌ 0.00 | reference_parser_gap (catastrophic) |

---

## Multi-Hop Category — 2 Pass, 3 Fail

| ID       | Question (short)                                  | Result | Failure pattern |
| -------- | ------------------------------------------------- | ------ | --------------- |
| aion_007 | Matthew 6 + Ephesians 4 / forgiveness             | ✅ 1.00 | — |
| aion_034 | James 2 + Romans / faith and works                | ❌ 0.00 | acceptable_cluster_missing + retriever_miss |
| aion_035 | Psalm 23 + John 10 / shepherd                     | ❌ 0.00 | reference_parser_gap (catastrophic) |
| aion_036 | Philippians 4 + Matthew 6 / anxiety               | ❌ 0.00 | reference_parser_gap + acceptable_cluster_missing |
| aion_037 | John 3:16 + Romans 8:38-39 / love                 | ✅ 1.00 | — |

---

## Progression vs Previous Runs

| Run                  | Dataset  | n scored | R@5   | MRR   |
| -------------------- | -------- | -------- | ----- | ----- |
| v0 baseline          | stub_10  | 6        | 0.286 | 0.143 |
| v1 hybrid-ref        | stub_10  | 6        | 0.571 | 0.429 |
| **v1 hybrid-ref**    | **gold_40** | **34** | **0.676** | **0.552** |

Direct R@5 0.00 → 1.00 on stub_10 (2/2 direct questions) carries through to gold_40 (10/10 direct).

---

## Open Questions for v2 Design

1. **Chapter-ref parser gap** — 4 failures from chapter-only refs ("Psalm 23", "1 Corinthians 15"). Fix: extend parser to handle `Book N` as chapter ref and expand to all verses in that chapter, or use chapter-level lookup.
2. **Cluster expansion** — 4 failures where retrieved verses are valid but not annotated. Clusters need expansion for love (JHN.13.34), peace (ROM.12.18), faith/works (JAS.2.14), fear (MAT.10.28).
3. **Semantic drift on virtue terms** — "grace", "strength" retrieve adjacent-vocabulary verses (greeting salutations, "power" verses) rather than canonical teaching verses. Query expansion or book/theme lexicon may help.
