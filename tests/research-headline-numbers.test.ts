/**
 * Pins every research number quoted in README.md and research/README.md to the
 * frozen artefacts in research/results/ and research/datasets/.
 *
 * Nothing here calls a model or the network. Each figure is recomputed from the
 * committed JSONL files, and the tables in the two READMEs are parsed and compared
 * with the recomputed values, so a number cannot drift from its artefact unnoticed.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { recallAt5, mrr, normaliseGoldVerses } from "../research/harness/metrics-retrieval.ts";
import type { BenchmarkQuestion, JudgedResult, RunResult } from "../research/harness/types.ts";

const ROOT = process.cwd();
const RESULTS = "research/results";
const DATASETS = "research/datasets";

function readText(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function loadJsonl<T>(rel: string): T[] {
  return readText(rel)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as T);
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function f3(value: number): string {
  return value.toFixed(3);
}

/** The scored rows, selected the same way research/harness/report-metrics.ts selects them. */
function scoredRows<T extends RunResult>(rows: T[]): T[] {
  return rows.filter((r) => r.recall_at_5 !== null && r.error === null);
}

type Score = { n: number; hits: number; recall: number; mrr: number };

/** Recall@5 and MRR as stored in a frozen run file. */
function storedScore(rows: RunResult[]): Score {
  const scored = scoredRows(rows);
  const hits = scored.reduce((a, r) => a + (r.recall_at_5 as number), 0);
  return {
    n: scored.length,
    hits,
    recall: hits / scored.length,
    mrr: mean(scored.map((r) => r.mrr as number)),
  };
}

/**
 * Recall@5 and MRR recomputed from a run's frozen retrieved lists against a given
 * gold file, with the harness's own metric functions. Scoring a run against a gold
 * version other than the one it was first scored on separates annotation changes
 * from system changes.
 */
function rescore(rows: RunResult[], dataset: BenchmarkQuestion[]): Score {
  const byId = new Map(dataset.map((q) => [q.id, q]));
  const recalls: number[] = [];
  const mrrs: number[] = [];
  for (const row of rows) {
    const question = byId.get(row.id);
    assert.ok(question, `no dataset row for ${row.id}`);
    if (question.gold_verses.length === 0 || row.error !== null) continue;
    const gold = normaliseGoldVerses(question.gold_verses);
    recalls.push(recallAt5(row.retrieved_verses, gold, question.acceptable_verse_clusters));
    mrrs.push(mrr(row.retrieved_verses, gold, question.acceptable_verse_clusters));
  }
  const hits = recalls.reduce((a, b) => a + b, 0);
  return { n: recalls.length, hits, recall: hits / recalls.length, mrr: mean(mrrs) };
}

/** Wilson score interval for k successes in n trials at 95% (z = 1.959964). */
function wilson(k: number, n: number): [number, number] {
  const z = 1.959963984540054;
  const p = k / n;
  const denominator = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / denominator;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denominator;
  return [centre - half, centre + half];
}

/** Cells of the first markdown table row whose first cell equals `label`. */
function tableRow(markdown: string, label: string): string[] {
  for (const line of markdown.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());
    if (cells[0] === label) return cells;
  }
  throw new Error(`no table row labelled "${label}"`);
}

