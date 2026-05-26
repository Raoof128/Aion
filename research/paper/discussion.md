# Discussion

<!-- Status: DRAFT -->

## 6.1 The Retrieval-Faithfulness Split

The central finding is that retrieval correctness and citation faithfulness are separable.
Table 2 shows this directly: multi_hop R@5=0.800, but multi_hop citation_support=0.900.
A system can retrieve the wrong verse (R@5=0) yet still faithfully use whatever it retrieved (cs=1.00) — aion_027 illustrates this.
Conversely, a system can achieve R@5=1 while citing the wrong verse within a chapter (cs=0.50) — aion_035 illustrates this.

This split has a practical implication: improving retrieval scope will improve answer quality, but faithfulness must be measured independently.
Systems that score high on R@5 alone may still misuse retrieved content in their answers.
Systems that score high on citation_support alone may faithfully cite irrelevant verses.

The right evaluation combines both, as the Phase 3 protocol does.

## 6.2 Failure Taxonomy

All remaining failures fall into one of three classes:

| Class | Example | Fix |
|-------|---------|-----|
| Semantic drift | aion_027: "grace" → salutation formulas | Thematic query expansion + salutation penalty (v3.1) |
| IVFFlat boundary | aion_036: PHP.4.6 inconsistently absent | Per-chapter vector search RPC (v4) |
| Per-chapter guarantee wrong verse | aion_035: JHN.10.1 vs JHN.10.11 | Per-chapter vector search RPC (v4) |

None of these is a citation misuse failure. In every case where retrieval returned relevant content, the answer model cited it faithfully.
The engineering agenda is clear: improve what is retrieved, not how it is cited.

## 6.3 What v4 Must Do

aion_035 and aion_036 share a root cause: the per-chapter guarantee and IVFFlat search both operate at chapter granularity but not at verse-within-chapter granularity.

The v4 fix is a `search_verses_in_chapter(query_embedding, book_id, chapter, k)` Supabase RPC that runs constrained vector search within a single chapter.
For JHN.10, a query embedding for "God as shepherd" would rank JHN.10.11 ("I am the good shepherd, the good shepherd lays down his life for the sheep") above JHN.10.1.
The per-chapter guarantee becomes the top result of this per-chapter search, not the chapter's first verse.

This is a well-defined engineering task, not a research open question.

## 6.4 The aion_027 Grace Drift

"Grace" in Pauline letters has two semantic neighbourhoods: salvific grace (EPH.2.8-9: "For by grace you have been saved through faith") and epistolary grace (EPH.4.7, 2TH.1.2, EPH.1.2: greeting/benediction formulas of the form "Grace and peace to you...").
The current semantic search surface is dominated by the epistolary cluster — these short, formulaic verses have embeddings closer to the unqualified query "grace" than the longer salvific passage.

v3.1 should test two approaches:
1. Query expansion: prepend "saved by" or "salvation" to the thematic grace query at retrieval time.
2. Salutation suppression: add a post-retrieval filter that penalises verses matching the pattern `Grace and peace to you from X`.

The second approach is more targeted, but the first is simpler and more transferable to other semantic drift cases.

## 6.5 Benchmark Validity Considerations

gold_40 v0.3 was constructed by the same team that built the retrieval system.
Category distribution was chosen to stress-test known failure modes from v1.
The benchmark is a pilot, not a random sample of Bible questions users ask.

Three consequences:

1. The benchmark likely overrepresents cases where the retrieval architecture has visible failure modes. Real R@5 on a random sample of user queries may be higher.
2. The 40-question pilot has high variance. A single question represents 2.5% of the score. Results should not be interpreted with more precision than ±0.025.
3. The false-premise and adversarial categories (6 questions) are too small for confident generalization. The 1.000 refusal rate is encouraging but not definitive.

Future work should expand the benchmark to 200+ questions sampled from real user queries, with adversarial category size ≥20.
