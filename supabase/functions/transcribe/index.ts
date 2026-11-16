// supabase/functions/transcribe/index.ts
//
// Server-side proxy for OpenAI Whisper, used by the native (iOS/Android) voice input.
// The OpenAI key stays an Edge Function secret; the client sends only its Supabase
// session JWT and the recorded audio. Web clients use the browser Web Speech API and
// never call this function.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const anonSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ~2 minutes of m4a at the expo-audio HIGH_QUALITY preset (128 kbps).
const MAX_AUDIO_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "audio/m4a",
  "audio/x-m4a",
  "audio/mp4",
  "audio/aac",
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
  "",
]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const tokenMatch = (req.headers.get("Authorization") ?? "").match(/^Bearer\s+(\S+)$/);
  if (!tokenMatch) return json({ error: "Missing or malformed Authorization header" }, 401);

  const {
    data: { user },
    error: authError,
  } = await anonSupabase.auth.getUser(tokenMatch[1]);
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  // Reject oversized bodies before buffering them when the client declares a length.
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_AUDIO_BYTES + 64 * 1024) return json({ error: "Audio too large" }, 413);

  let file: File;
  try {
    const form = await req.formData();
    const entry = form.get("file");
    if (!(entry instanceof File)) return json({ error: "Missing audio file" }, 400);
    file = entry;
  } catch {
    return json({ error: "Expected multipart/form-data" }, 400);
  }

  if (file.size === 0) return json({ error: "Empty audio file" }, 400);
  if (file.size > MAX_AUDIO_BYTES) return json({ error: "Audio too large" }, 413);
  if (!ALLOWED_TYPES.has(file.type)) return json({ error: "Unsupported audio type" }, 415);

  const upstream = new FormData();
  upstream.append("file", file, file.name || "audio.m4a");
  upstream.append("model", "whisper-1");

  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: upstream,
    });
    if (!res.ok) {
      console.error(`Whisper error ${res.status}`);
      return json({ error: "Transcription failed" }, 502);
    }
    const data = await res.json();
    return json({ text: typeof data.text === "string" ? data.text : "" }, 200);
  } catch (err) {
    console.error("Whisper request failed", err);
    return json({ error: "Transcription failed" }, 502);
  }
});
