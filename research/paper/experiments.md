# Experiments

<!-- Status: DRAFT -->

## 4.1 Benchmark: Aion-BibleQA gold_40

**Dataset:** `aion_bibleqa_gold_40_v0.3.jsonl` — 40 questions, 6 categories.

| Category | n | Description |
|----------|---|-------------|
| direct | 10 | Queries that name a specific verse (e.g., "What does John 3:16 say?") |
| interpretive | 7 | Queries asking for meaning/explanation of a named passage |
| thematic | 12 | Queries on a theme without naming a verse (e.g., "What does the Bible say about gratitude?") |
| multi_hop | 5 | Queries requiring verses from two different chapters |
| false_premise | 4 | Queries containing a factual error about scripture |
| adversarial | 2 | Queries asking the system to fabricate content |

Each question has a `gold_verse` (primary expected verse coord, e.g., `JHN.3.16`) and an `acceptable_verse_clusters` list of alternative acceptable verse coords. R@5=1 if any retrieved verse matches the gold or any cluster member.

All 40 questions were verified against the live `bible_verses` table (BSB translation, stored as `book_id.chapter.verse` dot coords). The dataset uses schema_version 0.3.

**Annotation note:** Aion-BibleQA is a pilot benchmark created for this study. Its 40 questions cover the six failure modes identified during v1 system development. It is not a random sample from a larger pool — category distribution was designed to test specific architectural properties. Results on this benchmark should be interpreted in that context.

## 4.2 Retrieval Metrics

**Recall@5 (R@5):** Binary. Score 1 if any of the top-5 retrieved verse coords matches `gold_verse` or any member of `acceptable_verse_clusters`; else 0.

**MRR (Mean Reciprocal Rank):** 1/rank of the first matching verse in the ranked list; 0 if no match in top-5.

Both metrics are computed per-row; averages reported per category and overall.

## 4.3 Citation-Faithfulness Evaluation

**Judge model:** `gemini-3.1-flash-lite`

For each row, the judge receives:
1. The question
2. The category
3. The expected behaviour (from the dataset annotation)
4. The retrieved verse block (verse texts fetched from `bible_verses` by coord)
5. The system answer

The judge produces a JSON response with two fields:
- `citation_support` (0.0–1.0) for direct/interpretive/thematic/multi_hop rows
- `false_premise_refusal` (0 or 1) for false_premise/adversarial rows

Scoring rubrics are documented in `research/judges/judge_prompt_citation_support.md` and `research/judges/judge_prompt_false_premise.md`.

**Implementation:** `research/harness/judge-citation.ts`. Verse texts fetched via `supabase-js` in batches of 20. Three-attempt retry per row with exponential backoff; 1.5s inter-call delay. All 40 rows judged in a single pass; 0 judge call failures.

## 4.4 Aggregate Metrics Derived from Judge Output

| Metric | Definition |
|--------|------------|
| mean_citation_support | Mean cs across direct/interpretive/thematic/multi_hop rows (n=34) |
| unsupported_claim_rate | Fraction of rows with cs < 0.5 |
| decorative_citation_rate | Fraction of rows with cs ≤ 0.25 |
| fp_refusal_rate | Fraction of false_premise/adversarial rows with false_premise_refusal=1 |

## 4.5 Experimental Setup

- Bible translation: BSB (Berean Standard Bible), stored in Supabase `bible_verses` table
- Embedding model: Used by Supabase's pgvector extension; IVFFlat index on `embedding` column
- Answer model: Gemini (deployed as Supabase Edge Function)
- Judge model: `gemini-3.1-flash-lite` (same model family as answer model — see Limitations)
- Benchmark runner: `research/harness/run-benchmark.ts` — calls the live Edge Function over HTTPS with SSE streaming
- All benchmark runs are frozen as JSONL artefacts; results are deterministic given the same run file
- Hardware: consumer MacBook; Edge Function runs on Deno Deploy (Supabase infrastructure)
