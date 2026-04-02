import { useEffect, useRef, useState } from "react";
import { View, FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { useChat } from "../../lib/chat";
import { ChatBubble } from "../../components/ChatBubble";
import { ChatInput } from "../../components/ChatInput";
import type { Message, Verse } from "../../lib/types";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  verses?: Verse[] | null;
}

export default function ChatScreen() {
  const { id, initialMessage } = useLocalSearchParams<{
    id: string;
    initialMessage?: string;
  }>();

  const {
    sendMessage,
    streamingText,
    verses,
    conversationId,
    isStreaming,
    error,
  } = useChat();

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const hasSentInitial = useRef(false);

  // Load existing messages if opening a past conversation
  useEffect(() => {
    if (id !== "new") {
      loadMessages(id);
    }
  }, [id]);

  // Send initial message from home screen
  useEffect(() => {
    if (initialMessage && !hasSentInitial.current) {
      hasSentInitial.current = true;
      handleSend(initialMessage);
    }
  }, [initialMessage]);

  async function loadMessages(convId: string) {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(
        data.map((m: Message) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          verses: m.verses,
        }))
      );
    }
  }

  const handleSend = async (text: string) => {
    // Optimistically add user message
    const userMsg: DisplayMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);

    // Determine conversation ID
    const convId = id !== "new" ? id : conversationId;
    await sendMessage(text, convId);
  };

  // When streaming completes, add assistant message to the list
  useEffect(() => {
    if (!isStreaming && streamingText) {
      const assistantMsg: DisplayMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: streamingText,
        verses: verses.length > 0 ? verses : null,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    }
  }, [isStreaming]);

  // Build the display list: stored messages + current streaming
  const displayMessages: DisplayMessage[] = [
    ...messages,
    ...(isStreaming
      ? [
          {
            id: "streaming",
            role: "assistant" as const,
            content: streamingText || "...",
            verses: verses.length > 0 ? verses : null,
          },
        ]
      : []),
  ];

  return (
    <SafeAreaView className="flex-1 bg-black">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <FlatList
          ref={flatListRef}
          data={displayMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatBubble
              role={item.role}
              content={item.content}
              verses={item.verses}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        {error && (
          <View className="px-4 py-2 bg-red-900/50">
            <ChatBubble role="assistant" content={`Error: ${error}`} />
          </View>
        )}

        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
