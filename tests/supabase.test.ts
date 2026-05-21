/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";

// Mock react-native-url-polyfill/auto in require.cache
const polyfillPath = require.resolve("react-native-url-polyfill/auto");
require.cache[polyfillPath] = {
  id: polyfillPath,
  filename: polyfillPath,
  loaded: true,
  exports: {},
} as any;

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

// Mock @supabase/supabase-js createClient
const mockCreateClient = mock.fn((_url, _anonKey, _options) => {
  return {
    auth: {
      getSession: async () => ({ data: { session: null } }),
    },
  };
});
const supabasePath = require.resolve("@supabase/supabase-js");
require.cache[supabasePath] = {
  id: supabasePath,
  filename: supabasePath,
  loaded: true,
  exports: {
    createClient: mockCreateClient,
  },
} as any;

describe("Supabase Config and Instantiation", () => {
  test("isSupabaseConfigured flags placeholders and missing variables", () => {
    const originalEnv = { ...process.env };
    const libPath = require.resolve("../lib/supabase");

    try {
      // 1. With placeholder values, isSupabaseConfigured should be false
      process.env.EXPO_PUBLIC_SUPABASE_URL = "https://placeholder-url.supabase.co";
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "placeholder-anon-key";
      delete require.cache[libPath];

      const { isSupabaseConfigured, supabase } = require("../lib/supabase");
      assert.equal(isSupabaseConfigured, false, "Should be false with placeholder values");
      assert.ok(supabase, "Supabase client should still be instantiated");

      // 2. With valid configuration values, isSupabaseConfigured should be true
      process.env.EXPO_PUBLIC_SUPABASE_URL = "https://aion-app.supabase.co";
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "a-real-anon-key-uuid-or-string";
      delete require.cache[libPath];

      const { isSupabaseConfigured: configReal } = require("../lib/supabase");
      assert.equal(configReal, true, "Should be true with valid environment configuration");
    } finally {
      // Restore process environment and clear cache to prevent side effects
      process.env = originalEnv;
      delete require.cache[libPath];
    }
  });
});
