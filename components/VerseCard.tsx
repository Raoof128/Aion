import { useState } from "react";
import { View, Text, Pressable, Platform, StyleSheet } from "react-native";
import { colors } from "../lib/theme";
import type { Verse } from "../lib/types";

interface VerseCardProps {
  verse: Verse;
}

export function VerseCard({ verse }: VerseCardProps) {
  const reference = `${verse.book_name} ${verse.chapter}:${verse.verse}`;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = `${reference} — "${verse.content}"`;
    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        const Clipboard = await import("expo-clipboard");
        await Clipboard.setStringAsync(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Silently fail if clipboard unavailable
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.reference}>{reference}</Text>
        <Pressable onPress={handleCopy} hitSlop={8}>
          <Text style={[styles.copyButton, copied && styles.copiedButton]}>
            {copied ? "Copied!" : "Copy"}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.content}>{verse.content}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 16,
    padding: 16,
    marginVertical: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.accentDim,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  reference: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  copyButton: {
    color: colors.textMuted,
    fontSize: 12,
  },
  copiedButton: {
    color: colors.accent,
  },
  content: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 24,
    fontStyle: "italic",
  },
});
