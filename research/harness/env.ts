import { parseArgs } from "node:util";

function getCliArgs(): { dataset?: string; out?: string } {
  try {
    const { values } = parseArgs({
      args: process.argv.slice(2),
      options: {
        dataset: { type: "string" },
        out: { type: "string" },
      },
      strict: false,
    });
    return values as { dataset?: string; out?: string };
  } catch {
    return {};
  }
}

const args = getCliArgs();

export const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
export const DEV_BYPASS_SECRET = process.env.EXPO_PUBLIC_DEV_BYPASS || "";
export const DATASET_PATH =
  args.dataset || process.env.DATASET_PATH || "research/datasets/stub_10.jsonl";
export const OUTPUT_PATH = args.out || process.env.OUTPUT_PATH || "research/results/raw_runs.jsonl";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "Error: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set.\n" +
      "Run with: tsx --env-file .env research/harness/run-benchmark.ts",
  );
  process.exit(1);
}
