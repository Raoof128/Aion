# Aion Research

**Project:** Aion-BibleQA-Faithfulness  
**Framing:** Benchmark and evaluation framework for citation faithfulness and false-premise robustness in verse-grounded Bible RAG.

## Reproduce the reported numbers (offline)

The frozen run outputs in `results/` are the canonical artefacts. These commands recompute every headline number from them with no API keys and no network access (run `npm ci` first):

```bash
npm run research:metrics -- research/results/v3_direct_chapter_gold40_v03.jsonl   # R@5=0.941, MRR=0.773
npm run research:judge-report                                                     # citation_support=0.978, refusal 6/6
npm run research:metrics -- research/results/v2_chapter_ref_gold40_v02.jsonl      # earlier rows of the progression table
```

`tests/research-metrics.test.ts` covers the retrieval-metric functions and runs as part of `./check.sh`.

## Re-run live (needs credentials)

`run-benchmark.ts` calls the deployed Edge Function and `judge-citation*.ts` call model APIs, so they need a `.env` (see `.env.example`). Live reruns can differ from the frozen files near the IVFFlat rank boundary; see the paper's Limitations.

```bash
npm run research:benchmark -- --dataset research/datasets/aion_bibleqa_gold_40_v0.3.jsonl --out research/results/raw_runs.jsonl
npm run research:judge     # Gemini citation judge
```

## Folder structure

```
datasets/   — JSONL benchmark files (v0.1, v0.2, v0.3)
harness/    — TypeScript runner and metrics
judges/     — LLM-as-judge prompts (Phase 3)
results/    — frozen run outputs + artefact markdown
```

## Benchmark progression

| System | Dataset | R@5   | Notes |
|--------|---------|-------|-------|
| v0 baseline | stub_10 | 0.286 | Pure hybrid RAG, no reference resolver |
| v1 hybrid_ref | stub_10 | 0.571 | Reference-aware exact lookup |
| v1 hybrid_ref | gold_40 v0.1 | 0.676 | Full 40-question run |
| v2 chapter_ref | gold_40 v0.2 | 0.882 | Chapter-aware parser + numeric keyword suppression |
| v3 direct_chapter | gold_40 v0.2 | 0.882 | Direct DB chapter lookup; aion_035 fixed, aion_036 lost accidental rescue |
| v3 direct_chapter | gold_40 v0.3 | 0.941 | Annotation cluster expansion for aion_023 + aion_033 |

The step from 0.676 to 0.882 is mostly an annotation change, not a system change: `results/v2_chapter_ref_gold40_v02_summary.md` attributes +0.177 to the v0.1 → v0.2 cluster expansion and +0.029 to the v2 system.

## Known issues in preprint v1.0

Found in a November 2026 review of the paper against the committed artefacts. They do not change the headline numbers, and they will be corrected in the next version of the preprint.

- **Development set, not held-out.** The same 40 questions drove v1 to v3, and accepted clusters were widened after looking at system output. The Limitations section should say so.
- **The v1 → v2 jump is mostly annotation.** The paper's progression table scores v1 on v0.1 gold and v2 and v3 on v0.2 gold, and credits annotation only for the v0.3 step. See the note above.
- **"Top-5 verses" in context.** The chat function passes up to six verses to the model (20 of the 40 frozen rows have six). Recall@5 is computed over the first five.
- **"6/6 false-premise refusals"** in the abstract is four false-premise questions plus two adversarial ones, as the Results section says.
- **`aion_034`.** The paper says it passes Recall@5 because JAS.2.17 was retrieved. The frozen row's retrieved list is `2CO.1.24, JAS.2.14, GAL.3.2, JUD.1.1, GAL.3.5, 1TH.1.3`; it passes through the cluster members JAS.2.14 and GAL.3.2.
- **Single annotator.** There is no inter-annotator agreement figure, and some dataset notes still say "needs verification" on rows marked verified.

## Dataset schema version: 0.3

### v0.1 (baseline)
40 questions, gold verses manually verified against `bible_verses`.

### v0.2 (cluster expansion)
6 questions patched with `acceptable_verse_clusters` for valid verses the v1 system retrieved but weren't annotated (love, peace, fear, anxiety, faith/works).

### v0.3 (current)
aion_023 (strength) and aion_033 (resurrection) clusters expanded based on v3 failure analysis. aion_027 (grace) deliberately not patched — salutation drift is a real retrieval failure.

## Phase 3 Citation-Faithfulness Results

| Metric | Score |
|--------|-------|
| Mean citation_support | 0.978 |
| Unsupported claim rate (cs < 0.5) | 0.000 |
| Decorative citation rate (cs ≤ 0.25) | 0.000 |
| False-premise / adversarial refusal | 1.000 (6/6) |

Judge: `gemini-3.1-flash-lite`. Harness: `research/harness/judge-citation.ts`.  
Canonical artefacts: `research/results/phase3_citation_faithfulness_gold40_v03.jsonl` + `_summary.md` + `_failures.md`.

## Open failures

| ID | Category | Root cause | Fix version |
|----|----------|------------|-------------|
| aion_027 | thematic | `semantic_drift` — "grace" retrieves Pauline salutations (EPH.4.7, 2TH.1.2) instead of EPH.2.8-9 | v3.1 |
| aion_035 | multi_hop | `per_chapter_guarantee_wrong_verse` — JHN.10.1 guaranteed instead of JHN.10.11 | v4 |
| aion_036 | multi_hop | `IVFFlat_boundary` — PHP.4.6 + MAT.6.25 inconsistently absent | v4 (per-chapter vector RPC) |

## Cross-family judge (paper, Multi-Judge Robustness section)

The paper reports a second judge (OpenAI `gpt-4.1`, identical rubric) over all 40 rows: exact agreement 31/40, within one rubric step 40/40, unsupported rate 0.000 and refusals 6/6 under both judges. Harness: `harness/judge-citation-gpt.ts`; agreement report: `npm run research:multijudge`.

**Artefact status:** the raw GPT judge output (`results/gpt_judge_all40_v03.jsonl`) was excluded by an earlier `.gitignore` rule and is not yet in the repository, so this table cannot currently be recomputed offline. To regenerate it: `GPT_JUDGE_ALL=1 npx tsx --env-file .env research/harness/judge-citation-gpt.ts`. A third judge harness (`judge-citation-claude.ts`) is included but has not been run.

## Paper

- **Canonical version:** `paper/latex/acl_latex.tex` and the compiled `paper/latex/acl_latex.pdf` (8 pages, ACL format), published as DOI [10.5281/zenodo.20522874](https://doi.org/10.5281/zenodo.20522874).
- `paper/*.md` are the earlier section-by-section drafts and predate the multi-judge section and the final audit. Where they differ from the LaTeX, the LaTeX is correct.

Title: *Aion-BibleQA: Evaluating Retrieval and Citation Faithfulness in Verse-Grounded Bible RAG Systems*
