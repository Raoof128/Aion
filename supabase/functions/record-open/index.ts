// supabase/functions/record-open/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const anonSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_TIMEZONE_LENGTH = 64;

// Returns "YYYY-MM-DD" for now() converted to an IANA timezone.
function toLocalDateString(utcDate: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(utcDate);
  } catch {
    return utcDate.toISOString().slice(0, 10);
  }
}

// Returns the ISO week Monday "YYYY-MM-DD" for a local date string.
function isoWeekStart(localDate: string): string {
  const d = new Date(localDate + "T00:00:00Z");
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Parse Bearer token strictly
  const authHeader = req.headers.get("Authorization") ?? "";
  const tokenMatch = authHeader.match(/^Bearer\s+(\S+)$/);
  if (!tokenMatch) {
    return new Response(JSON.stringify({ error: "Missing or malformed Authorization header" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { data: { user }, error: authError } = await anonSupabase.auth.getUser(tokenMatch[1]);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const rawTimezone = typeof body.timezone === "string" ? body.timezone : "UTC";
  // Validate and cap timezone string
  const timezone =
    rawTimezone.length > MAX_TIMEZONE_LENGTH || !/^[A-Za-z0-9/_+-]+$/.test(rawTimezone)
      ? "UTC"
      : rawTimezone;

  const localDate = toLocalDateString(new Date(), timezone);
  const weekStart = isoWeekStart(localDate);

  const { data, error } = await serviceSupabase.rpc("update_streak", {
    p_user_id: user.id,
    p_local_date: localDate,
    p_timezone: timezone,
    p_week_start: weekStart,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
