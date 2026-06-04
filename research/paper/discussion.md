# Discussion

<!-- Status: REVISED 2026-06-04 -->

## 6.1 The Retrieval-Faithfulness Split

The central finding is that retrieval correctness and citation faithfulness are separable, and they fail independently in both directions.

**aion_035** is the clearest case: R@5=1 (PSA.23.1 retrieved correctly), cs=0.50 (JHN.10.1 cited instead of JHN.10.11). The correct chapter was retrieved. The answer model cited the wrong verse within it. A retrieval metric scores this as a pass while a faithfulness judge scores it as a partial failure.

**aion_027** is the complementary case: R@5=0 (salutation formulas retrieved instead of EPH.2.8-9), cs=1.00 (the system faithfully cited the verses it retrieved). Retrieval failed; citation was faithful to whatever was retrieved.

The split has a direct implication for evaluation design: R@5 alone cannot detect aion_035-style failures; citation_support alone cannot detect aion_027-style failures. Both are necessary. This paper's results support the positive side — the current system does not exhibit faithfulness failures independent of retrieval scope — but the metrics remain logically independent and a modified system (e.g., one with better retrieval but a more liberal citation policy) could regress on either without the other detecting it.

The Phase 3 evaluation protocol combines both metrics specifically to catch failures of each type.

## 6.2 Failure Taxonomy

All remaining failures fall into one of three classes:

| Class | Example | Fix |
|-------|---------|-----|
| Semantic drift | aion_027: "grace" → salutation formulas | Thematic query expansion + salutation penalty (v3.1) |
| IVFFlat boundary | aion_036: PHP.4.6 inconsistently absent | Per-chapter vector search RPC (v4) |
| Per-chapter guarantee wrong verse | aion_035: JHN.10.1 vs JHN.10.11 | Per-chapter vector search RPC (v4) |

None of these is a citation misuse failure. In every case where retrieval returned relevant content, the answer model cited it faithfully.
All three failure classes are retrieval scope problems. Citation behavior is not the bottleneck.

## 6.3 Pathways from the Failure Taxonomy

aion_035 and aion_036 share a root cause: the per-chapter guarantee and IVFFlat search both operate at chapter granularity but not at verse-within-chapter granularity.

The fix is a `search_verses_in_chapter(query_embedding, book_id, chapter, k)` Supabase RPC that runs constrained vector search within a single chapter.
For JHN.10, a query embedding for "God as shepherd" would rank JHN.10.11 ("I am the good shepherd, the good shepherd lays down his life for the sheep") above JHN.10.1.
The per-chapter guarantee becomes the top result of this per-chapter search, not the chapter's first verse.
The specification is fully determined by the failure analysis — implementation requires no new research, only the RPC and updated retrieval logic.

## 6.4 The aion_027 Grace Drift

"Grace" in Pauline letters occupies two distinct semantic neighborhoods: salvific grace (EPH.2.8-9: "For by grace you have been saved through faith") and epistolary grace (EPH.4.7, 2TH.1.2, EPH.1.2: greeting and benediction formulas of the form "Grace and peace to you...").
The embedding space is dominated by the epistolary cluster — these short, formulaic verses have embeddings closer to the unqualified query "grace" than the longer salvific passage.

v3.1 should test two approaches:
1. Query expansion: prepend "saved by" or "salvation" to the thematic grace query at retrieval time.
2. Salutation suppression: add a post-retrieval filter that penalizes verses matching the pattern `Grace and peace to you from X`.

The second approach is more targeted, but the first is simpler and more transferable to other semantic drift cases.

## 6.5 Benchmark Validity Considerations

We constructed gold_40 v0.3 with knowledge of the v1 system's failure modes. Category distribution was chosen to stress-test those failure modes, not to reflect the distribution of questions real users ask. Three consequences follow:

1. The benchmark likely overrepresents cases where the retrieval architecture has visible failure modes. Real R@5 on a random sample of user queries may be higher.
2. The 40-question pilot has high variance. A single question represents 2.5% of the overall score. Results should not be interpreted with more precision than ±0.025.
3. The false-premise and adversarial categories (6 questions) are too small for confident generalization. The 1.000 refusal rate is encouraging but not definitive.

Future work should expand the benchmark to 200+ questions sampled from real user queries, with adversarial category size ≥20.
