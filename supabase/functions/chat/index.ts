import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

// --- Environment ---
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// --- Rate Limiting (database-persisted, survives cold starts) ---
// Limits: 5/min per user, 50/3hrs per user, 200/day global
async function checkRateLimit(userId: string): Promise<{ allowed: boolean; message?: string }> {
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_user_id: userId,
  });

  if (error) {
    // If rate limit check fails, deny by default (fail-closed)
    return { allowed: false, message: "Rate limit check failed. Please try again." };
  }

  const result = data[0];
  return { allowed: result.allowed, message: result.message ?? undefined };
}

// --- Message length cap (prevents token-stuffing) ---
const MAX_MESSAGE_LENGTH = 500;

// --- Keyword Extraction ---
function extractKeyword(message: string): string {
  // Match numbers (e.g., "444", "666", "12")
  const numberMatch = message.match(/\b\d{2,}\b/);
  if (numberMatch) return numberMatch[0];

  // Match Bible references (e.g., "John 3:16", "Genesis 1:1")
  const refMatch = message.match(
    /\b(Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Song of Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation)\s+\d+:\d+/i
  );
  if (refMatch) return refMatch[0];

  return "";
}

// --- Embedding ---
async function embedText(text: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI embedding error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// --- Hybrid Search ---
interface VerseResult {
  id: number;
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  content: string;
  similarity: number;
}

async function searchVerses(
  embedding: number[],
  keyword: string,
  matchCount: number = 6
): Promise<VerseResult[]> {
  const { data, error } = await supabase.rpc("search_verses", {
    query_embedding: JSON.stringify(embedding),
    search_keyword: keyword,
    match_count: matchCount,
  });

  if (error) throw new Error(`Search error: ${error.message}`);
  return data as VerseResult[];
}

// --- Gemini Streaming ---
async function* streamGemini(prompt: string): AsyncGenerator<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini error: ${response.status} ${err}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") return;
        try {
          const parsed = JSON.parse(jsonStr);
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) yield text;
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  }
}

// --- Build Prompt ---
function buildPrompt(userMessage: string, verses: VerseResult[]): string {
  const versesBlock = verses
    .map((v) => `${v.book_name} ${v.chapter}:${v.verse} — "${v.content}"`)
    .join("\n");

  return `You are Aion, a wise and warm Bible companion. You help people explore Scripture with clarity and warmth.

RULES:
- Answer using ONLY the provided verses below. Do not invent or recall verses from memory.
- Cite each verse you reference using the format: Book Chapter:Verse.
- If the provided verses don't answer the question, say so honestly and suggest what the user might search for instead.
- Keep your response concise and conversational (2-4 short paragraphs max).

[Retrieved Verses]
${versesBlock}

[User Question]
${userMessage}`;
}

// --- Persistence ---
async function persistMessages(
  userId: string,
  conversationId: string | null,
  userMessage: string,
  assistantContent: string,
  verses: VerseResult[]
): Promise<string> {
  let convId = conversationId;
  if (!convId) {
    const title = userMessage.length > 50
      ? userMessage.substring(0, 50) + "..."
      : userMessage;

    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: userId, title })
      .select("id")
      .single();

    if (error) throw new Error(`Create conversation error: ${error.message}`);
    convId = data.id;
  } else {
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", convId);
  }

  const versesJson = verses.map((v) => ({
    book_id: v.book_id,
    book_name: v.book_name,
    chapter: v.chapter,
    verse: v.verse,
    content: v.content,
  }));

  const { error: msgError } = await supabase.from("messages").insert([
    { conversation_id: convId, role: "user", content: userMessage },
    {
      conversation_id: convId,
      role: "assistant",
      content: assistantContent,
      verses: versesJson,
    },
  ]);

  if (msgError) throw new Error(`Insert messages error: ${msgError.message}`);
  return convId!;
}

// --- Main Handler ---
Deno.serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Auth: extract user from JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Rate limit (database-persisted)
    const rateCheck = await checkRateLimit(user.id);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: rateCheck.message }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse body
    const { message, conversation_id } = await req.json();
    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Prevent token-stuffing attacks
    if (message.length > MAX_MESSAGE_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters.` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // RAG pipeline
    const keyword = extractKeyword(message);
    const embedding = await embedText(message);
    const verses = await searchVerses(embedding, keyword);
    const prompt = buildPrompt(message, verses);

    // SSE stream
    const encoder = new TextEncoder();
    let fullResponse = "";

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          for await (const chunk of streamGemini(prompt)) {
            fullResponse += chunk;
            send("text", { content: chunk });
          }

          send("verses", {
            verses: verses.map((v) => ({
              book_id: v.book_id,
              book_name: v.book_name,
              chapter: v.chapter,
              verse: v.verse,
              content: v.content,
            })),
          });

          const convId = await persistMessages(
            user.id,
            conversation_id,
            message,
            fullResponse,
            verses
          );
          send("conversation", { id: convId });
          send("done", {});
        } catch (err) {
          send("error", { message: (err as Error).message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
