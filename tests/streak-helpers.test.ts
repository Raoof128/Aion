// tests/streak-helpers.test.ts
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isoWeekStart, buildWeekDays } from "../lib/streak-helpers.js";

describe("isoWeekStart", () => {
  test("Monday returns itself", () => {
    assert.equal(isoWeekStart("2026-05-25"), "2026-05-25");
  });

  test("Sunday returns previous Monday", () => {
    assert.equal(isoWeekStart("2026-05-24"), "2026-05-18");
  });

  test("Saturday returns previous Monday", () => {
    assert.equal(isoWeekStart("2026-05-23"), "2026-05-18");
  });

  test("Wednesday mid-week returns Monday", () => {
    assert.equal(isoWeekStart("2026-05-27"), "2026-05-25");
  });
});

describe("buildWeekDays", () => {
  test("today without a record shows today status", () => {
    const days = buildWeekDays("2026-05-25", "2026-05-25", []);
    const today = days.find((d) => d.date === "2026-05-25");
    assert.equal(today?.status, "today");
  });

  test("today with active record shows active", () => {
    const days = buildWeekDays("2026-05-25", "2026-05-25", [
      { local_date: "2026-05-25", status: "active" },
    ]);
    const today = days.find((d) => d.date === "2026-05-25");
    assert.equal(today?.status, "active");
  });

  test("past day with no record shows missed", () => {
    const days = buildWeekDays("2026-05-27", "2026-05-25", []);
    const mon = days.find((d) => d.date === "2026-05-25");
    assert.equal(mon?.status, "missed");
  });

  test("frozen day shows frozen", () => {
    const days = buildWeekDays("2026-05-26", "2026-05-25", [
      { local_date: "2026-05-25", status: "active" },
      { local_date: "2026-05-26", status: "frozen" },
    ]);
    assert.equal(days.find((d) => d.date === "2026-05-26")?.status, "frozen");
  });

  test("future days show future status", () => {
    const days = buildWeekDays("2026-05-25", "2026-05-25", []);
    assert.ok(days.some((d) => d.status === "future"));
  });

  test("produces exactly 7 days", () => {
    const days = buildWeekDays("2026-05-25", "2026-05-25", []);
    assert.equal(days.length, 7);
  });
});
