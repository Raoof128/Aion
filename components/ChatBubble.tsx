import { View, Text, StyleSheet } from "react-native";
import { VerseCard } from "./VerseCard";
import { colors, fonts } from "../lib/theme";
import type { Verse } from "../lib/types";

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  verses?: Verse[] | null;
}

export function ChatBubble({ role, content, verses }: ChatBubbleProps) {
  if (role === "user") {
    return (
      <View style={styles.userContainer}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{content}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.assistantContainer}>
      <View style={styles.assistantHeader}>
        <View style={styles.aiDot} />
        <Text style={styles.aiLabel}>Aion</Text>
      </View>
      <Text style={styles.assistantText}>{content}</Text>
      {verses && verses.length > 0 && (
        <View style={styles.versesContainer}>
          {verses.map((v, i) => (
            <VerseCard key={`${v.book_id}-${v.chapter}-${v.verse}`} verse={v} index={i} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  userContainer: {
    alignItems: "flex-end",
    marginVertical: 6,
  },
  userBubble: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
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
  assistantText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: fonts.ui,
    lineHeight: 26,
    marginBottom: 4,
  },
  versesContainer: {
    marginTop: 8,
    width: "100%",
  },
});
