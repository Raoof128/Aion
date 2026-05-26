import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { OUTPUT_PATH } from "./env.ts";
import type { RunResult } from "./types.ts";

async function loadResults(path: string): Promise<RunResult[]> {
  const results: RunResult[] = [];
  const rl = createInterface({ input: createReadStream(path) });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed) results.push(JSON.parse(trimmed) as RunResult);
  }
  return results;
}

function avg(arr: number[]): number | null {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
}

async function main() {
  // Allow overriding path via positional arg: tsx report-metrics.ts path/to/runs.jsonl
  const path = process.argv[2] || OUTPUT_PATH;

  const results = await loadResults(path);
  const scored = results.filter(r => r.recall_at_5 !== null && r.error === null);
  const errors = results.filter(r => r.error !== null);

  const byCategory: Record<string, RunResult[]> = {};
  for (const r of scored) {
    byCategory[r.category] ??= [];
    byCategory[r.category].push(r);
  }

  console.log(`\n=== Benchmark Report: ${path} ===`);
  console.log(`Total runs: ${results.length} | Scored: ${scored.length} | Errors: ${errors.length}`);

  if (scored.length > 0) {
    const overallR5 = avg(scored.map(r => r.recall_at_5!));
    const overallP5 = avg(scored.map(r => r.precision_at_5!));
    const overallMrr = avg(scored.map(r => r.mrr!));
    const overallLatency = avg(scored.map(r => r.latency_ms));

    console.log(`\nOverall (n=${scored.length}):`);
    console.log(`  Recall@5:    ${overallR5!.toFixed(3)}`);
    console.log(`  Precision@5: ${overallP5!.toFixed(3)}`);
    console.log(`  MRR:         ${overallMrr!.toFixed(3)}`);
    console.log(`  Avg latency: ${overallLatency!.toFixed(0)}ms`);

    console.log(`\nBy category:`);
    for (const [cat, rows] of Object.entries(byCategory).sort()) {
      const r5 = avg(rows.map(r => r.recall_at_5!))!.toFixed(2);
      const p5 = avg(rows.map(r => r.precision_at_5!))!.toFixed(2);
      const mrrVal = avg(rows.map(r => r.mrr!))!.toFixed(2);
      console.log(`  ${cat.padEnd(14)}  n=${rows.length}  R@5=${r5}  P@5=${p5}  MRR=${mrrVal}`);
    }
  }

  if (errors.length > 0) {
    console.log(`\nErrors:`);
    for (const r of errors) {
      console.log(`  ${r.id} (HTTP ${r.http_status ?? "N/A"}): ${r.error}`);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
