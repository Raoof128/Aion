# Abstract

<!-- Target venue: arXiv preprint / NeurIPS workshop / ACL workshop -->
<!-- Status: REVISED 2026-06-04 — model names verified, Lima BibTeX added -->

We introduce **Aion-BibleQA**, a 40-question pilot benchmark for evaluating citation faithfulness and false-premise robustness in verse-grounded Bible retrieval-augmented generation (RAG).
Existing RAG evaluations measure whether the right document was retrieved, but not whether the system uses retrieved content faithfully — a gap that matters acutely in scripture attribution, where citing the wrong verse within a correct chapter produces an answer that sounds authoritative but misattributes the text.
We build a layered retrieval pipeline — exact verse lookup, direct chapter-aware database queries, per-chapter coverage guarantees, and hybrid semantic re-ranking — and evaluate it with two complementary metrics: Recall@5 (R@5) for retrieval coverage, and citation_support (an LLM-as-judge score, 0–1) for answer faithfulness.
On gold_40 v0.3, our v3 system achieves R@5=0.941, mean citation_support=0.978, zero unsupported or decorative citations, and a false-premise/adversarial refusal rate of 1.000 (6/6).
Failure analysis shows that remaining errors trace to retrieval scope — semantic drift in thematic queries and within-chapter verse selection — not to citation misuse, establishing retrieval and faithfulness as separable failure modes in Bible RAG systems.
Aion-BibleQA, the judge harness, and all benchmark artifacts are publicly released at \url{https://github.com/Raoof128/Aion}.
