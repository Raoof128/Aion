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
datasets/   — JSONL benchmark files
harness/    — TypeScript runner and metrics
judges/     — LLM-as-judge prompts (Phase 3)
results/    — raw_runs.jsonl output (gitignored)
```

## Dataset schema version: 0.1
