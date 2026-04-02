import { useState, useCallback, useRef } from "react";
import { supabase } from "./supabase";
import type { Verse, ChatSSEEvent } from "./types";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;

interface UseChatReturn {
  sendMessage: (message: string, conversationId: string | null) => Promise<void>;
  streamingText: string;
  verses: Verse[];
  conversationId: string | null;
  isStreaming: boolean;
  error: string | null;
}

export function useChat(): UseChatReturn {
  const [streamingText, setStreamingText] = useState("");
  const [verses, setVerses] = useState<Verse[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (message: string, convId: string | null) => {
      // Reset state
      setStreamingText("");
      setVerses([]);
      setError(null);
      setIsStreaming(true);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        abortRef.current = new AbortController();

        const response = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
            conversation_id: convId,
          }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `HTTP ${response.status}`);
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

          let currentEvent = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith("data: ") && currentEvent) {
              try {
                const data = JSON.parse(line.slice(6));
                switch (currentEvent) {
                  case "text":
                    setStreamingText((prev) => prev + data.content);
                    break;
                  case "verses":
                    setVerses(data.verses);
                    break;
                  case "conversation":
                    setConversationId(data.id);
                    break;
                  case "error":
                    setError(data.message);
                    break;
                }
              } catch {
                // Skip malformed data
              }
              currentEvent = "";
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message);
        }
      } finally {
        setIsStreaming(false);
      }
    },
    []
  );

  return { sendMessage, streamingText, verses, conversationId, isStreaming, error };
}
