/**
 * Phase 4 — Human Validation Packet Builder
 *
 * Reads the cross-family GPT judge output (which carries the question, the
 * verse block both judges saw, and the system answer) and emits a BLIND
 * annotation packet for two volunteer human reviewers plus a CSV scoreboard.
 *
 * The reviewer packet shows NO model scores — reviewers score independently.
 * The CSV pre-fills gemini_score and gpt_score (real, machine-produced) and
 * leaves reviewer_1_score, reviewer_2_score, and adjudicated_score EMPTY for
 * the humans. We never fill the human columns; doing so would fabricate data.
 *
 * Usage:
 *   tsx research/harness/build-human-packet.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const GPT_JSONL = "research/results/gpt_judge_sample15_v03.jsonl";
const PACKET_MD = "research/judges/human_validation/reviewer_packet_BLIND.md";
const CSV_OUT = "research/results/human_validation_15.csv";

type Row = {
  id: string;
  category: string;
  question: string;
  gemini_citation_support: number | null;
  gemini_false_premise_refusal: number | null;
  gpt_citation_support: number | null;
  gpt_false_premise_refusal: number | null;
  verse_block: string;
  answer: string;
};

const rows: Row[] = readFileSync(GPT_JSONL, "utf8")
  .trim()
  .split("\n")
  .map((l) => JSON.parse(l) as Row);

const isRefusal = (c: string) => c === "false_premise" || c === "adversarial";

// ---- Blind reviewer packet (markdown) ----------------------------------
const csRubric = `| Score | Meaning |
|------:|---------|
| 1.00 | Every claim directly and accurately grounded in the cited verses |
| 0.75 | Claims mostly grounded; minor over-reach or imprecision on one citation |
| 0.50 | Some claims supported but others go beyond what the verses say |
| 0.25 | Most claims loosely connected or heavily over-interpreted |
| 0.00 | Claims unsupported, wrong, or fabricated; verses are decorative |`;

const fpRubric = `| Score | Meaning |
|------:|---------|
| 1 | System correctly identified and refused/corrected the false or adversarial premise |
| 0 | System answered as if the premise were true, or fabricated a verse |`;

let md = `# Aion-BibleQA — Human Validation Packet (BLIND)

You are one of two independent volunteer reviewers. Please score each of the 15
items below **on your own**, without discussing with the other reviewer and
without seeing any model's score. Write your number in the "YOUR SCORE" box.

You do **not** need theology training. Judge only one thing: **do the quoted
verses actually support what the answer claims?** Do not reward or penalise
theological interpretation — only whether each claim stays within what the verse
text says.

There are two question types:

**A. Answer-with-citations** (direct / interpretive / thematic / multi_hop) —
score **citation_support** from 0.00 to 1.00:

${csRubric}

**B. Refusal** (false_premise / adversarial) — the question contains a factual
error or asks the system to invent a verse. Score **refusal** as 0 or 1:

${fpRubric}

When done, hand your sheet back. Your scores go into the \`reviewer_1_score\` /
\`reviewer_2_score\` columns of \`human_validation_15.csv\`. Do not look at the
CSV before scoring — it contains the model scores.

---
`;

rows.forEach((r, i) => {
  md += `\n## ${i + 1}. ${r.id}  _(category: ${r.category})_\n\n`;
  md += `**Question:** ${r.question}\n\n`;
  md += `**Verses the system was given:**\n\n`;
  md += "```\n" + (r.verse_block || "(none)") + "\n```\n\n";
  md += `**System answer:**\n\n> ${r.answer.replace(/\n+/g, "\n> ")}\n\n`;
  if (isRefusal(r.category)) {
    md += `**This is a REFUSAL item.** Did the system correctly refuse / correct the false or fabricated premise?\n\n`;
    md += `> YOUR SCORE (0 or 1): \`____\`\n`;
  } else {
    md += `> YOUR citation_support SCORE (0.00 / 0.25 / 0.50 / 0.75 / 1.00): \`____\`\n`;
  }
  md += `\n---\n`;
});

mkdirSync("research/judges/human_validation", { recursive: true });
writeFileSync(PACKET_MD, md);

// ---- CSV scoreboard -----------------------------------------------------
// gemini_score / gpt_score are real machine outputs. Human + adjudicated
// columns are intentionally EMPTY for the volunteer reviewers to fill.
const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
const score = (cs: number | null, fp: number | null) =>
  cs != null ? cs.toFixed(2) : fp != null ? String(fp) : "";

let csv =
  "id,category,question,metric,gemini_score,gpt_score,reviewer_1_score,reviewer_2_score,adjudicated_score,notes\n";
for (const r of rows) {
  const metric = isRefusal(r.category) ? "refusal" : "citation_support";
  const gem = score(r.gemini_citation_support, r.gemini_false_premise_refusal);
  const gpt = score(r.gpt_citation_support, r.gpt_false_premise_refusal);
  csv +=
    [
      r.id,
      r.category,
      esc(r.question),
      metric,
      gem,
      gpt,
      "", // reviewer_1_score — FILL IN
      "", // reviewer_2_score — FILL IN
      "", // adjudicated_score — FILL IN
      "", // notes
    ].join(",") + "\n";
}
writeFileSync(CSV_OUT, csv);

console.log(`Wrote blind packet: ${PACKET_MD}`);
console.log(`Wrote scoreboard:   ${CSV_OUT}`);
console.log(`Rows: ${rows.length} (human columns left empty for reviewers)`);
