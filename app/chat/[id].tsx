import { useEffect, useRef, useState } from "react";
import { View, Text, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { useChat } from "../../lib/chat";
import { ChatBubble } from "../../components/ChatBubble";
import { ChatInput } from "../../components/ChatInput";
import { colors } from "../../lib/theme";
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

  const router = useRouter();
  const { sendMessage, reset, streamingText, verses, conversationId, isStreaming, error } = useChat();

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const hasSentInitial = useRef(false);

  const isNewChat = id === "new" || id.startsWith("new-");

  // Reset everything when navigating to a new chat
  useEffect(() => {
    setMessages([]);
    hasSentInitial.current = false;
    reset();

    if (!isNewChat) {
      loadMessages(id);
    }
  }, [id]);

  useEffect(() => {
    if (initialMessage && !hasSentInitial.current) {
      hasSentInitial.current = true;
      handleSend(initialMessage);
    }
  }, [initialMessage]);

  async function loadMessages(convId: string) {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to load messages:", error.message);
      return;
    }

    if (data) {
      setMessages(
        data.map((m: Message) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          verses: m.verses,
        })),
      );
    }
  }

  const handleSend = async (text: string) => {
    const userMsg: DisplayMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);

    const convId = !isNewChat ? id : conversationId;
    await sendMessage(text, convId);
  };

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

  const displayMessages: DisplayMessage[] = [
    ...messages,
    ...(isStreaming
      ? [
          {
            id: "streaming",
            role: "assistant" as const,
            content: streamingText || "Searching scripture...",
            verses: verses.length > 0 ? verses : null,
          },
        ]
      : []),
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>&#8592;</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Aion</Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <FlatList
          ref={flatListRef}
          data={displayMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatBubble role={item.role} content={item.content} verses={item.verses} />
          )}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Start a conversation...</Text>
            </View>
          }
        />

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    color: colors.accent,
    fontSize: 22,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "300",
    letterSpacing: 4,
    textTransform: "uppercase",
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    letterSpacing: 1,
  },
  errorBanner: {
    backgroundColor: colors.error,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 8,
  },
  errorText: {
    color: colors.errorText,
    fontSize: 13,
  },
});
