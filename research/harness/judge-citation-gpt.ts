/**
 * Phase 4 — Cross-Family Citation Judge (GPT)
 *
 * Secondary judge for the multi-judge validation pass. Reads a frozen judged
 * JSONL (the Gemini run), filters to a stratified sample, and re-scores each row
 * with an OpenAI (GPT) model using the IDENTICAL rubric and prompt as the Gemini
 * judge (research/harness/judge-citation.ts). The point is to attack same-family
 * judge bias: Gemini judges Gemini-family answers, so a GPT judge is a genuine
 * cross-family audit.
 *
 * Usage:
 *   tsx --env-file .env research/harness/judge-citation-gpt.ts
 *   tsx --env-file .env research/harness/judge-citation-gpt.ts --dataset <in.jsonl> --out <out.jsonl>
 *
 * Requires EXPO_PUBLIC_OPENAI_KEY in .env.
 */

import { createReadStream, createWriteStream } from "node:fs";
import { createInterface } from "node:readline";
import { fetchVerseTexts, formatVerseBlock } from "./verse-lookup.ts";
import type { JudgedResult } from "./types.ts";

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_KEY || "";
const JUDGE_MODEL = "gpt-4.1";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const INTER_CALL_DELAY = 800;

// Stratified validation sample (15 rows). Forced inclusions: aion_021, aion_035
// (the two sub-1.0 citation_support rows) and aion_027, aion_036 (the two R@5
// retrieval failures). Distribution: direct 3, thematic 4, interpretive 3,
// multi_hop 2, false_premise 2, adversarial 1.
const SAMPLE_IDS = new Set([
  "aion_001",
  "aion_002",
  "aion_011", // direct
  "aion_003",
  "aion_019",
  "aion_021",
  "aion_027", // thematic
  "aion_005",
  "aion_006",
  "aion_029", // interpretive
  "aion_035",
  "aion_036", // multi_hop
  "aion_008",
  "aion_038", // false_premise
  "aion_010", // adversarial
]);

// GPT_JUDGE_ALL=1 scores the full 40-row benchmark instead of the 15-row sample.
const RUN_ALL = process.env.GPT_JUDGE_ALL === "1";
const IN_PATH =
  process.env.GPT_JUDGE_INPUT || "research/results/v3_direct_chapter_gold40_v03_judged.jsonl";
const OUT_PATH =
  process.env.GPT_JUDGE_OUTPUT ||
  (RUN_ALL
    ? "research/results/gpt_judge_all40_v03.jsonl"
    : "research/results/gpt_judge_sample15_v03.jsonl");

type JudgeResponse = {
  citation_support: number | null;
  false_premise_refusal: number | null;
  reasoning: string;
};

// Verbatim copy of the Gemini judge's prompt builder (judge-citation.ts) so the
// two judges receive an identical task. Do not diverge this without updating both.
function buildPrompt(result: JudgedResult, verseBlock: string): string {
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

async function callGptJudge(prompt: string): Promise<JudgeResponse | null> {
  const body = {
    model: JUDGE_MODEL,
    temperature: 0.1,
    max_tokens: 300,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
  };

  const resp = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => "");
    console.error(`  GPT judge API error ${resp.status}: ${err.slice(0, 200)}`);
    return null;
  }

  const data = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  try {
    return JSON.parse(text) as JudgeResponse;
  } catch {
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

async function loadResults(path: string): Promise<JudgedResult[]> {
  const results: JudgedResult[] = [];
  const rl = createInterface({ input: createReadStream(path) });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed) results.push(JSON.parse(trimmed) as JudgedResult);
  }
  return results;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function main() {
  if (!OPENAI_API_KEY) {
    console.error("Error: EXPO_PUBLIC_OPENAI_KEY must be set in .env.");
    process.exit(1);
  }

  console.log(`Input:  ${IN_PATH}`);
  console.log(`Output: ${OUT_PATH}`);
  console.log(`Model:  ${JUDGE_MODEL} (cross-family judge)\n`);

  const all = await loadResults(IN_PATH);
  const sample = RUN_ALL ? all : all.filter((r) => SAMPLE_IDS.has(r.id));
  console.log(
    `Loaded ${all.length} rows; scoring ${sample.length} (${RUN_ALL ? "full benchmark" : "stratified sample"})\n`,
  );
  if (!RUN_ALL && sample.length !== SAMPLE_IDS.size) {
    const found = new Set(sample.map((r) => r.id));
    const missing = [...SAMPLE_IDS].filter((id) => !found.has(id));
    console.error(`Missing sample IDs: ${missing.join(", ")}`);
    process.exit(1);
  }

  const allCoords = [...new Set(sample.flatMap((r) => r.retrieved_verses))];
  console.log(`Fetching verse texts for ${allCoords.length} unique coords...`);
  const verseMap = await fetchVerseTexts(allCoords);
  console.log(`  Fetched ${verseMap.size} verses\n`);

  const out = createWriteStream(OUT_PATH, { flags: "w" });
  let judged = 0;
  let errors = 0;

  for (const result of sample) {
    const prefix = `[${result.id}] ${result.category.padEnd(14)}`;
    const verseBlock = formatVerseBlock(result.retrieved_verses, verseMap);
    const prompt = buildPrompt(result, verseBlock);

    let jr: JudgeResponse | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      jr = await callGptJudge(prompt);
      if (jr) break;
      if (attempt < 3) await sleep(2000 * attempt);
    }

    const isScorable = result.category !== "false_premise" && result.category !== "adversarial";
    const record = {
      id: result.id,
      category: result.category,
      question: result.question,
      gemini_citation_support: result.citation_support,
      gemini_false_premise_refusal: result.false_premise_refusal,
      gpt_judge_model: JUDGE_MODEL,
      gpt_citation_support: jr ? (isScorable ? (jr.citation_support ?? null) : null) : null,
      gpt_false_premise_refusal: jr
        ? !isScorable
          ? (jr.false_premise_refusal ?? null)
          : null
        : null,
      gpt_reasoning: jr?.reasoning ?? "judge call failed after 3 attempts",
      verse_block: verseBlock,
      answer: result.answer,
      judged_at: new Date().toISOString(),
    };
    out.write(JSON.stringify(record) + "\n");

    if (!jr) {
      process.stdout.write(`${prefix} ERROR (judge failed)\n`);
      errors++;
    } else {
      const s = isScorable
        ? `gpt_cs=${(record.gpt_citation_support ?? 0).toFixed(2)} (gem=${(result.citation_support ?? 0).toFixed(2)})`
        : `gpt_fp=${record.gpt_false_premise_refusal} (gem=${result.false_premise_refusal})`;
      process.stdout.write(`${prefix} ${s}\n`);
      judged++;
    }
    await sleep(INTER_CALL_DELAY);
  }

  out.end();
  console.log(`\n=== GPT cross-family judge complete ===`);
  console.log(`Judged: ${judged}  Errors: ${errors}  Output: ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
