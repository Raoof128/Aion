# Conclusion

<!-- Status: DRAFT -->

We introduced Aion-BibleQA, a 40-question benchmark for citation-faithfulness and false-premise robustness in verse-grounded Bible RAG.
Our v3 retrieval system — combining exact verse lookup, direct chapter-aware database queries, and hybrid semantic re-ranking — achieves R@5=0.941 on gold_40 v0.3.
A Gemini LLM-as-judge evaluation shows mean citation_support=0.978, zero unsupported or decorative citations, and a 1.000 false-premise/adversarial refusal rate across 6 refusal-category questions.

The main finding is that retrieval and citation faithfulness are distinct failure modes.
Once the right verses reach the context window, the system uses them correctly.
The remaining errors — semantic drift in thematic queries, IVFFlat boundary effects in multi-hop retrieval, and within-chapter verse selection — are retrieval scope problems, not faithfulness problems.

This separation gives a clear engineering agenda for future work:
- v3.1: thematic query expansion and salutation-formula suppression to fix grace semantic drift
- v4: per-chapter vector search RPC to fix within-chapter verse selection

On the evaluation side, human annotation of a judge-scored sample and expansion of the benchmark to 200+ questions sampled from real users are the most important next steps before the results can support confident claims about production system behavior.

Aion-BibleQA, the retrieval system, the judge harness, and all benchmark artefacts are released with this paper.
