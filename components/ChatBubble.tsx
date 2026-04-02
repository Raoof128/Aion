import { View, Text, StyleSheet } from "react-native";
import { VerseCard } from "./VerseCard";
import { colors } from "../lib/theme";
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
      <Text style={styles.assistantText}>{content}</Text>
      {verses && verses.length > 0 && (
        <View style={styles.versesContainer}>
          {verses.map((v) => (
            <VerseCard key={`${v.book_id}-${v.chapter}-${v.verse}`} verse={v} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  userContainer: {
    alignItems: "flex-end",
    marginVertical: 4,
  },
  userBubble: {
    backgroundColor: colors.userBubble,
    borderWidth: 1,
    borderColor: colors.userBubbleBorder,
    borderRadius: 20,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: "85%",
  },
  userText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  assistantContainer: {
    alignItems: "flex-start",
    maxWidth: "95%",
    marginVertical: 4,
  },
  assistantText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 26,
    marginBottom: 4,
  },
  versesContainer: {
    marginTop: 4,
    width: "100%",
  },
});
