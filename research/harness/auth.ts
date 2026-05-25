import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env.ts";

/** Signs in anonymously and returns a short-lived JWT for the benchmark session. */
export async function getAnonToken(): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.session) {
    throw new Error(`Anonymous auth failed: ${error?.message ?? "no session returned"}`);
  }
  return data.session.access_token;
}
