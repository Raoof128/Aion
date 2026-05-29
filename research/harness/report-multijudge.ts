/**
 * Phase 4 — Multi-Judge Agreement Reporter
 *
 * Computes agreement statistics for the multi-judge validation sample.
 *
 * Always available (machine data): Gemini vs GPT cross-family agreement, read
 * from research/results/gpt_judge_sample15_v03.jsonl.
 *
 * Once the two volunteer reviewers fill reviewer_1_score / reviewer_2_score in
 * research/results/human_validation_15.csv, this also reports human-vs-judge and
 * inter-reviewer agreement. Rows with empty human cells are skipped for the
 * human columns and the report says so — nothing is imputed.
 *
 * Usage:
 *   tsx research/harness/report-multijudge.ts
 */

import { readFileSync, existsSync } from "node:fs";

const GPT_JSONL = "research/results/gpt_judge_sample15_v03.jsonl";
const CSV = "research/results/human_validation_15.csv";

type J = {
  id: string;
  category: string;
  gemini_citation_support: number | null;
  gemini_false_premise_refusal: number | null;
  gpt_citation_support: number | null;
  gpt_false_premise_refusal: number | null;
};

const judged: J[] = readFileSync(GPT_JSONL, "utf8")
  .trim()
  .split("\n")
  .map((l) => JSON.parse(l) as J);

const gem = (r: J) => r.gemini_citation_support ?? r.gemini_false_premise_refusal;
const gpt = (r: J) => r.gpt_citation_support ?? r.gpt_false_premise_refusal;

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const f3 = (x: number) => (Number.isNaN(x) ? "n/a" : x.toFixed(3));

// ---- Gemini vs GPT (always available) ----------------------------------
let exact = 0;
let within1 = 0;
const STEP = 0.25;
const disagreements: string[] = [];
for (const r of judged) {
  const a = gem(r)!;
  const b = gpt(r)!;
  if (a === b) exact++;
  if (Math.abs(a - b) <= STEP + 1e-9) within1++;
  if (a !== b) disagreements.push(`  ${r.id} (${r.category}): gemini=${a}  gpt=${b}`);
}
const scorable = judged.filter((r) => r.gemini_citation_support != null);
const refusal = judged.filter((r) => r.gemini_false_premise_refusal != null);

console.log("=== Multi-Judge Validation — sample n=" + judged.length + " ===\n");
console.log("Gemini vs GPT (cross-family):");
console.log(`  Exact agreement:        ${exact}/${judged.length}`);
console.log(`  Within one rubric level: ${within1}/${judged.length}  (|Δ| ≤ 0.25)`);
console.log(
  `  Mean citation_support:  gemini=${f3(mean(scorable.map((r) => r.gemini_citation_support!)))}  gpt=${f3(mean(scorable.map((r) => r.gpt_citation_support!)))}  (n=${scorable.length} scorable)`,
);
console.log(
  `  Refusal rows agreeing:  ${refusal.filter((r) => r.gemini_false_premise_refusal === r.gpt_false_premise_refusal).length}/${refusal.length}`,
);
if (disagreements.length) {
  console.log(`  Disagreements (all within one level unless noted):`);
  console.log(disagreements.join("\n"));
}

// ---- Human reviewers (if CSV filled) -----------------------------------
if (!existsSync(CSV)) {
  console.log(`\n(No ${CSV} found — run build-human-packet.ts and have reviewers fill it.)`);
  process.exit(0);
}

// minimal CSV parse (handles quoted question field)
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  const header = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cells: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = !inQ;
      } else if (ch === "," && !inQ) {
        cells.push(cur);
        cur = "";
      } else cur += ch;
    }
    cells.push(cur);
    const obj: Record<string, string> = {};
    header.forEach((h, i) => (obj[h] = cells[i] ?? ""));
    return obj;
  });
}

const csvRows = parseCsv(readFileSync(CSV, "utf8"));
const r1Filled = csvRows.filter((r) => r.reviewer_1_score.trim() !== "");
const r2Filled = csvRows.filter((r) => r.reviewer_2_score.trim() !== "");

console.log(`\nHuman reviewers:`);
if (r1Filled.length === 0 && r2Filled.length === 0) {
  console.log(`  reviewer_1_score / reviewer_2_score are empty — nothing to report yet.`);
  console.log(`  Hand reviewer_packet_BLIND.md to two volunteers, then re-run.`);
  process.exit(0);
}

const num = (s: string) => parseFloat(s);
const byId = new Map(judged.map((r) => [r.id, r]));

function agree(filled: Record<string, string>[], col: string, against: (r: J) => number | null) {
  let n = 0;
  let ex = 0;
  for (const row of filled) {
    const j = byId.get(row.id);
    if (!j) continue;
    const h = num(row[col]);
    const m = against(j)!;
    if (Number.isNaN(h)) continue;
    n++;
    if (h === m) ex++;
  }
  return { n, ex };
}

if (r1Filled.length) {
  const vg = agree(r1Filled, "reviewer_1_score", gem);
  const vgpt = agree(r1Filled, "reviewer_1_score", gpt);
  console.log(`  Reviewer 1 vs Gemini: ${vg.ex}/${vg.n}    vs GPT: ${vgpt.ex}/${vgpt.n}`);
}
if (r2Filled.length) {
  const vg = agree(r2Filled, "reviewer_2_score", gem);
  const vgpt = agree(r2Filled, "reviewer_2_score", gpt);
  console.log(`  Reviewer 2 vs Gemini: ${vg.ex}/${vg.n}    vs GPT: ${vgpt.ex}/${vgpt.n}`);
}
// inter-reviewer
{
  let n = 0;
  let ex = 0;
  const h: number[] = [];
  for (const row of csvRows) {
    const a = num(row.reviewer_1_score);
    const b = num(row.reviewer_2_score);
    if (Number.isNaN(a) || Number.isNaN(b)) continue;
    n++;
    if (a === b) ex++;
    h.push(a);
  }
  if (n) {
    console.log(`  Reviewer 1 vs Reviewer 2: ${ex}/${n}`);
    const meanHumanCs = mean(
      csvRows
        .filter((r) => r.metric === "citation_support" && r.reviewer_1_score && r.reviewer_2_score)
        .map((r) => (num(r.reviewer_1_score) + num(r.reviewer_2_score)) / 2),
    );
    console.log(`  Mean human citation_support (avg of 2 reviewers): ${f3(meanHumanCs)}`);
  }
}
