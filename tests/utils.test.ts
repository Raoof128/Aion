import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { timeAgo } from "../lib/utils";

describe("Utils Module", () => {
  test("timeAgo formatting for different ranges", () => {
    const now = Date.now();

    // 1. Seconds ago -> "just now"
    const justNowDate = new Date(now - 15 * 1000).toISOString();
    assert.equal(timeAgo(justNowDate), "just now");

    const edgeSecondsDate = new Date(now - 59 * 1000).toISOString();
    assert.equal(timeAgo(edgeSecondsDate), "just now");

    // 2. Minutes ago -> "Xm ago"
    const fiveMinsDate = new Date(now - 5 * 60 * 1000).toISOString();
    assert.equal(timeAgo(fiveMinsDate), "5m ago");

    const fiftyNineMinsDate = new Date(now - 59 * 60 * 1000).toISOString();
    assert.equal(timeAgo(fiftyNineMinsDate), "59m ago");

    // 3. Hours ago -> "Xh ago"
    const oneHourDate = new Date(now - 60 * 60 * 1000).toISOString();
    assert.equal(timeAgo(oneHourDate), "1h ago");

    const twentyThreeHoursDate = new Date(now - 23 * 60 * 60 * 1000).toISOString();
    assert.equal(timeAgo(twentyThreeHoursDate), "23h ago");

    // 4. Days ago -> "Xd ago"
    const oneDayDate = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    assert.equal(timeAgo(oneDayDate), "1d ago");

    const tenDaysDate = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();
    assert.equal(timeAgo(tenDaysDate), "10d ago");
  });
});
