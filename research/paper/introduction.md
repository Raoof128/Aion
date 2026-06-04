# Introduction

<!-- Status: REVISED 2026-06-04 — all citations resolved -->

A user who asks "What does John 3:16 say about love?" expects the system to cite John 3:16, not a topically adjacent verse.
If the system retrieves the right chapter but cites the wrong verse within it, the answer sounds correct while misattributing scripture — a failure invisible to standard retrieval metrics.
Bible RAG makes this problem concrete: a system can score R@5=1 while citing the wrong verse within the retrieved chapter.

Retrieval-augmented generation \cite{lewis2020rag} has become the dominant architecture for knowledge-intensive question answering.
Standard RAG evaluation measures whether the retrieval step returned relevant documents (Recall@k, MRR) and whether the final answer matches a reference (BLEU, BERTScore, exact match).
Neither family of metrics captures whether the system used the retrieved content correctly.
A system can score R@5=1 while citing the retrieved passage for a claim it does not support.

We call this gap the **retrieval-faithfulness split**: retrieval correctness and citation faithfulness are distinct failure modes that require separate measurement.

This paper makes four contributions and reports one key empirical finding:

1. **Aion-BibleQA**, a 40-question benchmark with gold verse annotations across six categories (direct, interpretive, thematic, multi-hop, false-premise, adversarial) designed to stress-test both retrieval and faithfulness, released publicly at \url{https://github.com/Raoof128/Aion}.
2. A **layered retrieval architecture** (exact verse lookup → chapter-aware DB query → per-chapter coverage guarantee → hybrid semantic re-ranking) that achieves R@5=0.941 on the benchmark.
3. A **Bible-specific judge rubric** extending LLM-as-judge evaluation \cite{es2023ragas} with two scripture-attribution metrics: citation_support (0–1) measuring how faithfully retrieved verses appear in answers, and false_premise_refusal (0/1) for adversarial robustness.
4. **Empirical results** on gold_40 v0.3: R@5=0.941, mean citation_support=0.978, unsupported claim rate=0.000, false-premise/adversarial refusal rate=1.000.

**Finding:** retrieval scope and citation faithfulness are separable failure modes. A system can retrieve the right chapter while citing the wrong verse within it, scoring R@5=1 with citation_support=0.50. The engineering agenda follows from this separation: improving retrieval scope will improve answer quality; citation behavior requires independent measurement but is not the current bottleneck.

## Paper structure

Section 2 covers related work.
Section 3 describes the Aion retrieval architecture.
Section 4 defines the benchmark and evaluation protocol.
Section 5 reports results.
Section 6 discusses the retrieval-faithfulness split and open failures.
Section 7 states limitations.
Section 8 concludes.
