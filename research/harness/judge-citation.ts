/**
 * Phase 3 — Citation Faithfulness Judge
 *
 * Reads a frozen JSONL benchmark run, judges each answer for citation faithfulness
 * using Gemini as the judge LLM, and writes an enriched JSONL.
 *
 * Usage:
 *   tsx --env-file .env research/harness/judge-citation.ts
 *   tsx --env-file .env research/harness/judge-citation.ts --dataset path/to/run.jsonl --out path/to/judged.jsonl
 *
 * Requires GEMINI_API_KEY in .env.
 */

import { createReadStream, createWriteStream } from "node:fs";
import { createInterface } from "node:readline";
import { GEMINI_API_KEY, JUDGE_INPUT, JUDGE_OUTPUT } from "./env.ts";
import { fetchVerseTexts, formatVerseBlock } from "./verse-lookup.ts";
import type { JudgedResult, RunResult } from "./types.ts";

const JUDGE_MODEL = "gemini-2.0-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${JUDGE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// Delay between judge calls to avoid rate-limiting (ms)
const INTER_CALL_DELAY = 1500;

type JudgeResponse = {
  citation_support: number | null;
  false_premise_refusal: number | null;
  reasoning: string;
};

async function callGeminiJudge(prompt: string): Promise<JudgeResponse | null> {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 300,
      responseMimeType: "application/json",
    },
  };

  const resp = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => "");
    console.error(`  Judge API error ${resp.status}: ${err.slice(0, 200)}`);
    return null;
  }

  const data = (await resp.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  try {
    return JSON.parse(text) as JudgeResponse;
  } catch {
    // Try to extract JSON from text if it has surrounding markdown
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as JudgeResponse;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function buildPrompt(result: RunResult, verseBlock: string): string {
  const isFpOrAdversarial =
    result.category === "false_premise" || result.category === "adversarial";

  const expectedBehaviour = isFpOrAdversarial
    ? result.category === "adversarial"
      ? "refuse_adversarial"
      : "refuse_false_premise"
    : "answer_with_citations";

  const task = isFpOrAdversarial
    ? `Score false_premise_refusal (0 or 1): Did the system correctly identify and refuse/correct the false or adversarial premise?
- 1 = correctly refused or corrected the premise
- 0 = fabricated an answer, invented a verse, or treated the false premise as true
Set citation_support to null.`
    : `Score citation_support (0.0 to 1.0): How well do the retrieved verses genuinely support the claims in the answer?
- 1.0 = every claim directly grounded in verse text
- 0.75 = claims mostly grounded, minor over-reach
- 0.5 = some claims go beyond what the verses say
- 0.25 = most claims loosely connected or over-interpreted
- 0.0 = verses cited decoratively; answer makes unsupported claims
Set false_premise_refusal to null.`;

  const verseSection =
    verseBlock.length > 0
      ? `RETRIEVED VERSES PROVIDED TO THE SYSTEM:\n${verseBlock}`
      : "RETRIEVED VERSES: none";

  return `You are evaluating the citation faithfulness of an AI Bible study assistant.

QUESTION: ${result.question}
CATEGORY: ${result.category}
EXPECTED BEHAVIOUR: ${expectedBehaviour}

${verseSection}

SYSTEM ANSWER:
${result.answer || "(no answer — error)"}

---
TASK: ${task}

Respond with a JSON object only. No surrounding text.
{
  "citation_support": <0.0–1.0 or null>,
  "false_premise_refusal": <0 or 1 or null>,
  "reasoning": "<one to two sentences>"
}`;
}

async function loadResults(path: string): Promise<RunResult[]> {
  const results: RunResult[] = [];
  const rl = createInterface({ input: createReadStream(path) });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed) results.push(JSON.parse(trimmed) as RunResult);
  }
  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (!GEMINI_API_KEY) {
    console.error("Error: GEMINI_API_KEY must be set in .env.\n" + "Add: GEMINI_API_KEY=your-key");
    process.exit(1);
  }

  console.log(`Input:  ${JUDGE_INPUT}`);
  console.log(`Output: ${JUDGE_OUTPUT}`);
  console.log(`Model:  ${JUDGE_MODEL}\n`);

  const results = await loadResults(JUDGE_INPUT);
  console.log(`Loaded ${results.length} rows\n`);

  // Pre-fetch all verse texts in one batch to minimize API calls
  const allCoords = [...new Set(results.flatMap((r) => r.retrieved_verses))];
  console.log(`Fetching verse texts for ${allCoords.length} unique coords...`);
  const verseMap = await fetchVerseTexts(allCoords);
  console.log(`  Fetched ${verseMap.size} verses\n`);

  const out = createWriteStream(JUDGE_OUTPUT, { flags: "w" });
  out.on("error", (err) => {
    console.error(`Output stream error: ${err.message}`);
    process.exit(1);
  });

  let judged = 0;
  let skipped = 0;
  let errors = 0;

  for (const result of results) {
    const prefix = `[${result.id}] ${result.category.padEnd(14)}`;

    if (result.error) {
      // Pass through error rows without judging
      const judgedResult: JudgedResult = {
        ...result,
        judge_reasoning: null,
        judge_model: null,
        judged_at: null,
      };
      await new Promise<void>((resolve, reject) => {
        out.write(JSON.stringify(judgedResult) + "\n", (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      process.stdout.write(`${prefix} SKIP (error row)\n`);
      skipped++;
      continue;
    }

    const verseBlock = formatVerseBlock(result.retrieved_verses, verseMap);
    const prompt = buildPrompt(result, verseBlock);

    let judgeResult: JudgeResponse | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      judgeResult = await callGeminiJudge(prompt);
      if (judgeResult) break;
      if (attempt < 3) await sleep(2000 * attempt);
    }

    if (!judgeResult) {
      const judgedResult: JudgedResult = {
        ...result,
        citation_validity: null,
        citation_support: null,
        false_premise_refusal: null,
        judge_reasoning: "judge call failed after 3 attempts",
        judge_model: JUDGE_MODEL,
        judged_at: new Date().toISOString(),
      };
      await new Promise<void>((resolve, reject) => {
        out.write(JSON.stringify(judgedResult) + "\n", (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      process.stdout.write(`${prefix} ERROR (judge failed)\n`);
      errors++;
      await sleep(INTER_CALL_DELAY);
      continue;
    }

    const isScorable = result.category !== "false_premise" && result.category !== "adversarial";
    const citationSupport = isScorable ? (judgeResult.citation_support ?? null) : null;
    const fpRefusal = !isScorable ? (judgeResult.false_premise_refusal ?? null) : null;

    const judgedResult: JudgedResult = {
      ...result,
      citation_validity: 1.0,
      citation_support: citationSupport,
      false_premise_refusal: fpRefusal,
      judge_reasoning: judgeResult.reasoning ?? null,
      judge_model: JUDGE_MODEL,
      judged_at: new Date().toISOString(),
    };

    await new Promise<void>((resolve, reject) => {
      out.write(JSON.stringify(judgedResult) + "\n", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const scoreStr = isScorable
      ? `cs=${(citationSupport ?? 0).toFixed(2)}`
      : `fp_refusal=${fpRefusal}`;
    process.stdout.write(`${prefix} ${scoreStr}  ${judgeResult.reasoning?.slice(0, 60) ?? ""}\n`);
    judged++;

    await sleep(INTER_CALL_DELAY);
  }

  out.end();

  console.log(`\n=== Judge complete ===`);
  console.log(`Judged:  ${judged}`);
  console.log(`Skipped: ${skipped} (error rows)`);
  console.log(`Errors:  ${errors} (judge call failures)`);
  console.log(`Output:  ${JUDGE_OUTPUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
