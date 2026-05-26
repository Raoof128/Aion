# Abstract

<!-- Target venue: arXiv preprint / NeurIPS workshop / ACL workshop -->
<!-- Status: DRAFT — citations marked [CITE] require verification -->

We introduce **Aion-BibleQA**, a 40-question pilot benchmark for evaluating citation faithfulness and false-premise robustness in verse-grounded Bible retrieval-augmented generation (RAG).
Existing RAG evaluations measure whether the right document was retrieved, but not whether the system actually uses retrieved content faithfully in its answer — a gap that matters most when user trust depends on accurate scripture attribution.
We build a layered retrieval pipeline that combines exact verse lookup, chapter-aware database queries, numeric keyword suppression, and hybrid semantic ranking, and evaluate it with two complementary metrics: Recall@5 (R@5) for retrieval coverage, and citation_support (an LLM-as-judge score, 0–1) for answer faithfulness.
On gold_40 v0.3, our v3 system achieves R@5=0.941, mean citation_support=0.978, zero unsupported or decorative citations, and a false-premise/adversarial refusal rate of 1.000 (6/6).
Our failure analysis shows that the dominant remaining errors trace to retrieval scope — semantic drift in thematic queries and within-chapter verse selection — not to citation misuse, establishing that retrieval and faithfulness are separable failure modes in Bible RAG systems.
