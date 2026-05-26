# Phase 3 Citation-Faithfulness Judge — Summary

**Date:** 2026-05-26  
**System:** v3 direct-chapter  
**Dataset:** `aion_bibleqa_gold_40_v0.3.jsonl` (40 Qs)  
**Input run:** `v3_direct_chapter_gold40_v03.jsonl`  
**Output:** `v3_direct_chapter_gold40_v03_judged.jsonl`  
**Judge model:** `gemini-3.1-flash-lite`  
**Judged:** 40 / 40 | Errors: 0

---

## Overall Results

| Metric | Score |
|--------|-------|
| **Mean citation_support** | **0.978** |
| Unsupported claim rate (cs < 0.5) | 0.000 |
| Decorative citation rate (cs ≤ 0.25) | 0.000 |
| **False-premise / adversarial refusal** | **1.000** (6/6) |

## By Category

| Category | n | R@5 | citation_support | fp_refusal |
|---|---|---|---|---|
| direct | 10 | 1.00 | 1.000 | — |
| interpretive | 7 | 1.00 | 1.000 | — |
| thematic | 12 | 0.92 | 0.979 | — |
| multi_hop | 5 | 0.80 | 0.900 | — |
| false_premise | 4 | — | — | 1.000 |
| adversarial | 2 | — | — | 1.000 |

## Flagged Rows (cs < 1.0)

### aion_021 — thematic | cs=0.75

**Question:** What does the Bible say about gratitude?  
**Issue:** The final sentence incorrectly cites Ephesians 6:19 as support for the general practice of thanking God for others; that verse specifically refers to Paul asking for prayer for his own ministry. Minor over-reach on one citation out of several.

### aion_035 — multi_hop | cs=0.50

**Question:** How do Psalm 23 and John 10 describe God as shepherd?  
**Issue:** The answer correctly cites Psalm 23:1 (gold verse, retrieved via per-chapter guarantee), but incorrectly attributes the shepherd role to John 10:1 — that verse describes thieves and robbers approaching via the gate, not the shepherd himself. The system retrieved JHN.10.1 as the per-chapter guarantee verse (first verse of JHN.10) but JHN.10.11 ("I am the good shepherd") is the theologically correct citation and is the gold verse. This is the same aion_035 that v3 "fixed" for retrieval (R@5=1 because PSA.23.1 is now returned), but the Gemini answer cited the wrong JHN.10 verse, producing a citation faithfulness failure.

## Key Findings

1. **Citation faithfulness is strong** — cs=0.978 mean with zero unsupported or decorative citations. The retrieved verses are faithfully used in answers.

2. **False-premise / adversarial robustness is perfect** — 6/6 refusals. The system correctly identifies and refuses fabricated verse requests and false attribution queries.

3. **aion_035 reveals a new failure mode**: retrieval R@5=1 (PSA.23.1 retrieved ✓), but the answer cited JHN.10.1 (thieves/robbers) instead of JHN.10.11 (good shepherd). The per-chapter guarantee adds the *first verse of the chapter*, which for JHN.10 is not the theologically central verse. This is a **retrieval-faithfulness gap**: correct chapter, wrong verse within the chapter, leads to a citation mismatch in the answer.

4. **R@5 and citation_support are complementary** — aion_027 (grace, R@5=0 retrieval failure) scores cs=1.00 because the *retrieved* salutation verses (EPH.4.7, 2TH.1.2…) are faithfully cited in the answer. The answer is faithful to what was retrieved; the problem is *what* was retrieved, not how it was used.

## Paper-Ready Claim (Phase 3 Addition)

> Across the gold_40 benchmark, Aion's v3 system achieves mean citation_support of 0.978 with zero unsupported or decorative citations, and correctly refuses all 6 false-premise and adversarial queries (refusal rate = 1.000). Combined with Recall@5 = 0.941, these results show that verse-grounded Bible RAG can simultaneously retrieve the right verses and use them faithfully — the dominant failure mode is retrieval scope (which verses are in the context), not citation faithfulness.

## Next

- **aion_035 fix (v4):** Per-chapter vector search to surface JHN.10.11 ("good shepherd") rather than JHN.10.1 ("thieves and robbers") as the per-chapter guarantee verse.
- **aion_027 (v3.1):** Semantic drift fix so that "grace" retrieves EPH.2.8-9 rather than salutation formulas.
- **Phase 4 (optional):** Multi-judge agreement / inter-rater reliability if the paper requires it.
