/**
 * Phase 4 — Third Cross-Family Citation Judge (Claude)  [READY-TO-RUN]
 *
 * Optional third judge for the multi-model panel. Mirrors judge-citation-gpt.ts
 * exactly (identical rubric and prompt) but calls the Anthropic Messages API.
 *
 * NOTE: This harness is provided ready-to-run but has NOT been executed — the
 * repo .env currently has no Anthropic key. Add ANTHROPIC_API_KEY to .env and run:
 *
 *   CLAUDE_JUDGE_ALL=1 tsx --env-file .env research/harness/judge-citation-claude.ts
 *
 * Output: research/results/claude_judge_all40_v03.jsonl (or *_sample15_* without ALL).
 * Then re-run report-multijudge.ts to fold the Claude column into the panel.
 */

import { createReadStream, createWriteStream } from "node:fs";
import { createInterface } from "node:readline";
import { fetchVerseTexts, formatVerseBlock } from "./verse-lookup.ts";
import type { JudgedResult } from "./types.ts";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const JUDGE_MODEL = "claude-sonnet-4-6";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const INTER_CALL_DELAY = 800;

const RUN_ALL = process.env.CLAUDE_JUDGE_ALL === "1";
const SAMPLE_IDS = new Set([
  "aion_001",
  "aion_002",
  "aion_011",
  "aion_003",
  "aion_019",
  "aion_021",
  "aion_027",
  "aion_005",
  "aion_006",
  "aion_029",
  "aion_035",
  "aion_036",
  "aion_008",
  "aion_038",
  "aion_010",
]);

const IN_PATH =
  process.env.CLAUDE_JUDGE_INPUT || "research/results/v3_direct_chapter_gold40_v03_judged.jsonl";
const OUT_PATH =
  process.env.CLAUDE_JUDGE_OUTPUT ||
  (RUN_ALL
    ? "research/results/claude_judge_all40_v03.jsonl"
    : "research/results/claude_judge_sample15_v03.jsonl");

type JudgeResponse = {
  citation_support: number | null;
  false_premise_refusal: number | null;
  reasoning: string;
};

// Identical to the Gemini/GPT judges. Keep these three in sync.
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

async function callClaudeJudge(prompt: string): Promise<JudgeResponse | null> {
  const resp = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: JUDGE_MODEL,
      max_tokens: 300,
      temperature: 0.1,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!resp.ok) {
    const err = await resp.text().catch(() => "");
    console.error(`  Claude judge API error ${resp.status}: ${err.slice(0, 200)}`);
    return null;
  }
  const data = (await resp.json()) as { content?: Array<{ text?: string }> };
  const text = data.content?.[0]?.text ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as JudgeResponse;
  } catch {
    return null;
  }
}

async function loadResults(path: string): Promise<JudgedResult[]> {
  const results: JudgedResult[] = [];
  const rl = createInterface({ input: createReadStream(path) });
  for await (const line of rl) {
    const t = line.trim();
    if (t) results.push(JSON.parse(t) as JudgedResult);
  }
  return results;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function main() {
  if (!ANTHROPIC_API_KEY) {
    console.error(
      "ANTHROPIC_API_KEY not set. Add it to .env to run the third (Claude) judge.\n" +
        "This harness is intentionally a no-op without a key; no scores are fabricated.",
    );
    process.exit(1);
  }
  const all = await loadResults(IN_PATH);
  const sample = RUN_ALL ? all : all.filter((r) => SAMPLE_IDS.has(r.id));
  console.log(`Model: ${JUDGE_MODEL} (cross-family judge). Scoring ${sample.length} rows.`);

  const allCoords = [...new Set(sample.flatMap((r) => r.retrieved_verses))];
  const verseMap = await fetchVerseTexts(allCoords);

  const out = createWriteStream(OUT_PATH, { flags: "w" });
  let judged = 0;
  let errors = 0;
  for (const result of sample) {
    const verseBlock = formatVerseBlock(result.retrieved_verses, verseMap);
    const prompt = buildPrompt(result, verseBlock);
    let jr: JudgeResponse | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      jr = await callClaudeJudge(prompt);
      if (jr) break;
      if (attempt < 3) await sleep(2000 * attempt);
    }
    const isScorable = result.category !== "false_premise" && result.category !== "adversarial";
    out.write(
      JSON.stringify({
        id: result.id,
        category: result.category,
        question: result.question,
        claude_judge_model: JUDGE_MODEL,
        claude_citation_support: jr ? (isScorable ? (jr.citation_support ?? null) : null) : null,
        claude_false_premise_refusal: jr
          ? !isScorable
            ? (jr.false_premise_refusal ?? null)
            : null
          : null,
        claude_reasoning: jr?.reasoning ?? "judge call failed after 3 attempts",
        judged_at: new Date().toISOString(),
      }) + "\n",
    );
    if (jr) judged++;
    else errors++;
    await sleep(INTER_CALL_DELAY);
  }
  out.end();
  console.log(`Claude judge complete. Judged: ${judged}  Errors: ${errors}  Output: ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
