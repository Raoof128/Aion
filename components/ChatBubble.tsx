import { useEffect, useState } from "react";
import { View, Text, Pressable, Platform, StyleSheet } from "react-native";
import { Copy, RotateCcw, ThumbsUp, ThumbsDown } from "lucide-react-native";
import Animated, {
  FadeInLeft,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Markdown from "react-native-markdown-display";
import { VerseCard } from "./VerseCard";
import { colors, fonts } from "../lib/theme";
import type { Verse } from "../lib/types";

function PulsingDotItem({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(delay, withRepeat(withTiming(1, { duration: 600 }), -1, true));
  }, [delay, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.purple }, style]}
    />
  );
}

function PulsingDot() {
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8 }}
      accessible={true}
      accessibilityLabel="Loading response"
    >
      {[0, 1, 2].map((i) => (
        <PulsingDotItem key={i} delay={i * 150} />
      ))}
    </View>
  );
}

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  verses?: Verse[] | null;
  timestamp?: string;
  onRegenerate?: () => void;
}

const markdownStyles = {
  body: { color: colors.textPrimary, fontSize: 15, fontFamily: fonts.ui, lineHeight: 26 },
  heading1: { color: colors.white, fontSize: 22, fontWeight: "700" as const, marginVertical: 8 },
  heading2: { color: colors.white, fontSize: 18, fontWeight: "700" as const, marginVertical: 6 },
  heading3: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600" as const,
    marginVertical: 4,
  },
  strong: { color: colors.white, fontWeight: "700" as const },
  em: { color: colors.textSecondary, fontStyle: "italic" as const },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { marginVertical: 2 },
  code_inline: {
    backgroundColor: colors.glass,
    color: colors.purpleGlow,
    paddingHorizontal: 4,
    borderRadius: 4,
    fontFamily: "monospace",
  },
  code_block: {
    backgroundColor: colors.onyx,
    padding: 12,
    borderRadius: 8,
    fontFamily: "monospace",
    color: colors.textPrimary,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.purple,
    paddingLeft: 12,
    marginVertical: 8,
    opacity: 0.8,
  },
  link: { color: colors.purpleGlow },
};

export function ChatBubble({ role, content, verses, timestamp, onRegenerate }: ChatBubbleProps) {
  const [responseCopied, setResponseCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const handleCopyResponse = async () => {
    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(content);
      } else {
        const Clipboard = await import("expo-clipboard");
        await Clipboard.setStringAsync(content);
      }
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setResponseCopied(true);
      setTimeout(() => setResponseCopied(false), 1500);
    } catch {}
  };

  if (role === "user") {
    return (
      <Animated.View
        entering={FadeInRight.duration(250)}
        style={styles.userContainer}
        accessible={true}
        accessibilityLabel={`You said: ${content}`}
        accessibilityRole="text"
      >
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{content}</Text>
        </View>
        {timestamp && <Text style={[styles.timestamp, styles.timestampRight]}>{timestamp}</Text>}
      </Animated.View>
    );
  }

  const isSearching = content === "Searching scripture...";

  return (
    <Animated.View
      entering={FadeInLeft.duration(250)}
      style={styles.assistantContainer}
      accessible={true}
      accessibilityLabel={`Aion said: ${content}`}
      accessibilityRole="text"
    >
      <View style={styles.assistantHeader}>
        <View style={styles.aiDot} />
        <Text style={styles.aiLabel}>Aion</Text>
      </View>
      {isSearching ? <PulsingDot /> : <Markdown style={markdownStyles}>{content}</Markdown>}
      {!isSearching && (
        <View style={styles.messageActions}>
          <Pressable
            onPress={handleCopyResponse}
            style={({ pressed }: { pressed: boolean }) => [
              styles.messageActionButton,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityLabel="Copy response"
            accessibilityRole="button"
          >
            <View style={styles.messageActionRow}>
              <Copy size={12} color={responseCopied ? colors.purpleGlow : colors.textMuted} />
              <Text style={styles.messageActionText}>{responseCopied ? " Copied" : " Copy"}</Text>
            </View>
          </Pressable>
          {onRegenerate && (
            <Pressable
              onPress={onRegenerate}
              style={({ pressed }: { pressed: boolean }) => [
                styles.messageActionButton,
                pressed && { opacity: 0.7 },
              ]}
              accessibilityLabel="Regenerate response"
              accessibilityRole="button"
            >
              <View style={styles.messageActionRow}>
                <RotateCcw size={12} color={colors.textMuted} />
                <Text style={styles.messageActionText}> Retry</Text>
              </View>
            </Pressable>
          )}
          {/* Feedback: local visual state only — not yet persisted */}
          <Pressable
            onPress={() => setFeedback("up")}
            style={({ pressed }: { pressed: boolean }) => [
              styles.messageActionButton,
              feedback === "up" && styles.feedbackActive,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityLabel="Mark as helpful"
            accessibilityRole="button"
            accessibilityState={{ selected: feedback === "up" }}
          >
            <ThumbsUp size={14} color={feedback === "up" ? colors.purpleGlow : colors.textMuted} />
          </Pressable>
          <Pressable
            onPress={() => setFeedback("down")}
            style={({ pressed }: { pressed: boolean }) => [
              styles.messageActionButton,
              feedback === "down" && styles.feedbackActive,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityLabel="Mark as not helpful"
            accessibilityRole="button"
            accessibilityState={{ selected: feedback === "down" }}
          >
            <ThumbsDown
              size={14}
              color={feedback === "down" ? colors.purpleGlow : colors.textMuted}
            />
          </Pressable>
        </View>
      )}
      {verses && verses.length > 0 && (
        <>
          <View style={styles.verseSeparator} />
          <Text style={styles.verseCountLabel}>
            {verses.length} verse{verses.length !== 1 ? "s" : ""} found
          </Text>
          <View style={styles.versesContainer}>
            {verses.map((v, i) => (
              <VerseCard key={`${v.book_id}-${v.chapter}-${v.verse}`} verse={v} index={i} />
            ))}
          </View>
        </>
      )}
      {timestamp && <Text style={styles.timestamp}>{timestamp}</Text>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  userContainer: {
    alignItems: "flex-end",
    marginVertical: 6,
  },
  userBubble: {
    backgroundColor: colors.purpleMist,
    borderWidth: 1,
    borderColor: colors.purpleBorder,
    borderRadius: 20,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: "80%",
  },
  userText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: fonts.ui,
    lineHeight: 22,
  },
  assistantContainer: {
    alignItems: "flex-start",
    maxWidth: "95%",
    marginVertical: 6,
  },
  assistantHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  aiDot: {
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
  aiLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.uiBold,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  versesContainer: {
    marginTop: 8,
    width: "100%",
  },
  verseSeparator: {
    height: 1,
    backgroundColor: colors.glass,
    marginVertical: 8,
  },
  verseCountLabel: {
    color: colors.textGhost,
    fontSize: 12,
    fontFamily: fonts.uiMedium,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  timestamp: {
    color: colors.textGhost,
    fontSize: 10,
    fontFamily: fonts.ui,
    marginTop: 2,
  },
  timestampRight: {
    textAlign: "right",
  },
  messageActions: {
    flexDirection: "row",
    marginTop: 8,
    gap: 8,
  },
  messageActionButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  messageActionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  messageActionText: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fonts.uiMedium,
  },
  feedbackActive: {
    backgroundColor: colors.purpleMist,
    borderColor: colors.purpleBorder,
  },
});
