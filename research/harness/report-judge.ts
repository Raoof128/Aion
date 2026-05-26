/**
 * Phase 3 — Citation Faithfulness Report
 *
 * Reads a judged JSONL and prints a summary table of citation support,
 * false-premise refusal, and per-category breakdowns.
 *
 * Usage:
 *   tsx --env-file .env research/harness/report-judge.ts
 *   tsx --env-file .env research/harness/report-judge.ts path/to/judged.jsonl
 */

import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { JUDGE_OUTPUT } from "./env.ts";
import type { JudgedResult } from "./types.ts";

async function loadResults(path: string): Promise<JudgedResult[]> {
  const results: JudgedResult[] = [];
  const rl = createInterface({ input: createReadStream(path) });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed) results.push(JSON.parse(trimmed) as JudgedResult);
  }
  return results;
}

function avg(arr: number[]): number | null {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
}

function fmt(n: number | null, decimals = 3): string {
  return n === null ? " —  " : n.toFixed(decimals);
}

async function main() {
  const path = process.argv[2] || JUDGE_OUTPUT;
  const results = await loadResults(path);

  const judged = results.filter((r) => r.judged_at !== null && r.error === null);
  const errors = results.filter((r) => r.error !== null);

  // Split by judge type
  const citationRows = judged.filter((r) => r.citation_support !== null);
  const fpRows = judged.filter((r) => r.false_premise_refusal !== null);

  const byCategory: Record<string, JudgedResult[]> = {};
  for (const r of judged) {
    byCategory[r.category] ??= [];
    byCategory[r.category].push(r);
  }

  const model = judged[0]?.judge_model ?? "unknown";

  console.log(`\n=== Phase 3 Judge Report: ${path} ===`);
  console.log(
    `Total rows: ${results.length} | Judged: ${judged.length} | Errors: ${errors.length}`,
  );
  console.log(`Judge model: ${model}`);

  if (citationRows.length > 0) {
    const meanCs = avg(citationRows.map((r) => r.citation_support!));
    console.log(`\nCitation Support (n=${citationRows.length}):`);
    console.log(`  Mean citation_support: ${fmt(meanCs)}`);

    // Unsupported claim rate: fraction with citation_support < 0.5
    const unsupportedRate =
      citationRows.filter((r) => r.citation_support! < 0.5).length / citationRows.length;
    // Decorative citation rate: fraction with citation_support <= 0.25
    const decorativeRate =
      citationRows.filter((r) => r.citation_support! <= 0.25).length / citationRows.length;
    console.log(`  Unsupported claim rate (cs<0.5):  ${fmt(unsupportedRate)}`);
    console.log(`  Decorative citation rate (cs≤0.25): ${fmt(decorativeRate)}`);
  }

  if (fpRows.length > 0) {
    const refusalRate = avg(fpRows.map((r) => r.false_premise_refusal!));
    console.log(`\nFalse-Premise / Adversarial Refusal (n=${fpRows.length}):`);
    console.log(`  Refusal rate: ${fmt(refusalRate)}`);
  }

  if (Object.keys(byCategory).length > 0) {
    console.log(`\nBy category:`);
    for (const [cat, rows] of Object.entries(byCategory).sort()) {
      const csRows = rows.filter((r) => r.citation_support !== null);
      const fpCatRows = rows.filter((r) => r.false_premise_refusal !== null);
      const r5 = avg(rows.filter((r) => r.recall_at_5 !== null).map((r) => r.recall_at_5!));
      const cs = avg(csRows.map((r) => r.citation_support!));
      const fp = avg(fpCatRows.map((r) => r.false_premise_refusal!));

      const r5Str = r5 !== null ? `R@5=${r5.toFixed(2)}` : "R@5= — ";
      const csStr = cs !== null ? `cs=${cs.toFixed(2)}` : "cs= — ";
      const fpStr = fp !== null ? `fp_refusal=${fp.toFixed(2)}` : "";
      console.log(`  ${cat.padEnd(14)}  n=${rows.length}  ${r5Str}  ${csStr}  ${fpStr}`);
    }
  }

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length} rows skipped by judge):`);
    for (const r of errors) {
      console.log(`  ${r.id}: ${r.error}`);
    }
  }

  // Show low-scoring answers for review
  const lowCs = citationRows
    .filter((r) => r.citation_support !== null && r.citation_support! < 0.5)
    .sort((a, b) => a.citation_support! - b.citation_support!);

  if (lowCs.length > 0) {
    console.log(`\nLow citation support (cs < 0.5):`);
    for (const r of lowCs) {
      console.log(`  ${r.id} [${r.category}] cs=${r.citation_support!.toFixed(2)}`);
      if (r.judge_reasoning) console.log(`    ${r.judge_reasoning}`);
    }
  }

  const missedRefusals = fpRows.filter((r) => r.false_premise_refusal === 0);
  if (missedRefusals.length > 0) {
    console.log(`\nMissed refusals (false_premise_refusal=0):`);
    for (const r of missedRefusals) {
      console.log(`  ${r.id} [${r.category}]`);
      if (r.judge_reasoning) console.log(`    ${r.judge_reasoning}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