/** The text of a markdown section, from its heading to the next heading of the same level. */
function section(markdown: string, heading: string): string {
  const start = markdown.indexOf(heading);
  assert.ok(start >= 0, `no section "${heading}"`);
  const level = heading.match(/^#+/)?.[0] ?? "##";
  const rest = markdown.slice(start + heading.length);
  const next = rest.search(new RegExp(`\\n${level} `));
  return next < 0 ? rest : rest.slice(0, next);
}

const gold01 = loadJsonl<BenchmarkQuestion>(`${DATASETS}/aion_bibleqa_gold_40.jsonl`);
const gold02 = loadJsonl<BenchmarkQuestion>(`${DATASETS}/aion_bibleqa_gold_40_v0.2.jsonl`);
const gold03 = loadJsonl<BenchmarkQuestion>(`${DATASETS}/aion_bibleqa_gold_40_v0.3.jsonl`);

const v1 = loadJsonl<RunResult>(`${RESULTS}/v1_hybrid_ref_gold40.jsonl`);
const v2 = loadJsonl<RunResult>(`${RESULTS}/v2_chapter_ref_gold40_v02.jsonl`);
const v3 = loadJsonl<RunResult>(`${RESULTS}/v3_direct_chapter_gold40_v03.jsonl`);
const v3Judged = loadJsonl<JudgedResult>(`${RESULTS}/v3_direct_chapter_gold40_v03_judged.jsonl`);
const v3ThreeRuns = loadJsonl<RunResult>(`${RESULTS}/v3_direct_chapter_gold40_v02_final.jsonl`);

const readme = readText("README.md");
const researchReadme = readText("research/README.md");

describe("headline numbers: v3 system on gold_40 v0.3", () => {
  const citationRows = v3Judged.filter((r) => r.citation_support !== null);
  const refusalRows = v3Judged.filter((r) => r.false_premise_refusal !== null);

  test("the frozen run has 40 rows in six categories", () => {
    assert.equal(v3Judged.length, 40);
    const counts: Record<string, number> = {};
    for (const r of v3Judged) counts[r.category] = (counts[r.category] ?? 0) + 1;
    assert.deepEqual(counts, {
      direct: 10,
      interpretive: 7,
      thematic: 12,
      multi_hop: 5,
      false_premise: 4,
      adversarial: 2,
    });
    assert.equal(
      v3Judged.filter((r) => r.error !== null).length,
      0,
      "no row carries a run or judge error",
    );
  });

  test("Recall@5 is 32 of 34 (0.941) and MRR is 0.773", () => {
    const stored = storedScore(v3Judged);
    assert.equal(stored.n, 34);
    assert.equal(stored.hits, 32);
    assert.equal(f3(stored.recall), "0.941");
    assert.equal(f3(stored.mrr), "0.773");
  });

  test("the stored per-row scores equal a fresh rescoring of the retrieved lists", () => {
    const byId = new Map(gold03.map((q) => [q.id, q]));
    for (const row of scoredRows(v3Judged)) {
      const question = byId.get(row.id);
      assert.ok(question);
      const gold = normaliseGoldVerses(question.gold_verses);
      const clusters = question.acceptable_verse_clusters;
      assert.equal(recallAt5(row.retrieved_verses, gold, clusters), row.recall_at_5, row.id);
      assert.equal(mrr(row.retrieved_verses, gold, clusters), row.mrr, row.id);
    }
    const fresh = rescore(v3Judged, gold03);
    assert.equal(fresh.hits, 32);
    assert.equal(f3(fresh.mrr), "0.773");
  });

  test("the judged file and the unjudged run file hold the same retrieval rows", () => {
    assert.equal(v3.length, v3Judged.length);
    v3.forEach((row, i) => {
      assert.equal(row.id, v3Judged[i].id);
      assert.deepEqual(row.retrieved_verses, v3Judged[i].retrieved_verses);
      assert.equal(row.recall_at_5, v3Judged[i].recall_at_5);
      assert.equal(row.mrr, v3Judged[i].mrr);
    });
  });

  test("the two Recall@5 misses are aion_027 and aion_036", () => {
    const misses = v3Judged.filter((r) => r.recall_at_5 === 0).map((r) => r.id);
    assert.deepEqual(misses, ["aion_027", "aion_036"]);
  });

  test("mean citation support is 0.978 over 34 rows, with none below 0.5", () => {
    assert.equal(citationRows.length, 34);
    assert.equal(f3(mean(citationRows.map((r) => r.citation_support as number))), "0.978");
    assert.equal(citationRows.filter((r) => (r.citation_support as number) < 0.5).length, 0);
    assert.equal(citationRows.filter((r) => (r.citation_support as number) <= 0.25).length, 0);
  });

  test("two rows score below 1.0, and one of them sits exactly on the 0.5 cutoff", () => {
    const below = citationRows
      .filter((r) => (r.citation_support as number) < 1)
      .map((r) => [r.id, r.citation_support]);
    assert.deepEqual(below, [
      ["aion_021", 0.75],
      ["aion_035", 0.5],
    ]);
  });

  test("the six refusals are four false-premise and two adversarial questions", () => {
    assert.equal(refusalRows.length, 6);
    const refused = refusalRows.filter((r) => r.false_premise_refusal === 1);
    assert.equal(refused.length, 6);
    assert.equal(refused.filter((r) => r.category === "false_premise").length, 4);
    assert.equal(refused.filter((r) => r.category === "adversarial").length, 2);
  });

  test("one judge model scored every row", () => {
    assert.deepEqual([...new Set(v3Judged.map((r) => r.judge_model))], ["gemini-3.1-flash-lite"]);
  });

  test("per-category figures match the paper's per-category table", () => {
    const expected: Record<string, [string, string, string]> = {
      direct: ["1.000", "1.000", "1.000"],
      interpretive: ["1.000", "0.929", "1.000"],
      thematic: ["0.917", "0.524", "0.979"],
      multi_hop: ["0.800", "0.700", "0.900"],
    };
    for (const [category, [r5, rank, support]] of Object.entries(expected)) {
      const rows = v3Judged.filter((r) => r.category === category);
      assert.equal(f3(mean(rows.map((r) => r.recall_at_5 as number))), r5, `${category} R@5`);
      assert.equal(f3(mean(rows.map((r) => r.mrr as number))), rank, `${category} MRR`);
      assert.equal(f3(mean(rows.map((r) => r.citation_support as number))), support, category);
    }
  });
});

describe("confidence intervals", () => {
  test("the 95% Wilson interval for 32 of 34 is [0.81, 0.98]", () => {
    const [low, high] = wilson(32, 34);
    assert.equal(low.toFixed(2), "0.81");
    assert.equal(high.toFixed(2), "0.98");
  });

  test("the 95% Wilson interval for multi-hop, 4 of 5, is [0.38, 0.96]", () => {
    const [low, high] = wilson(4, 5);
    assert.equal(low.toFixed(2), "0.38");
    assert.equal(high.toFixed(2), "0.96");
  });
});

describe("context size and the multi-hop notes", () => {
  test("the model was given up to six verses; Recall@5 reads the first five", () => {
    const sizes = v3Judged.map((r) => r.retrieved_verses.length);
    assert.equal(Math.max(...sizes), 6);
    assert.equal(sizes.filter((n) => n === 6).length, 20);
  });

  test("aion_034 passes through cluster members, not through a gold verse", () => {
    const row = v3Judged.find((r) => r.id === "aion_034");
    assert.ok(row);
    assert.deepEqual(row.retrieved_verses, [
      "2CO.1.24",
      "JAS.2.14",
      "GAL.3.2",
      "JUD.1.1",
      "GAL.3.5",
      "1TH.1.3",
    ]);
    assert.equal(row.recall_at_5, 1);
    assert.ok(!row.retrieved_verses.includes("JAS.2.17"));
    assert.ok(!row.retrieved_verses.includes("ROM.3.28"));
    const question = gold03.find((q) => q.id === "aion_034");
    assert.ok(question);
    const members = new Set(question.acceptable_verse_clusters.flat());
    const hits = row.retrieved_verses.slice(0, 5).filter((v) => members.has(v));
    assert.deepEqual(hits, ["JAS.2.14", "GAL.3.2", "GAL.3.5"]);
  });

  test("four of five multi-hop questions have every required chapter in the first five", () => {
    const byId = new Map(gold03.map((q) => [q.id, q]));
    const failing: string[] = [];
    for (const row of v3Judged.filter((r) => r.category === "multi_hop")) {
      const question = byId.get(row.id);
      assert.ok(question);
      const required = new Set(question.gold_verses.map((v) => `${v.book_id}.${v.chapter}`));
      const present = new Set(
        row.retrieved_verses.slice(0, 5).map((v) => v.split(".").slice(0, 2).join(".")),
      );
      if (![...required].every((chapter) => present.has(chapter))) failing.push(row.id);
    }
    assert.deepEqual(failing, ["aion_034"]);
  });
});

describe("benchmark progression", () => {
  test("each frozen run reproduces its reported Recall@5 and MRR", () => {
    const first = storedScore(v1);
    assert.deepEqual([first.n, first.hits], [34, 23]);
    assert.equal(f3(first.recall), "0.676");
    assert.equal(f3(first.mrr), "0.552");

    const second = storedScore(v2);
    assert.deepEqual([second.n, second.hits], [34, 30]);
    assert.equal(f3(second.recall), "0.882");
    assert.equal(f3(second.mrr), "0.700");
  });

  test("the v1 to v2 step is +0.177 from annotation and +0.029 from the system", () => {
    const v1OnGold02 = rescore(v1, gold02);
    assert.deepEqual([v1OnGold02.n, v1OnGold02.hits], [34, 29]);
    assert.equal(f3(v1OnGold02.recall), "0.853");
    assert.equal(f3(v1OnGold02.mrr), "0.633");
    // The summary file and the paper difference the rounded figures.
    assert.equal((0.853 - 0.676).toFixed(3), "0.177");
    assert.equal((0.882 - 0.853).toFixed(3), "0.029");
    assert.equal(storedScore(v2).hits - v1OnGold02.hits, 1);
  });

  test("v3 scores 0.882 with MRR 0.714 on v0.2 gold and 0.941 on v0.3 gold", () => {
    const onGold02 = rescore(v3, gold02);
    assert.equal(onGold02.hits, 30);
    assert.equal(f3(onGold02.recall), "0.882");
    assert.equal(f3(onGold02.mrr), "0.714");
    assert.equal(rescore(v3, gold03).hits, 32);
  });

  test("every frozen run rescored against every gold version", () => {
    const hits = [v1, v2, v3].map((run) =>
      [gold01, gold02, gold03].map((gold) => rescore(run, gold).hits),
    );
    assert.deepEqual(hits, [
      [23, 29, 30],
      [25, 30, 32],
      [26, 30, 32],
    ]);
  });

  test("gold v0.2 widened six questions and v0.3 widened two more; no question text changed", () => {
    const changed = (a: BenchmarkQuestion[], b: BenchmarkQuestion[]): string[] => {
      const before = new Map(a.map((q) => [q.id, q]));
      return b
        .filter((q) => {
          const old = before.get(q.id);
          assert.ok(old);
          assert.equal(old.question, q.question, q.id);
          assert.equal(old.category, q.category, q.id);
          return (
            JSON.stringify(old.gold_verses) !== JSON.stringify(q.gold_verses) ||
            JSON.stringify(old.acceptable_verse_clusters) !==
              JSON.stringify(q.acceptable_verse_clusters)
          );
        })
        .map((q) => q.id);
    };
    assert.deepEqual(changed(gold01, gold02), [
      "aion_006",
      "aion_019",
      "aion_024",
      "aion_028",
      "aion_034",
      "aion_036",
    ]);
    assert.deepEqual(changed(gold02, gold03), ["aion_023", "aion_033"]);
  });

  test("the stub_10 runs score 0.286 and 0.571 over seven scored questions", () => {
    const baseline = storedScore(
      loadJsonl<RunResult>(`${RESULTS}/baseline_hybrid_v0_stub10.jsonl`),
    );
    assert.equal(baseline.n, 7);
    assert.equal(f3(baseline.recall), "0.286");
    const reference = storedScore(loadJsonl<RunResult>(`${RESULTS}/v1_hybrid_ref_stub10.jsonl`));
    assert.equal(reference.n, 7);
    assert.equal(f3(reference.recall), "0.571");
  });

  test("three repeated v3 runs on v0.2 gold range from 0.853 to 0.882", () => {
    assert.equal(v3ThreeRuns.length, 120);
    const runs = [0, 1, 2].map((i) => v3ThreeRuns.slice(i * 40, (i + 1) * 40));
    for (const run of runs) assert.equal(new Set(run.map((r) => r.id)).size, 40);
    assert.deepEqual(
      runs.map((run) => f3(storedScore(run).recall)),
      ["0.882", "0.853", "0.882"],
    );
    const unstable = runs[0]
      .filter((row, i) => new Set(runs.map((run) => run[i].recall_at_5)).size > 1)
      .map((row) => row.id);
    assert.deepEqual(unstable, ["aion_006", "aion_007", "aion_036"]);
  });
});

describe("dataset facts quoted in the documentation", () => {
  test("gold_40 v0.3 has 34 retrieval questions and six refusal questions with no gold", () => {
    assert.equal(gold03.length, 40);
    assert.equal(gold03.filter((q) => q.gold_verses.length > 0).length, 34);
    const refusal = gold03.filter((q) => q.expected_behaviour !== "answer_with_citations");
    assert.equal(refusal.length, 6);
    for (const q of refusal) {
      assert.deepEqual(q.gold_verses, []);
      assert.deepEqual(q.acceptable_verse_clusters, []);
    }
  });

  test("57 of the 122 gold and cluster coordinates occur in a frozen retrieved list", () => {
    const coordinates = new Set<string>();
    for (const q of gold03) {
      for (const v of normaliseGoldVerses(q.gold_verses)) coordinates.add(v);
      for (const v of q.acceptable_verse_clusters.flat()) coordinates.add(v);
    }
    const retrieved = new Set<string>();
    const runFiles = [
      "baseline_hybrid_v0_stub10.jsonl",
      "phase3_citation_faithfulness_gold40_v03.jsonl",
      "v1_hybrid_ref_gold40.jsonl",
      "v1_hybrid_ref_stub10.jsonl",
      "v2_chapter_ref_gold40_v02.jsonl",
      "v3_direct_chapter_gold40_v02_final.jsonl",
      "v3_direct_chapter_gold40_v03.jsonl",
      "v3_direct_chapter_gold40_v03_judged.jsonl",
    ];
    for (const file of runFiles) {
      for (const row of loadJsonl<RunResult>(`${RESULTS}/${file}`)) {
        for (const v of row.retrieved_verses ?? []) retrieved.add(v);
      }
    }
    assert.equal(coordinates.size, 122);
    assert.equal([...coordinates].filter((v) => retrieved.has(v)).length, 57);
  });

  test("schema_version marks the version in which a row last changed", () => {
    const withVersion = (version: string): string[] =>
      gold03.filter((q) => q.schema_version === version).map((q) => q.id);
    assert.equal(withVersion("0.1").length, 32);
    assert.deepEqual(withVersion("0.2"), [
      "aion_006",
      "aion_019",
      "aion_024",
      "aion_028",
      "aion_034",
      "aion_036",
    ]);
    assert.deepEqual(withVersion("0.3"), ["aion_023", "aion_033"]);
  });

  test("the annotation guidelines name every row whose notes still ask for verification", () => {
    const stale = gold03.filter((q) => /verif/i.test(q.notes)).map((q) => q.id);
    assert.equal(stale.length, 10);
    assert.ok(gold03.every((q) => q.annotation_status === "verified"));
    const guidelines = readText(`${DATASETS}/annotation_guidelines.md`);
    const listed = section(guidelines, "## Stale notes").match(/aion_\d{3}/g) ?? [];
    assert.deepEqual([...new Set(listed)].sort(), stale);
  });
});

describe("the READMEs state the recomputed values", () => {
  test("README.md research table", () => {
    const stored = storedScore(v3Judged);
    const support = v3Judged.filter((r) => r.citation_support !== null);
    const refusals = v3Judged.filter((r) => r.false_premise_refusal !== null);
    const below = support.filter((r) => (r.citation_support as number) < 0.5).length;
    const refused = refusals.filter((r) => r.false_premise_refusal === 1).length;

    assert.equal(tableRow(readme, `Recall@5 (${stored.n} retrieval questions)`)[1], "0.941");
    assert.equal(tableRow(readme, "Recall@5 (34 retrieval questions)")[1], f3(stored.recall));
    assert.equal(tableRow(readme, "MRR")[1], f3(stored.mrr));
    assert.equal(
      tableRow(readme, "Mean citation support (LLM judge, 0–1 rubric)")[1],
      f3(mean(support.map((r) => r.citation_support as number))),
    );
    assert.equal(
      tableRow(readme, "Unsupported citations (score < 0.5)")[1],
      `${below} / ${support.length}`,
    );
    assert.equal(
      tableRow(readme, "False-premise and adversarial refusals")[1],
      `${refused} / ${refusals.length}`,
    );
  });

  test("research/README.md progression table", () => {
    const table = section(researchReadme, "## Benchmark progression");
    const cell = (system: string, dataset: string): string => {
      for (const line of table.split("\n")) {
        const cells = line.split("|").map((c) => c.trim());
        if (cells[1] === system && cells[2] === dataset) return cells[3];
      }
      throw new Error(`no progression row for ${system} on ${dataset}`);
    };
    assert.equal(cell("v0 baseline", "stub_10"), "0.286");
    assert.equal(cell("v1 hybrid_ref", "stub_10"), "0.571");
    assert.equal(cell("v1 hybrid_ref", "gold_40 v0.1"), f3(storedScore(v1).recall));
    assert.equal(cell("v1 hybrid_ref", "gold_40 v0.2"), f3(rescore(v1, gold02).recall));
    assert.equal(cell("v2 chapter_ref", "gold_40 v0.2"), f3(storedScore(v2).recall));
    assert.equal(cell("v3 direct_chapter", "gold_40 v0.2"), f3(rescore(v3, gold02).recall));
    assert.equal(cell("v3 direct_chapter", "gold_40 v0.3"), f3(storedScore(v3).recall));
  });

  test("research/README.md fixed-gold rescoring table", () => {
    const table = section(researchReadme, "### Every run against every gold version");
    const runs: [string, RunResult[]][] = [
      ["v1 hybrid_ref", v1],
      ["v2 chapter_ref", v2],
      ["v3 direct_chapter", v3],
    ];
    for (const [label, run] of runs) {
      const expected = [gold01, gold02, gold03].map((gold) => {
        const score = rescore(run, gold);
        return `${f3(score.recall)} (${score.hits}/${score.n})`;
      });
      assert.deepEqual(tableRow(table, label).slice(1), expected, label);
    }
  });

  test("research/README.md citation-faithfulness table", () => {
    const table = section(researchReadme, "## Phase 3 Citation-Faithfulness Results");
    assert.equal(tableRow(table, "Mean citation_support")[1], "0.978");
    assert.equal(tableRow(table, "Unsupported claim rate (cs < 0.5)")[1], "0.000");
    assert.equal(tableRow(table, "Decorative citation rate (cs ≤ 0.25)")[1], "0.000");
    assert.equal(tableRow(table, "False-premise / adversarial refusal")[1], "1.000 (6/6)");
  });

  test("the canonical phase-3 artefact is the same file as the judged run", () => {
    assert.equal(
      readText(`${RESULTS}/phase3_citation_faithfulness_gold40_v03.jsonl`),
      readText(`${RESULTS}/v3_direct_chapter_gold40_v03_judged.jsonl`),
    );
  });
});

describe("preprint v1.1 draft source", () => {
  const draft = readText("research/paper/latex/acl_latex_v1.1_draft.tex");
  // The closing appendix quotes the v1.0 wording it corrects, so the checks for
  // removed wording look at the paper body only.
  const body = draft.slice(0, draft.indexOf("\\section{Corrections in v1.1}"));

  test("is labelled as an unpublished correction of v1.0", () => {
    assert.ok(draft.includes("v1.1 draft, corrects v1.0; not yet published"));
  });

  test("carries the recomputed Wilson interval and the corrected aion_034 sentence", () => {
    const [low, high] = wilson(32, 34);
    assert.ok(draft.includes(`overall [${low.toFixed(2)},\\,${high.toFixed(2)}]`));
    assert.ok(!body.includes("[0.80,\\,0.97]"));
    assert.ok(!body.includes("JAS.2.17 retrieved"));
    assert.ok(draft.includes("JAS.2.14, GAL.3.2 and GAL.3.5"));
  });

  test("reports the annotation and system split with the rescored v1 row", () => {
    assert.ok(draft.includes("v1 hybrid-ref     & v0.2 & 0.853 & 0.633"));
    assert.ok(draft.includes("+0.177"));
    assert.ok(draft.includes("+0.029"));
  });

  test("no longer describes the refusals as six false-premise questions", () => {
    assert.ok(!body.includes("false-premise refusal rate of 1.000 (6/6)"));
    assert.ok(body.length > 0 && !body.includes("top-5 verses"));
  });
});
