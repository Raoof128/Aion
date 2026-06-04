# Results

<!-- Status: REVISED 2026-06-04 -->

## 5.1 Main Results

**Table 1: v3 system on gold_40 v0.3 — overall metrics**

| Metric | Score |
|--------|-------|
| R@5 | 0.941 |
| MRR | 0.773 |
| Mean citation_support | 0.978 |
| Unsupported claim rate (cs < 0.5) | 0.000 |
| Decorative citation rate (cs ≤ 0.25) | 0.000 |
| False-premise / adversarial refusal | 1.000 (6/6) |

## 5.2 Per-Category Breakdown

**Table 2: Results by question category**

| Category | n | R@5 | MRR | citation_support | fp_refusal |
|----------|---|-----|-----|-----------------|------------|
| direct | 10 | 1.000 | 1.000 | 1.000 | — |
| interpretive | 7 | 1.000 | 0.929 | 1.000 | — |
| thematic | 12 | 0.917 | 0.524 | 0.979 | — |
| multi_hop | 5 | 0.800 | 0.700 | 0.900 | — |
| false_premise | 4 | — | — | — | 1.000 |
| adversarial | 2 | — | — | — | 1.000 |

Three observations:

**Direct and interpretive categories are solved.** R@5=1.00 and citation_support=1.00 for all 17 questions in these categories. The correct verse appears in the top-5 retrieved set for every direct and interpretive question. MRR=0.929 for interpretive (vs 1.000 for direct) reflects one question (aion_006) where the correct verse was retrieved but ranked second rather than first; no citation failure resulted because the model still cited it faithfully.

**Thematic and multi_hop categories contain the remaining retrieval failures.** Two questions fail R@5: aion_027 (thematic, grace semantic drift — salutation formulas retrieved instead of EPH.2.8-9) and aion_036 (multi_hop, IVFFlat boundary — PHP.4.6 and MAT.6.25 inconsistently absent from semantic results). Citation faithfulness is still high for these categories (cs=0.979 thematic, cs=0.900 multi_hop) — the system uses retrieved verses faithfully even when retrieval returned suboptimal content. For aion_027 specifically, the system retrieved salutation verses (EPH.4.7, 2TH.1.2) and cited them faithfully in the answer; citation_support=1.00 for that row because the judge scored faithfulness to the retrieved content, not to the ideal content. This is the retrieval-faithfulness split in action: R@5=0 but cs=1.00.

**MRR=0.773 versus R@5=0.941.** The gap reflects cases where the correct verse is retrieved but not ranked first. For a citation system where the answer model prioritizes top-ranked context, verse rank matters independently of whether the verse was retrieved at all.

**False-premise and adversarial robustness is perfect.** All six refusal-category questions scored 1. The system correctly identified verses that do not exist, misattributed quotes, and requests to fabricate scripture. No fabricated content appeared in any answer.

## 5.3 Benchmark Progression (v1 → v3)

**Table 3: Retrieval performance across system versions**

| System | Dataset | R@5 | MRR | Notes |
|--------|---------|-----|-----|-------|
| v1 hybrid-ref | v0.1 | 0.676 | 0.552 | Baseline; chapter-only parser gap |
| v2 chapter-ref | v0.2 | 0.882 | 0.700 | Chapter parser added; annotation expansion |
| v3 direct-chapter | v0.2 | 0.882 | 0.714 | Architecture change; same dataset |
| v3 direct-chapter | v0.3 | **0.941** | **0.773** | Annotation expansion for aion_023/033 |

v3 on v0.2 vs v2 on v0.2 (same dataset, different architecture): R@5 holds at 0.882. The architecture change fixes aion_035 (multi-hop, Psalm 23 + John 10) but exposes aion_036 as an accidental success in v2, where an unrestricted semantic fallback happened to retrieve PHP.4.6 by chance.

## 5.4 Sub-1.0 Rows

Two rows scored below citation_support=1.0. Both are documented fully in `research/results/phase3_citation_faithfulness_gold40_v03_failures.md`.

- **aion_021** (thematic, cs=0.75): EPH.6.19 cited for gratitude context; that verse records Paul requesting prayer for his ministry, not a general statement about thankfulness. Minor over-reach.
- **aion_035** (multi_hop, cs=0.50): JHN.10.1 cited instead of JHN.10.11. The per-chapter guarantee adds the first verse of JHN.10 (thieves and robbers at the gate) rather than the theologically central verse (JHN.10.11: "I am the good shepherd"). R@5=1 for this question because PSA.23.1 is retrieved correctly — this is a multi-hop question and one hop succeeds. The R@5 metric scores the full question as passing while the JHN.10 citation in the answer is wrong. This is the strongest case for the retrieval-faithfulness split: R@5=1, cs=0.50.

Both failures share a root cause — retrieval granularity — and are addressed by the v4 per-chapter vector search RPC described in Section 6.
