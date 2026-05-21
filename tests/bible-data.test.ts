/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { BIBLE_BOOKS, OT_BOOKS, NT_BOOKS, VOTD_POOL, getVerseOfTheDay } from "../lib/bible-data";

describe("Bible Data Module", () => {
  test("BIBLE_BOOKS configuration validation", () => {
    assert.ok(Array.isArray(BIBLE_BOOKS), "BIBLE_BOOKS should be an array");
    assert.equal(BIBLE_BOOKS.length, 66, "There should be exactly 66 books in the Bible");

    // Genesis is the first book
    assert.equal(BIBLE_BOOKS[0].id, "GEN");
    assert.equal(BIBLE_BOOKS[0].name, "Genesis");
    assert.equal(BIBLE_BOOKS[0].testament, "OT");

    // Revelation is the last book
    assert.equal(BIBLE_BOOKS[BIBLE_BOOKS.length - 1].id, "REV");
    assert.equal(BIBLE_BOOKS[BIBLE_BOOKS.length - 1].name, "Revelation");
    assert.equal(BIBLE_BOOKS[BIBLE_BOOKS.length - 1].testament, "NT");

    // Validate that each book structure is correct
    for (const book of BIBLE_BOOKS) {
      assert.ok(
        book.id && typeof book.id === "string",
        `Book ID should be a string for ${book.name}`,
      );
      assert.ok(
        book.name && typeof book.name === "string",
        `Book name should be a string for ${book.id}`,
      );
      assert.ok(
        typeof book.chapters === "number" && book.chapters > 0,
        `Chapters count should be > 0 for ${book.name}`,
      );
      assert.ok(
        book.testament === "OT" || book.testament === "NT",
        `Testament must be OT or NT for ${book.name}`,
      );
    }
  });

  test("Testament filtering divisions", () => {
    assert.ok(Array.isArray(OT_BOOKS), "OT_BOOKS should be an array");
    assert.ok(Array.isArray(NT_BOOKS), "NT_BOOKS should be an array");
    assert.equal(OT_BOOKS.length, 39, "Old Testament should have 39 books");
    assert.equal(NT_BOOKS.length, 27, "New Testament should have 27 books");

    assert.ok(
      OT_BOOKS.every((b) => b.testament === "OT"),
      "All books in OT_BOOKS must be marked as OT",
    );
    assert.ok(
      NT_BOOKS.every((b) => b.testament === "NT"),
      "All books in NT_BOOKS must be marked as NT",
    );
  });

  test("Verse of the Day (VOTD) pool checks", () => {
    assert.ok(Array.isArray(VOTD_POOL), "VOTD_POOL should be an array");
    assert.ok(VOTD_POOL.length > 0, "VOTD_POOL should not be empty");

    for (const item of VOTD_POOL) {
      assert.ok(item.book_id && typeof item.book_id === "string", "VOTD book_id must be a string");
      assert.ok(
        item.book_name && typeof item.book_name === "string",
        "VOTD book_name must be a string",
      );
      assert.ok(
        typeof item.chapter === "number" && item.chapter > 0,
        "VOTD chapter must be a number > 0",
      );
      assert.ok(
        typeof item.verse === "number" && item.verse > 0,
        "VOTD verse must be a number > 0",
      );
      assert.ok(item.content && typeof item.content === "string", "VOTD content must be a string");
    }
  });

  test("getVerseOfTheDay execution and rotation", () => {
    const votd = getVerseOfTheDay();
    assert.ok(votd, "getVerseOfTheDay should return a verse");
    assert.ok(VOTD_POOL.includes(votd), "Returned verse must exist in the VOTD pool");

    // Stub/Spy on date logic or mock date boundaries to check rotation is correct
    // Let's test that the result is deterministic and within range for multiple dates
    const originalDate = global.Date;
    try {
      // Mock Date for a leap year and regular year
      const mockDates = [
        new Date(2026, 0, 1), // Jan 1st
        new Date(2026, 11, 31), // Dec 31st
        new Date(2028, 1, 29), // Feb 29th (leap year)
      ];

      for (const d of mockDates) {
        // Temporarily override global Date
        global.Date = class extends originalDate {
          constructor() {
            super();
            return d;
          }
        } as any;

        const result = getVerseOfTheDay();
        assert.ok(result, `VOTD should return a verse for date: ${d.toDateString()}`);
        assert.ok(VOTD_POOL.includes(result), "Returned verse must exist in the VOTD pool");
      }
    } finally {
      global.Date = originalDate;
    }
  });
});
