/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

// AsyncStorage mock — keyed in-memory map, cleared per test group via storage.clear()
const storage = new Map<string, string>();
const storagePath = require.resolve("@react-native-async-storage/async-storage");
require.cache[storagePath] = {
  id: storagePath,
  filename: storagePath,
  loaded: true,
  exports: {
    getItem: async (key: string) => storage.get(key) ?? null,
    setItem: async (key: string, val: string) => {
      storage.set(key, val);
    },
    removeItem: async (key: string) => {
      storage.delete(key);
    },
  },
} as any;

// Return a fresh module instance so the module-level `cachedSettings` is null.
function freshModule() {
  const p = require.resolve("../lib/bookBackgroundSettings");
  delete require.cache[p];
  return require("../lib/bookBackgroundSettings") as typeof import("../lib/bookBackgroundSettings");
}

describe("BookBackgroundSettings Module", () => {
  test("loadBgSettings returns defaults when storage is empty", async () => {
    storage.clear();
    const { loadBgSettings, DEFAULT_BG_SETTINGS } = freshModule();
    const result = await loadBgSettings("gen");
    assert.deepEqual(result, DEFAULT_BG_SETTINGS);
  });

  test("saveBgSettings persists settings and loadBgSettings reads them back", async () => {
    storage.clear();
    const { saveBgSettings } = freshModule();
    const settings = { positionX: 10, positionY: 20, scale: 1.5, overlayOpacity: 0.3 };
    await saveBgSettings("exo", settings);
    // Fresh instance to bypass in-memory cache and force a storage read
    const { loadBgSettings: freshLoad } = freshModule();
    const result = await freshLoad("exo");
    assert.deepEqual(result, settings);
  });

  test("loadBgSettings merges partial saves with defaults", async () => {
    storage.clear();
    const { saveBgSettings, DEFAULT_BG_SETTINGS } = freshModule();
    const partial = { ...DEFAULT_BG_SETTINGS, overlayOpacity: 0.5 };
    await saveBgSettings("lev", partial);
    const { loadBgSettings } = freshModule();
    const result = await loadBgSettings("lev");
    assert.equal(result.overlayOpacity, 0.5);
    assert.equal(result.positionX, DEFAULT_BG_SETTINGS.positionX);
    assert.equal(result.scale, DEFAULT_BG_SETTINGS.scale);
  });

  test("loadBgSettings isolates settings per book", async () => {
    storage.clear();
    const { saveBgSettings } = freshModule();
    await saveBgSettings("gen", { positionX: 1, positionY: 0, scale: 1, overlayOpacity: 0 });
    await saveBgSettings("rev", { positionX: 99, positionY: 0, scale: 2, overlayOpacity: 0.5 });
    const { loadBgSettings } = freshModule();
    const gen = await loadBgSettings("gen");
    const rev = await loadBgSettings("rev");
    assert.equal(gen.positionX, 1);
    assert.equal(rev.positionX, 99);
  });

  test("getBgSettingsSync returns defaults when cache has not been populated", () => {
    const { getBgSettingsSync, DEFAULT_BG_SETTINGS } = freshModule();
    const result = getBgSettingsSync("num");
    assert.deepEqual(result, DEFAULT_BG_SETTINGS);
  });

  test("getBgSettingsSync returns cached value after loadBgSettings", async () => {
    storage.clear();
    const { saveBgSettings, loadBgSettings, getBgSettingsSync } = freshModule();
    const settings = { positionX: 5, positionY: 5, scale: 1.2, overlayOpacity: 0.1 };
    await saveBgSettings("deu", settings);
    await loadBgSettings("deu"); // populates module-level cache
    const result = getBgSettingsSync("deu");
    assert.deepEqual(result, settings);
  });

  test("resetBgSettings removes a book and next load returns defaults", async () => {
    storage.clear();
    const { saveBgSettings, loadBgSettings, resetBgSettings, DEFAULT_BG_SETTINGS } = freshModule();
    await saveBgSettings("job", { positionX: 7, positionY: 7, scale: 2, overlayOpacity: 0.4 });
    await loadBgSettings("job"); // populate cache so reset can run
    await resetBgSettings("job");
    // Fresh module reads updated storage — "job" key is gone
    const { loadBgSettings: freshLoad } = freshModule();
    const result = await freshLoad("job");
    assert.deepEqual(result, DEFAULT_BG_SETTINGS);
  });

  test("loadBgSettings returns defaults on corrupt JSON in storage", async () => {
    storage.set("aion_book_bg_settings", "not-valid-json{{{");
    const { loadBgSettings, DEFAULT_BG_SETTINGS } = freshModule();
    const result = await loadBgSettings("psa");
    assert.deepEqual(result, DEFAULT_BG_SETTINGS);
  });
});
