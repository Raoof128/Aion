/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

// Mock @react-native-async-storage/async-storage in require.cache
const storagePath = require.resolve("@react-native-async-storage/async-storage");
require.cache[storagePath] = {
  id: storagePath,
  filename: storagePath,
  loaded: true,
  exports: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  },
} as any;

const { fontScale, lightColors } = require("../lib/settings");

describe("Settings Module", () => {
  test("fontScale mappings", () => {
    assert.equal(fontScale("small"), 0.85);
    assert.equal(fontScale("medium"), 1.0);
    assert.equal(fontScale("large"), 1.2);
  });

  test("lightColors configuration validation", () => {
    assert.ok(lightColors, "lightColors should be exported and defined");
    assert.equal(lightColors.void, "#FFFFFF");
    assert.equal(lightColors.textPrimary, "#1A1A2E");
    assert.equal(lightColors.errorBg, "rgba(220, 38, 38, 0.08)");
  });
});
