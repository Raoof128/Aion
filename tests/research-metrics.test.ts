import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  normaliseCoord,
  normaliseGoldVerses,
  recallAt5,
  precisionAt5,
  mrr,
} from "../research/harness/metrics-retrieval.ts";
import type { VerseCoord } from "../research/harness/types.ts";

describe("normaliseCoord", () => {
  test("uses book_id when present", () => {
    assert.equal(normaliseCoord({ book_id: "MAT", chapter: 6, verse: 14 }), "MAT.6.14");
  });

  test("falls back to book_name via BOOK_NAME_TO_ID map", () => {
    assert.equal(normaliseCoord({ book_name: "Matthew", chapter: 3, verse: 16 }), "MAT.3.16");
  });

  test("returns UNK for unknown book_name", () => {
    assert.equal(normaliseCoord({ book_name: "Apocrypha", chapter: 1, verse: 1 }), "UNK.1.1");
  });

  test("book_id takes precedence over book_name", () => {
    assert.equal(
      normaliseCoord({ book_id: "EPH", book_name: "Matthew", chapter: 4, verse: 32 }),
      "EPH.4.32",
    );
  });
});

describe("normaliseGoldVerses", () => {
  test("converts VerseCoord array to dot-notation strings", () => {
    const coords: VerseCoord[] = [
      { book_id: "MAT", chapter: 6, verse: 14 },
      { book_id: "EPH", chapter: 4, verse: 32 },
    ];
    assert.deepEqual(normaliseGoldVerses(coords), ["MAT.6.14", "EPH.4.32"]);
  });

  test("returns empty array for empty input", () => {
    assert.deepEqual(normaliseGoldVerses([]), []);
  });
});

describe("recallAt5", () => {
  test("returns 1 when gold verse is in top 5", () => {
    assert.equal(
      recallAt5(["MAT.6.14", "ROM.8.1", "JHN.3.16", "PSA.23.1", "EPH.4.1"], ["MAT.6.14"], []),
      1,
    );
  });

  test("returns 0 when gold verse is not in top 5", () => {
    assert.equal(
      recallAt5(["ROM.8.1", "JHN.3.16", "PSA.23.1", "EPH.4.1", "COL.3.1"], ["MAT.6.14"], []),
      0,
    );
  });

  test("only considers first 5 retrieved, gold at position 6 is a miss", () => {
    assert.equal(
      recallAt5(
        ["ROM.8.1", "JHN.3.16", "PSA.23.1", "COL.3.1", "HEB.11.1", "MAT.6.14"],
        ["MAT.6.14"],
        [],
      ),
      0,
    );
  });

  test("matches via acceptable_verse_clusters", () => {
    assert.equal(
      recallAt5(
        ["MAT.6.15", "ROM.8.1", "JHN.3.16", "PSA.23.1", "EPH.4.1"],
        ["MAT.6.14"],
        [["MAT.6.14", "MAT.6.15"]],
      ),
      1,
    );
  });

  test("returns 0 for empty retrieved list", () => {
    assert.equal(recallAt5([], ["MAT.6.14"], []), 0);
  });
});

describe("precisionAt5", () => {
  test("2 of 5 retrieved are gold → 0.4", () => {
    assert.equal(
      precisionAt5(
        ["MAT.6.14", "EPH.4.32", "ROM.8.1", "JHN.3.16", "PSA.23.1"],
        ["MAT.6.14", "EPH.4.32"],
        [],
      ),
      0.4,
    );
  });

  test("0 of 5 retrieved are gold → 0.0", () => {
    assert.equal(
      precisionAt5(["ROM.8.1", "JHN.3.16", "PSA.23.1", "COL.3.1", "HEB.11.1"], ["MAT.6.14"], []),
      0.0,
    );
  });

  test("5 of 5 retrieved are gold → 1.0", () => {
    assert.equal(
      precisionAt5(
        ["MAT.6.14", "EPH.4.32", "ROM.8.29", "PHP.4.6", "1PE.5.7"],
        ["MAT.6.14", "EPH.4.32", "ROM.8.29", "PHP.4.6", "1PE.5.7"],
        [],
      ),
      1.0,
    );
  });

  test("acceptable cluster match counts toward precision", () => {
    // MAT.6.15 is in an acceptable cluster for MAT.6.14
    assert.equal(
      precisionAt5(
        ["MAT.6.15", "ROM.8.1", "JHN.3.16", "PSA.23.1", "EPH.4.1"],
        ["MAT.6.14"],
        [["MAT.6.14", "MAT.6.15"]],
      ),
      0.2,
    );
  });
});

describe("mrr", () => {
  test("first match at rank 1 → 1.0", () => {
    assert.equal(
      mrr(["MAT.6.14", "ROM.8.1", "JHN.3.16", "PSA.23.1", "EPH.4.1"], ["MAT.6.14"], []),
      1.0,
    );
  });

  test("first match at rank 2 → 0.5", () => {
    assert.equal(
      mrr(["ROM.8.1", "MAT.6.14", "JHN.3.16", "PSA.23.1", "EPH.4.1"], ["MAT.6.14"], []),
      0.5,
    );
  });

  test("first match at rank 5 → 0.2", () => {
    assert.equal(
      mrr(["ROM.8.1", "JHN.3.16", "PSA.23.1", "COL.3.1", "MAT.6.14"], ["MAT.6.14"], []),
      0.2,
    );
  });

  test("no match → 0.0", () => {
    assert.equal(
      mrr(["ROM.8.1", "JHN.3.16", "PSA.23.1", "COL.3.1", "HEB.11.1"], ["MAT.6.14"], []),
      0.0,
    );
  });

  test("acceptable cluster match at rank 3 → 1/3", () => {
    const result = mrr(
      ["ROM.8.1", "JHN.3.16", "MAT.6.15", "COL.3.1", "HEB.11.1"],
      ["MAT.6.14"],
      [["MAT.6.14", "MAT.6.15"]],
    );
    assert.ok(Math.abs(result - 1 / 3) < 1e-9);
  });
});
