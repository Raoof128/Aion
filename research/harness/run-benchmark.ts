import { createReadStream, createWriteStream } from "node:fs";
import { createInterface } from "node:readline";
import { DATASET_PATH, OUTPUT_PATH } from "./env.ts";
import { getAnonToken } from "./auth.ts";
import { callChat } from "./parse-sse.ts";
import { normaliseGoldVerses, recallAt5, precisionAt5, mrr } from "./metrics-retrieval.ts";
import type { BenchmarkQuestion, RunResult } from "./types.ts";

async function loadDataset(path: string): Promise<BenchmarkQuestion[]> {
  const questions: BenchmarkQuestion[] = [];
  const rl = createInterface({ input: createReadStream(path) });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed) questions.push(JSON.parse(trimmed) as BenchmarkQuestion);
  }
  return questions;
}

async function main() {
  console.log(`Dataset:  ${DATASET_PATH}`);
  console.log(`Output:   ${OUTPUT_PATH}`);

  const questions = await loadDataset(DATASET_PATH);
  console.log(`Loaded ${questions.length} questions\n`);

  const token = await getAnonToken();
  console.log("Auth: anonymous session created\n");

  const out = createWriteStream(OUTPUT_PATH, { flags: "a" });

  let totalRecall = 0;
  let totalPrecision = 0;
  let totalMrr = 0;
  let scoredCount = 0;
  let errorCount = 0;

  for (const q of questions) {
    process.stdout.write(`[${q.id}] ${q.category.padEnd(14)} `);

    const sse = await callChat(token, q.question);
    const goldCoords = normaliseGoldVerses(q.gold_verses);
    const hasGold = goldCoords.length > 0;

    const result: RunResult = {
      id: q.id,
      system: "hybrid_rag",
      question: q.question,
      category: q.category,
      answer: sse.answer,
      conversation_id: sse.conversation_id,
      retrieved_verses: sse.retrieved_verses,
      gold_verses: goldCoords,
      recall_at_5: hasGold
        ? recallAt5(sse.retrieved_verses, goldCoords, q.acceptable_verse_clusters)
        : null,
      precision_at_5: hasGold
        ? precisionAt5(sse.retrieved_verses, goldCoords, q.acceptable_verse_clusters)
        : null,
      mrr: hasGold
        ? mrr(sse.retrieved_verses, goldCoords, q.acceptable_verse_clusters)
        : null,
      citation_validity: null,
      citation_support: null,
      false_premise_refusal: null,
      latency_ms: sse.latency_ms,
      http_status: sse.http_status,
      error: sse.error,
      run_at: new Date().toISOString(),
      dataset_path: DATASET_PATH,
    };

    out.write(JSON.stringify(result) + "\n");

    if (sse.error) {
      console.log(`ERROR: ${sse.error} (HTTP ${sse.http_status ?? "N/A"})`);
      errorCount++;
    } else {
      const r5 = result.recall_at_5 !== null ? `R@5=${result.recall_at_5.toFixed(2)}` : "R@5=N/A";
      const p5 =
        result.precision_at_5 !== null ? `P@5=${result.precision_at_5.toFixed(2)}` : "P@5=N/A";
      console.log(`${r5}  ${p5}  ${result.latency_ms}ms`);
      if (hasGold) {
        totalRecall += result.recall_at_5!;
        totalPrecision += result.precision_at_5!;
        totalMrr += result.mrr!;
        scoredCount++;
      }
    }
  }

  await new Promise<void>(resolve => out.end(resolve));

  console.log(`\n--- Aggregate (${scoredCount} scored, ${errorCount} errors) ---`);
  if (scoredCount > 0) {
    console.log(`Recall@5:    ${(totalRecall / scoredCount).toFixed(3)}`);
    console.log(`Precision@5: ${(totalPrecision / scoredCount).toFixed(3)}`);
    console.log(`MRR:         ${(totalMrr / scoredCount).toFixed(3)}`);
  }
  console.log(`Output written to: ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
