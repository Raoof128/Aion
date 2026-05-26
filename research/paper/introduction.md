# Introduction

<!-- Status: DRAFT — citations marked [CITE] require verification -->

Bible study applications present a sharper faithfulness problem than most RAG domains.
A user who asks "What does John 3:16 say about love?" expects the system to cite John 3:16, not a topically adjacent verse.
If the system retrieves the right chapter but cites the wrong verse within it, the answer may sound correct while misattributing scripture — a failure invisible to standard retrieval metrics.

Retrieval-augmented generation [CITE: Lewis et al., 2020] has become the dominant architecture for knowledge-intensive question answering.
Evaluation typically measures whether the retrieval step returned relevant documents (Recall@k, MRR) and whether the final answer matches a reference (BLEU, BERTScore, exact match).
Neither metric captures whether the system actually used the retrieved content correctly.
A system can score R@5=1 while citing the retrieved passage for a claim it does not support.

We call this gap the **retrieval-faithfulness split**: retrieval correctness and citation faithfulness are distinct failure modes that require separate measurement.

This paper makes five contributions:

1. **Aion-BibleQA**, a 40-question benchmark with gold verse annotations across six categories (direct, interpretive, thematic, multi-hop, false-premise, adversarial) designed to stress-test both retrieval and faithfulness.
2. A **layered retrieval architecture** (exact verse lookup → chapter-aware DB query → per-chapter coverage guarantee → hybrid semantic re-ranking) that achieves R@5=0.941 on the benchmark.
3. A **citation-faithfulness evaluation protocol** using an LLM-as-judge to score how faithfully retrieved verses appear in generated answers, producing a citation_support score (0–1) and a false_premise_refusal flag (0/1).
4. **Empirical results** on gold_40 v0.3: R@5=0.941, mean citation_support=0.978, unsupported claim rate=0.000, false-premise/adversarial refusal rate=1.000.
5. A **failure taxonomy** identifying retrieval scope (semantic drift, within-chapter verse selection) as the remaining bottleneck, not citation misuse.

The key finding is that once retrieval scope is correct, the system uses retrieved verses faithfully.
This cleanly separates the engineering agenda: improve what gets retrieved, not how it is cited.

## Paper structure

Section 2 covers related work.
Section 3 describes the Aion retrieval architecture.
Section 4 defines the benchmark and evaluation protocol.
Section 5 reports results.
Section 6 discusses the retrieval-faithfulness split and open failures.
Section 7 states limitations.
Section 8 concludes.
