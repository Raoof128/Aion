# Conclusion

<!-- Status: REVISED 2026-06-04 -->

We introduced Aion-BibleQA, a 40-question benchmark for citation-faithfulness and false-premise robustness in verse-grounded Bible RAG.
Our v3 retrieval system — combining exact verse lookup, direct chapter-aware database queries, per-chapter coverage guarantees, and hybrid semantic re-ranking — achieves R@5=0.941 on gold_40 v0.3.
A gemini-3.1-flash-lite LLM-as-judge evaluation shows mean citation_support=0.978, zero unsupported or decorative citations, and a 1.000 false-premise/adversarial refusal rate across 6 refusal-category questions.

Retrieval correctness and citation faithfulness are distinct failure modes — the central result this work establishes.
When the right verses reach the context window, the system uses them correctly.
The remaining errors — semantic drift in thematic queries, IVFFlat boundary effects in multi-hop retrieval, and within-chapter verse selection — are retrieval scope problems, not faithfulness problems.

This separation gives a clear engineering agenda for future work:
- v3.1: thematic query expansion and salutation-formula suppression to fix grace semantic drift
- v4: per-chapter vector search RPC to fix within-chapter verse selection

On the evaluation side, two steps are needed before the results can support confident claims about production system behavior: human annotation of a random sample of judge-scored rows to validate the citation_support scores, and expansion of the benchmark to 200+ questions sampled from real users to replace the current stress-test distribution.

Aion-BibleQA, the retrieval system, the judge harness, and all benchmark artifacts are released at \url{https://github.com/Raoof128/Aion}.

The retrieval-faithfulness split identified here is not unique to Bible RAG. Any domain where attribution matters at fine granularity — medical literature, legal case law, academic citations — faces the same gap: standard retrieval metrics cannot detect cases where the system retrieved the right document but cited the wrong sentence within it. The evaluation protocol introduced here is transferable to those domains.
