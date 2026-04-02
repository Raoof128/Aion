import { useEffect, useRef, useState } from "react";
import { View, Text, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { useChat } from "../../lib/chat";
import { ChatBubble } from "../../components/ChatBubble";
import { ChatInput } from "../../components/ChatInput";
import { colors, fonts } from "../../lib/theme";
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
  const { sendMessage, reset, streamingText, verses, conversationId, isStreaming, error } =
    useChat();

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const hasSentInitial = useRef(false);

  const isNewChat = id === "new" || id.startsWith("new-");

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
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={[styles.headerDot, isStreaming && styles.headerDotActive]} />
          <Text style={styles.headerTitle}>AION</Text>
          {displayMessages.length > 0 && (
            <Text style={styles.messageCount}>{displayMessages.length}</Text>
          )}
        </View>
        <View style={styles.headerButton} />
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
          onScroll={(e) => {
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            const distanceFromBottom =
              contentSize.height - layoutMeasurement.height - contentOffset.y;
            setShowScrollButton(distanceFromBottom > 100);
          }}
          scrollEventThrottle={100}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>✦</Text>
              <Text style={styles.emptyTitle}>Begin your search</Text>
              <Text style={styles.emptySubtitle}>
                Ask anything about the Bible{"\n"}and discover scripture with AI
              </Text>
            </View>
          }
        />

        {error && (
          <View
            style={styles.errorBanner}
            accessibilityRole="alert"
            accessibilityLabel={`Error: ${error}`}
          >
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {showScrollButton && (
          <Pressable
            onPress={() => flatListRef.current?.scrollToEnd({ animated: true })}
            style={styles.scrollToBottom}
            accessibilityLabel="Scroll to bottom"
            accessibilityRole="button"
          >
            <Text style={styles.scrollToBottomIcon}>↓</Text>
          </Pressable>
        )}

        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.obsidian,
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
    borderBottomColor: colors.glass,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    color: colors.textSecondary,
    fontSize: 20,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.purple,
    marginRight: 8,
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  headerTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.uiBold,
    fontWeight: "700",
    letterSpacing: 4,
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 140,
  },
  emptyIcon: {
    color: colors.purpleDim,
    fontSize: 36,
    marginBottom: 16,
  },
  emptyTitle: {
    color: colors.textSecondary,
    fontSize: 18,
    fontFamily: fonts.uiMedium,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: colors.textGhost,
    fontSize: 13,
    fontFamily: fonts.ui,
    textAlign: "center",
    lineHeight: 20,
  },
  headerDotActive: {
    backgroundColor: colors.purpleGlow,
    shadowOpacity: 1.0,
    shadowRadius: 8,
  },
  messageCount: {
    color: colors.textGhost,
    fontSize: 10,
    fontFamily: fonts.ui,
    marginLeft: 8,
    backgroundColor: colors.glass,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  scrollToBottom: {
    position: "absolute",
    bottom: 80,
    alignSelf: "center",
    backgroundColor: colors.purple,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    zIndex: 10,
  },
  scrollToBottomIcon: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  errorBanner: {
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.error,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 10,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    fontFamily: fonts.ui,
  },
});
