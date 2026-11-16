// supabase/functions/transcribe/index.ts
//
// Server-side proxy for OpenAI Whisper, used by the native (iOS/Android) voice input.
// The OpenAI key stays an Edge Function secret; the client sends only its Supabase
// session JWT and the recorded audio. Web clients use the browser Web Speech API and
// never call this function.
//
// Abuse controls: anonymous sign-in means any client can mint a JWT, so the real limits
// are the per-IP and global caps in check_transcribe_rate_limit (fail closed), plus a
// hard byte cap enforced while streaming the body, before it is parsed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const anonSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ~2 minutes of m4a at the expo-audio HIGH_QUALITY preset (128 kbps).
const MAX_AUDIO_BYTES = 2 * 1024 * 1024;
// Multipart framing and headers on top of the audio itself.
const MAX_BODY_BYTES = MAX_AUDIO_BYTES + 64 * 1024;
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

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

class BodyTooLargeError extends Error {}

// Reads the request body with a running byte count and aborts as soon as it passes
// `limit`, so a chunked upload without Content-Length cannot be buffered unbounded.
async function readBodyCapped(req: Request, limit: number): Promise<Uint8Array<ArrayBuffer>> {
  if (!req.body) return new Uint8Array(0);
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new BodyTooLargeError();
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

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

  // Fast reject when the client declares an oversized body; readBodyCapped below
  // enforces the same cap when Content-Length is missing or wrong.
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return json({ error: "Audio too large" }, 413);

  // Rate limit by IP (anonymous user ids are free to mint). Fail closed.
  const { data: rl, error: rlError } = await serviceSupabase.rpc("check_transcribe_rate_limit", {
    p_ip_address: getClientIp(req),
    p_user_id: user.id,
  });
  if (rlError || !rl?.[0]) return json({ error: "Rate limit check failed. Please try again." }, 429);
  if (!rl[0].allowed) return json({ error: rl[0].message ?? "Too many requests" }, 429);

  let raw: Uint8Array<ArrayBuffer>;
  try {
    raw = await readBodyCapped(req, MAX_BODY_BYTES);
  } catch (err) {
    if (err instanceof BodyTooLargeError) return json({ error: "Audio too large" }, 413);
    return json({ error: "Could not read request body" }, 400);
  }

  let file: File;
  try {
    const form = await new Response(raw, {
      headers: { "Content-Type": req.headers.get("content-type") ?? "" },
    }).formData();
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
