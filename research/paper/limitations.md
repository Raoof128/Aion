# Limitations

<!-- Status: DRAFT -->

**LLM-as-judge and same-model family.** The citation-faithfulness scores come from a Gemini judge evaluating Gemini-generated answers. Same-family judges tend to be lenient toward outputs from the same model (Zheng et al., 2023). The true citation_support may be lower than 0.978 under a human annotator or a cross-family judge. Future work should validate a sample of judgments against human ratings.

**Pilot benchmark size.** gold_40 v0.3 is 40 questions. Statistical uncertainty is high — one question is 2.5% of R@5. Results in the multi_hop category (n=5) and adversarial category (n=2) are especially noisy. Confidence intervals are not reported; with n=5, a 95% CI on multi_hop R@5=0.800 would span roughly ±0.30.

**Constructed benchmark, not user-sampled.** Questions were written by the development team to target known failure modes, not sampled from real users. The distribution of categories (30% thematic, 25% direct, 17.5% interpretive) reflects stress-testing priorities rather than user query distribution. Real-world R@5 may differ substantially.

**Single translation (BSB).** All verses come from the Berean Standard Bible. Results may not generalize to systems using KJV, NIV, ESV, or other translations, where verse wording differs and embeddings would shift accordingly.

**IVFFlat non-determinism.** The IVFFlat index used for approximate nearest-neighbor search is non-deterministic near its rank boundary. Across three repeated runs of v3 on gold_40 v0.2, three questions showed R@5 variance: aion_006 (interpretive, 2/3 runs pass), aion_007 (multi_hop, 2/3 runs pass), and aion_036 (multi_hop, 1/3 runs pass). Run-to-run R@5 ranged from 0.853 to 0.882 on the same question set and system. The main benchmark runs (v2 on v0.2, v3 on v0.3) were each performed once and frozen as canonical JSONL artefacts; results are reproducible from those frozen files. Live rerunning may produce different retrieval lists for boundary cases.

**No ablation study.** The paper reports v3 as a whole system. Individual contributions of each retrieval layer (exact lookup, chapter-aware query, per-chapter guarantee, semantic re-ranking) are not isolated. The v1→v2→v3 progression provides coarse evidence that each change improved performance, but without controlled ablation the relative contribution of each component is not quantified.
