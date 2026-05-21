import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://placeholder-url.supabase.co";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const isSupabaseConfigured = !!(
  process.env.EXPO_PUBLIC_SUPABASE_URL &&
  process.env.EXPO_PUBLIC_SUPABASE_URL !== "https://your-project.supabase.co" &&
  !process.env.EXPO_PUBLIC_SUPABASE_URL.includes("placeholder-url") &&
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY !== "your-anon-key" &&
  !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.includes("placeholder-anon-key")
);

if (!isSupabaseConfigured) {
  console.warn(
    "Warning: Supabase environment variables (EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY) are missing or using placeholder values. Please check your .env file.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
