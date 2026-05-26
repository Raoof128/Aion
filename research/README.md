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

## Open failures

| ID | Category | Root cause | Fix version |
|----|----------|------------|-------------|
| aion_027 | thematic | `semantic_drift` — "grace" retrieves Pauline salutations | v3.1 |
| aion_036 | multi_hop | `IVFFlat_boundary` + name contamination | v4 (per-chapter vector RPC) |
