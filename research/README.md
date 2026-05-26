# Aion Research

**Project:** Aion-BibleQA-Faithfulness  
**Framing:** Benchmark and evaluation framework for citation faithfulness and false-premise robustness in verse-grounded Bible RAG.

## Quick start

```bash
# Run benchmark against stub dataset
npm run research:benchmark

# Print metrics from last run
npm run research:metrics
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

## Paper

`research/paper/` — full paper skeleton (8 sections, DRAFT).  
Title: *Aion: A Benchmark for Citation-Faithfulness and False-Premise Robustness in Verse-Grounded Bible RAG*
