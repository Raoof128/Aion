import { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Share,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInUp, FadeOut } from "react-native-reanimated";
import { ChevronLeft, Share2, ChevronDown, Sparkles, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
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
  timestamp: string;
}

const FOLLOW_UPS = ["Tell me more about this", "Find similar verses", "Explain in simpler terms"];

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
  const [errorDismissed, setErrorDismissed] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const hasSentInitial = useRef(false);
  const isAtBottom = useRef(true);

  const isNewChat = id === "new" || id.startsWith("new-");

  const loadMessages = useCallback(async (convId: string) => {
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
          timestamp: new Date(m.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        })),
      );
    }
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      const userMsg: DisplayMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, userMsg]);

      const convId = !isNewChat ? id : conversationId;
      await sendMessage(text, convId);
    },
    [isNewChat, id, conversationId, sendMessage],
  );

  useEffect(() => {
    setMessages([]);
    hasSentInitial.current = false;
    reset();

    if (!isNewChat) {
      loadMessages(id);
    }
  }, [id, isNewChat, reset, loadMessages]);

  useEffect(() => {
    if (error) setErrorDismissed(false);
  }, [error]);

  useEffect(() => {
    if (initialMessage && !hasSentInitial.current) {
      hasSentInitial.current = true;
      handleSend(initialMessage);
    }
  }, [initialMessage, handleSend]);

  const wasStreaming = useRef(false);

  useEffect(() => {
    if (isStreaming) {
      wasStreaming.current = true;
    } else if (wasStreaming.current && streamingText) {
      wasStreaming.current = false;
      const assistantMsg: DisplayMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: streamingText,
        verses: verses.length > 0 ? verses : null,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    }
  }, [isStreaming, streamingText, verses]);

  const handleRegenerate = async () => {
    if (messages.length < 2) return;
    // Find the last user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg) return;
    // Remove last assistant message
    setMessages((prev) => prev.slice(0, -1));
    // Re-send
    const convId = !isNewChat ? id : conversationId;
    await sendMessage(lastUserMsg.content, convId);
  };

  const handleExport = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (messages.length === 0) return;
    const text = messages
      .map((m) => {
        const role = m.role === "user" ? "You" : "Aion";
        let msg = `${role}: ${m.content}`;
        if (m.verses && m.verses.length > 0) {
          const refs = m.verses
            .map((v) => `  📖 ${v.book_name} ${v.chapter}:${v.verse} — "${v.content}"`)
            .join("\n");
          msg += "\n" + refs;
        }
        return msg;
      })
      .join("\n\n");

    try {
      await Share.share({ message: `Aion Conversation\n${"─".repeat(30)}\n\n${text}` });
    } catch {}
  };

  const displayMessages: DisplayMessage[] = [
    ...messages,
    ...(isStreaming
      ? [
          {
            id: "streaming",
            role: "assistant" as const,
            content: streamingText || "Searching scripture...",
            verses: verses.length > 0 ? verses : null,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]
      : []),
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.headerButton,
            hovered && styles.headerButtonHovered,
          ]}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <ChevronLeft size={20} color={colors.textSecondary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={[styles.headerDot, isStreaming && styles.headerDotActive]} />
          <Text style={styles.headerTitle}>AION</Text>
          {displayMessages.length > 0 && (
            <Text style={styles.messageCount}>{displayMessages.length}</Text>
          )}
        </View>
        <Pressable
          onPress={handleExport}
          style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.headerButton,
            hovered && styles.headerButtonHovered,
          ]}
          accessibilityLabel="Export conversation"
          accessibilityRole="button"
        >
          <Share2 size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <FlatList
          ref={flatListRef}
          data={displayMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <ChatBubble
              role={item.role}
              content={item.content}
              verses={item.verses}
              timestamp={item.timestamp}
              onRegenerate={
                item.role === "assistant" && index === displayMessages.length - 1 && !isStreaming
                  ? handleRegenerate
                  : undefined
              }
            />
          )}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => {
            if (isAtBottom.current) {
              flatListRef.current?.scrollToEnd({ animated: true });
            }
          }}
          onScroll={(e) => {
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            const distanceFromBottom =
              contentSize.height - layoutMeasurement.height - contentOffset.y;
            setShowScrollButton(distanceFromBottom > 100);
            isAtBottom.current = distanceFromBottom <= 100;
          }}
          scrollEventThrottle={100}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Sparkles size={36} color={colors.purpleDim} />
              <Text style={styles.emptyTitle}>Begin your search</Text>
              <Text style={styles.emptySubtitle}>
                Ask anything about the Bible{"\n"}and discover scripture with AI
              </Text>
            </View>
          }
          ListFooterComponent={
            displayMessages.length > 0 && !isStreaming ? (
              <View style={styles.followUps}>
                {FOLLOW_UPS.map((text, i) => (
                  <Animated.View key={text} entering={FadeInUp.delay(i * 80).duration(200)}>
                    <Pressable
                      onPress={() => {
                        if (Platform.OS !== "web")
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        handleSend(text);
                      }}
                      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                        styles.followUpChip,
                        hovered && styles.followUpChipHovered,
                        pressed && styles.followUpChipPressed,
                      ]}
                      accessibilityLabel={text}
                      accessibilityRole="button"
                    >
                      <Text style={styles.followUpText}>{text}</Text>
                    </Pressable>
                  </Animated.View>
                ))}
              </View>
            ) : null
          }
        />

        {error && !errorDismissed && (
          <View
            style={styles.errorBanner}
            accessibilityRole="alert"
            accessibilityLabel={`Error: ${error}`}
          >
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => setErrorDismissed(true)} style={styles.errorDismiss}>
              <X size={14} color={colors.error} />
            </Pressable>
          </View>
        )}

        {showScrollButton && (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={styles.scrollToBottomWrapper}
          >
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                flatListRef.current?.scrollToEnd({ animated: true });
              }}
              style={styles.scrollToBottom}
              accessibilityLabel="Scroll to bottom"
              accessibilityHint="Scrolls the conversation to the most recent message"
              accessibilityRole="button"
            >
              <ChevronDown size={16} color={colors.white} strokeWidth={3} />
            </Pressable>
          </Animated.View>
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
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerButtonHovered: {
    backgroundColor: colors.glass,
    borderRadius: 10,
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
    paddingBottom: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 140,
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
    fontSize: 11,
    fontFamily: fonts.ui,
    marginLeft: 8,
    backgroundColor: colors.glass,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  scrollToBottomWrapper: {
    position: "absolute",
    bottom: 80,
    alignSelf: "center",
    zIndex: 10,
  },
  scrollToBottom: {
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
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.error,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 10,
  },
  errorDismiss: {
    padding: 4,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    fontFamily: fonts.ui,
    flex: 1,
  },
  followUps: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 6,
  },
  followUpChip: {
    backgroundColor: colors.purpleMist,
    borderWidth: 1,
    borderColor: colors.purpleBorder,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  followUpChipHovered: {
    backgroundColor: colors.purpleAccent,
    borderColor: colors.purple,
  },
  followUpChipPressed: {
    backgroundColor: colors.purpleAccent,
    transform: [{ scale: 0.97 }],
  },
  followUpText: {
    color: colors.purpleGlow,
    fontSize: 12,
    fontFamily: fonts.ui,
  },
});
