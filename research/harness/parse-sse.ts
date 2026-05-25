import { SUPABASE_URL, DEV_BYPASS_SECRET } from "./env.ts";
import { normaliseCoord } from "./metrics-retrieval.ts";
import type { SSEParseResult } from "./types.ts";

/**
 * Sends a question to the Aion chat Edge Function and parses the SSE stream.
 * Returns accumulated answer text, normalised verse coords, conversation_id, latency, and any error.
 * Always uses conversation_id: null to prevent cross-question context contamination.
 */
export async function callChat(
  token: string,
  question: string,
  timeoutMs = 60_000
): Promise<SSEParseResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  let answer = "";
  let retrieved_verses: string[] = [];
  let conversation_id: string | null = null;
  let http_status: number | null = null;

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    if (DEV_BYPASS_SECRET) headers["x-dev-bypass"] = DEV_BYPASS_SECRET;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({ message: question, conversation_id: null }),
      signal: controller.signal,
    });

    http_status = response.status;

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      return {
        answer: "",
        retrieved_verses: [],
        conversation_id: null,
        latency_ms: Date.now() - start,
        http_status,
        error: (errData as { error?: string }).error || `HTTP ${response.status}`,
      };
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let currentEvent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ") && currentEvent) {
          try {
            const data = JSON.parse(line.slice(6));
            switch (currentEvent) {
              case "text":
                answer += (data as { content?: string }).content ?? "";
                break;
              case "verses":
                retrieved_verses = ((data as { verses?: unknown[] }).verses ?? []).map(
                  (v) => normaliseCoord(v as { book_id?: string; book_name?: string; chapter: number; verse: number })
                );
                break;
              case "conversation":
                conversation_id = (data as { id?: string }).id ?? null;
                break;
              case "error":
                return {
                  answer,
                  retrieved_verses,
                  conversation_id,
                  latency_ms: Date.now() - start,
                  http_status,
                  error: (data as { message?: string }).message ?? "SSE error event",
                };
            }
          } catch {
            // Skip malformed SSE data lines
          }
          currentEvent = "";
        }
      }
    }

    return {
      answer,
      retrieved_verses,
      conversation_id,
      latency_ms: Date.now() - start,
      http_status,
      error: null,
    };
  } catch (err) {
    const isTimeout = (err as Error).name === "AbortError";
    return {
      answer,
      retrieved_verses,
      conversation_id,
      latency_ms: Date.now() - start,
      http_status,
      error: isTimeout ? "timeout" : (err as Error).message,
    };
  } finally {
    clearTimeout(timer);
  }
}
