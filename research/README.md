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

Two test files run as part of `./check.sh` and CI. `tests/research-metrics.test.ts` covers the retrieval-metric functions. `tests/research-headline-numbers.test.ts` recomputes every number on this page and in the top-level README from the frozen files, and fails if a table here stops matching them. See [Where each number comes from](#where-each-number-comes-from).

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
| v1 hybrid_ref | gold_40 v0.2 | 0.853 | The same v1 run rescored against v0.2 gold: annotation change only |
| v2 chapter_ref | gold_40 v0.2 | 0.882 | Chapter-aware parser + numeric keyword suppression |
| v3 direct_chapter | gold_40 v0.2 | 0.882 | Direct DB chapter lookup; aion_035 fixed, aion_036 lost accidental rescue |
| v3 direct_chapter | gold_40 v0.3 | 0.941 | Annotation cluster expansion for aion_023 + aion_033 |

The step from 0.676 to 0.882 is mostly an annotation change, not a system change: +0.177 comes from the v0.1 → v0.2 cluster expansion (23 → 29 of 34) and +0.029 from the v2 system (29 → 30 of 34). `results/v2_chapter_ref_gold40_v02_summary.md` records the same split.

### Every run against every gold version

Because each frozen run stores its retrieved verse lists, any run can be rescored against any version of the gold file. Read along a row for the effect of annotation alone, and down a column for the effect of the system alone. Cells are Recall@5 (hits/questions).

| Frozen run | v0.1 gold | v0.2 gold | v0.3 gold |
|------------|-----------|-----------|-----------|
| v1 hybrid_ref | 0.676 (23/34) | 0.853 (29/34) | 0.882 (30/34) |
| v2 chapter_ref | 0.735 (25/34) | 0.882 (30/34) | 0.941 (32/34) |
| v3 direct_chapter | 0.765 (26/34) | 0.882 (30/34) | 0.941 (32/34) |

On any fixed gold file, v1 to v3 is a gain of one to three questions out of 34. The rest of the distance from 0.676 to 0.941 is annotation. Two cautions when reading this table: the later gold versions were widened after looking at v1 output (v0.2) and v3 output (v0.3), so they are not neutral between systems; and each row is one live run over a non-deterministic index, with the v3 row taken from the v0.3 run (three repeated v3 runs on v0.2 gold gave 0.882, 0.853 and 0.882).

## Known issues in preprint v1.0, and their status in the v1.1 draft

Found in a November 2026 review of the paper against the committed artefacts. None of them changes a headline number.

**Status.** The published v1.0 (`paper/latex/acl_latex.pdf`, `paper/latex/acl_latex.tex` and the Zenodo record) has not been revised. `paper/latex/acl_latex_v1.1_draft.tex` is a corrected source, labelled "v1.1 draft, corrects v1.0; not yet published" under its title, with an appendix listing each correction. It has not been compiled (no LaTeX toolchain was available where it was prepared) and it has not been deposited on Zenodo. Publishing a v1.1 is the author's decision.

| # | Issue in v1.0 | In the v1.1 draft source |
|---|---------------|--------------------------|
| 1 | **Development set, not held-out.** The same 40 questions drove v1 to v3, and accepted clusters were widened after looking at system output. v1.0 does not say so. | Fixed: stated in the abstract and in a new Limitations paragraph. |
| 2 | **The v1 → v2 jump is mostly annotation.** The progression table scores v1 on v0.1 gold and v2 and v3 on v0.2 gold, and credits annotation only for the v0.3 step. | Fixed: the table gains the v1-on-v0.2 row (0.853, MRR 0.633) and the caption and Limitations give the +0.177 / +0.029 split. |
| 3 | **"Top-5 verses" in context.** The chat function passes up to six verses to the model (20 of the 40 frozen rows have six). Recall@5 is computed over the first five. | Fixed in the figure, the method text, the metric definition and the appendix. |
| 4 | **"6/6 false-premise refusals"** in the abstract and contributions is four false-premise questions plus two adversarial ones, as the Results section says. | Fixed in the abstract, contributions and conclusion. |
| 5 | **`aion_034`.** The paper says it passes Recall@5 because JAS.2.17 was retrieved. The frozen row's retrieved list is `2CO.1.24, JAS.2.14, GAL.3.2, JUD.1.1, GAL.3.5, 1TH.1.3`; it passes through the cluster members JAS.2.14, GAL.3.2 and GAL.3.5. | Fixed. |
| 6 | **Single annotator.** There is no inter-annotator agreement figure, v1.0 says "team" for one author, and some dataset notes still say "verify" on rows marked verified. | Paper wording fixed. The dataset notes are explained in `datasets/annotation_guidelines.md`; the dataset file itself is unchanged. |
| 7 | **Wilson interval.** v1.0 prints [0.80, 0.97] for overall Recall@5. The 95% Wilson interval for 32 of 34 is [0.81, 0.98]. The multi-hop interval [0.38, 0.96] is correct. | Fixed. |
| 8 | **Cross-family judge artefact.** v1.0 says all runs are reproducible from frozen files; the GPT judge output is not in the repository (see below). | Fixed: the exception is stated in Experimental Setup and Limitations. |

`paper/limitations.md`, `paper/results.md` and `paper/method.md` (the earlier section drafts) were brought into line with the same corrections.

## Dataset: gold_40 v0.3

One annotator, the system's author, wrote the questions, the gold verses and the accepted clusters. There is no second annotator and no inter-annotator agreement figure. `datasets/annotation_guidelines.md` describes the fields, how the clusters were widened between versions, and which free-text notes are stale.

### v0.1 (baseline)
40 questions. The file marks every row `annotation_status: "verified"` (checked by the annotator against the live `bible_verses` table; this cannot be rechecked offline, because the BSB text is not redistributed here).

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

## Where each number comes from

Every row marked "yes" is recomputed by `tests/research-headline-numbers.test.ts` on each CI run. Paths are relative to `research/`.

| Number | Artefact | Pinned by test |
|--------|----------|----------------|
| Recall@5 0.941 (32/34), MRR 0.773, the two misses `aion_027` and `aion_036` | `results/v3_direct_chapter_gold40_v03.jsonl`, rescored against `datasets/aion_bibleqa_gold_40_v0.3.jsonl` | yes |
| Mean citation support 0.978, none of 34 below 0.5, none at or below 0.25, the two sub-1.0 rows (`aion_021` 0.75, `aion_035` 0.50) | `results/v3_direct_chapter_gold40_v03_judged.jsonl` (`results/phase3_citation_faithfulness_gold40_v03.jsonl` is a byte-identical copy) | yes |
| Refusals 6/6, split 4 false-premise + 2 adversarial | same file | yes |
| Per-category Recall@5, MRR and citation support (paper Table 5) | same file | yes |
| Wilson intervals [0.81, 0.98] for 32/34 and [0.38, 0.96] for 4/5 | computed from the counts above | yes |
| 20 of 40 rows carry six retrieved verses | same file | yes |
| `aion_034` retrieved list; multi-hop all-chapters coverage 4/5 | same file | yes |
| v1 on v0.1: 0.676, MRR 0.552 | `results/v1_hybrid_ref_gold40.jsonl` | yes |
| v1 on v0.2: 0.853, MRR 0.633; the +0.177 / +0.029 split | v1 run rescored against `datasets/aion_bibleqa_gold_40_v0.2.jsonl`; also stated in `results/v2_chapter_ref_gold40_v02_summary.md` | yes |
| v2 on v0.2: 0.882, MRR 0.700 | `results/v2_chapter_ref_gold40_v02.jsonl` | yes |
| v3 on v0.2: 0.882, MRR 0.714 | v3 run rescored against v0.2 gold; run 1 of `results/v3_direct_chapter_gold40_v02_final.jsonl` gives the same | yes |
| Three repeated v3 runs: 0.882, 0.853, 0.882; unstable questions `aion_006`, `aion_007`, `aion_036` | `results/v3_direct_chapter_gold40_v02_final.jsonl` (120 rows, three runs of 40) | yes |
| The run-by-gold table (all nine cells) | the three frozen runs and the three gold files | yes |
| stub_10: 0.286 and 0.571 (seven scored questions each) | `results/baseline_hybrid_v0_stub10.jsonl`, `results/v1_hybrid_ref_stub10.jsonl` | yes |
| Six questions widened in v0.2, two more in v0.3; no question text changed | the three files in `datasets/` | yes |
| 57 of 122 gold and cluster coordinates occur in a frozen retrieved list | `datasets/aion_bibleqa_gold_40_v0.3.jsonl` and every run file in `results/` | yes |
| Second judge (GPT): mean citation support 0.941, exact agreement 31/40, within one step 40/40, nine disagreements | **not recomputable from this repository**: `results/gpt_judge_all40_v03.jsonl` was never committed | no |
| "Three-attempt retry, 0 judge call failures" (paper) | no log is committed; the judged file has no row with an error, which the test checks | partly |
| Latency | not quoted anywhere; `latency_ms` is in each row for anyone who wants it | no |

App-side figures in the top-level README, checked by reading the code: 66 books (`tests/bible-data.test.ts`); seven migrations (`supabase/migrations/`); chat limits 5/min, 30/3 h, 200/day (`supabase/migrations/20260524000000_backend_hardening.sql`); transcription limits 5/min, 20/3 h, 100/day (`supabase/migrations/20261116000000_transcribe_rate_limit.sql`); 2 MB audio cap (`supabase/functions/transcribe/index.ts`); 500-character message cap (`supabase/functions/chat/index.ts`); `halfvec(1536)` (`supabase/migrations/20260524000001_optimize_embeddings.sql`); test count (printed by `./check.sh`). A desktop bundle size of "~5MB" used to be quoted; it was never measured in this repository and has been removed.

## Cross-family judge (paper, Multi-Judge Robustness section)

The paper reports a second judge (OpenAI `gpt-4.1`, identical rubric) over all 40 rows: exact agreement 31/40, within one rubric step 40/40, unsupported rate 0.000 and refusals 6/6 under both judges. Harness: `harness/judge-citation-gpt.ts`; agreement report: `npm run research:multijudge`.

**Artefact status:** the raw GPT judge output (`results/gpt_judge_all40_v03.jsonl`) was excluded by an earlier `.gitignore` rule and is not yet in the repository, so this table cannot currently be recomputed offline. To regenerate it: `GPT_JUDGE_ALL=1 npx tsx --env-file .env research/harness/judge-citation-gpt.ts`. A third judge harness (`judge-citation-claude.ts`) is included but has not been run.

## Paper

- **Published version (v1.0):** `paper/latex/acl_latex.tex` and the compiled `paper/latex/acl_latex.pdf` (8 pages, ACL format), published as DOI [10.5281/zenodo.20522874](https://doi.org/10.5281/zenodo.20522874). These two files are kept exactly as published.
- **Correction draft (v1.1, unpublished):** `paper/latex/acl_latex_v1.1_draft.tex`. Source only: it has not been compiled, and there is no v1.1 PDF. To build it: `cd research/paper/latex && pdflatex acl_latex_v1.1_draft && bibtex acl_latex_v1.1_draft && pdflatex acl_latex_v1.1_draft && pdflatex acl_latex_v1.1_draft`. `diff acl_latex.tex acl_latex_v1.1_draft.tex` shows every change.
- `paper/*.md` are the earlier section-by-section drafts and predate the multi-judge section and the final audit. Where they differ from the LaTeX, the LaTeX is correct.

Title: *Aion-BibleQA: Evaluating Retrieval and Citation Faithfulness in Verse-Grounded Bible RAG Systems*
