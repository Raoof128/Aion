/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";

// Mock @react-native-async-storage/async-storage in require.cache
const storage = new Map<string, string>();
const storagePath = require.resolve("@react-native-async-storage/async-storage");
require.cache[storagePath] = {
  id: storagePath,
  filename: storagePath,
  loaded: true,
  exports: {
    getItem: async (key: string) => storage.get(key) || null,
    setItem: async (key: string, val: string) => {
      storage.set(key, val);
    },
    removeItem: async (key: string) => {
      storage.delete(key);
    },
  },
} as any;

// Mock react-native Platform in require.cache
const reactNativePath = require.resolve("react-native");
let mockPlatformOS = "web";
require.cache[reactNativePath] = {
  id: reactNativePath,
  filename: reactNativePath,
  loaded: true,
  exports: {
    Platform: {
      get OS() {
        return mockPlatformOS;
      },
    },
  },
} as any;

// Stub global window objects for web Notification APIs
const mockRequestPermission = mock.fn(async () => "granted");
// Use a proxy or normal class constructor to trace new Notification calls
const mockNotificationCalls: any[] = [];
class MockNotification {
  static permission = "default";
  static requestPermission = mockRequestPermission;
  constructor(public title: string, public options: any) {
    mockNotificationCalls.push({ title, options });
  }
}

(global as any).window = {
  Notification: MockNotification,
};
(global as any).Notification = MockNotification;

const {
  isDailyVerseEnabled,
  setDailyVerseEnabled,
  getDailyVerse,
  sendDailyVerseNotification,
} = require("../lib/notifications");

describe("Notifications Module", () => {
  test("isDailyVerseEnabled storage logic", async () => {
    storage.clear();
    // Default should be false
    let enabled = await isDailyVerseEnabled();
    assert.equal(enabled, false, "Should default to false when storage is empty");

    // Setting enabled to true
    await setDailyVerseEnabled(true);
    enabled = await isDailyVerseEnabled();
    assert.equal(enabled, true, "Should return true after enabling");
    assert.equal(storage.get("aion_daily_verse_enabled"), "true", "Storage value must be 'true'");

    // Setting enabled to false
    await setDailyVerseEnabled(false);
    enabled = await isDailyVerseEnabled();
    assert.equal(enabled, false, "Should return false after disabling");
    assert.equal(storage.get("aion_daily_verse_enabled"), "false", "Storage value must be 'false'");
  });

  test("getDailyVerse index and consistency", () => {
    const originalDate = global.Date;
    try {
      // Pin date to Jan 1st, 2026 (day 1 of year)
      const d1 = new originalDate(2026, 0, 1);
      global.Date = class extends originalDate {
        constructor(...args: any[]) {
          super();
          if (args.length === 0) {
            return d1;
          }
          return new (originalDate as any)(...args);
        }
      } as any;
      const v1 = getDailyVerse();

      // Pin date to Jan 2nd, 2026 (day 2 of year)
      const d2 = new originalDate(2026, 0, 2);
      global.Date = class extends originalDate {
        constructor(...args: any[]) {
          super();
          if (args.length === 0) {
            return d2;
          }
          return new (originalDate as any)(...args);
        }
      } as any;
      const v2 = getDailyVerse();

      // They should rotate (be different if DAILY_VERSES pool rotates)
      assert.notDeepEqual(v1, v2, "Daily verses should rotate across subsequent days");
    } finally {
      global.Date = originalDate;
    }
  });

  test("sendDailyVerseNotification web notification interactions", async () => {
    mockPlatformOS = "web";
    MockNotification.permission = "granted";
    mockNotificationCalls.length = 0;

    sendDailyVerseNotification();
    assert.equal(mockNotificationCalls.length, 1, "Should instantiate a Notification on web");

    const callArgs = mockNotificationCalls[0];
    assert.match(callArgs.title, /^Aion — /, "Notification title should match the Aion namespace prefix");
    assert.ok(callArgs.options.body, "Notification body should contain verse text");
  });

  test("sendDailyVerseNotification native bypass", async () => {
    mockPlatformOS = "ios";
    mockNotificationCalls.length = 0;

    sendDailyVerseNotification();
    assert.equal(
      mockNotificationCalls.length,
      0,
      "Should not create web notifications on native platforms",
    );
  });
});
