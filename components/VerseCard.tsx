import { useState } from "react";
import { View, Text, Pressable, Platform, StyleSheet, Share } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { FadeInLeft, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { colors, fonts } from "../lib/theme";
import type { Verse } from "../lib/types";

interface VerseCardProps {
  verse: Verse;
  index?: number;
}

export function VerseCard({ verse, index = 0 }: VerseCardProps) {
  const reference = `${verse.book_name} ${verse.chapter}:${verse.verse}`;
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isLong = verse.content.length > 150;

  const flashOpacity = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(138, 43, 226, ${flashOpacity.value * 0.15})`,
  }));

  const triggerFlash = () => {
    flashOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 300 })
    );
  };

  const handleShare = async () => {
    triggerFlash();
    const text = `${reference} — "${verse.content}"`;
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      await Share.share({ message: text });
    } catch {
      // Silently fail
    }
  };

  const handleCopy = async () => {
    triggerFlash();
    const text = `${reference} — "${verse.content}"`;
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        const Clipboard = await import("expo-clipboard");
        await Clipboard.setStringAsync(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Silently fail
    }
  };

  return (
    <Animated.View
      entering={FadeInLeft.delay(index * 100).duration(400).springify()}
      style={styles.card}
      accessible={true}
      accessibilityLabel={`${reference}: ${verse.content}`}
    >
      {/* Purple glow top border */}
      <View style={styles.glowBar} />

      <Animated.View style={flashStyle}>
        <View style={styles.header}>
          <View style={styles.verseBadge}>
            <Text style={styles.verseBadgeText}>{verse.chapter}:{verse.verse}</Text>
          </View>
          <Text style={styles.reference}>{reference}</Text>
        </View>

        <View style={styles.divider} />

        <Pressable onPress={() => isLong && setExpanded(!expanded)} disabled={!isLong}>
          <Text style={styles.content}>
            "{expanded || !isLong ? verse.content : verse.content.slice(0, 150) + "..."}"
          </Text>
          {isLong && (
            <Text style={styles.expandToggle}>
              {expanded ? "Show less" : "Show more"}
            </Text>
          )}
        </Pressable>

        <View style={styles.actions}>
          <Pressable
            onPress={handleCopy}
            style={({ hovered }: any) => [styles.actionButton, hovered && styles.actionButtonHovered]}
            accessibilityLabel={copied ? "Copied to clipboard" : "Copy verse"}
            accessibilityRole="button"
          >
            <Text style={[styles.actionText, copied && styles.actionTextActive]}>
              {copied ? "✓ Copied" : "Copy"}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleShare}
            style={({ hovered }: any) => [styles.actionButton, hovered && styles.actionButtonHovered]}
            accessibilityLabel="Share verse"
            accessibilityRole="button"
          >
            <Text style={styles.actionText}>Share</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.onyx,
    borderWidth: 1,
    borderColor: colors.steel,
    borderRadius: 16,
    marginVertical: 8,
    overflow: "hidden",
    shadowColor: colors.purpleDim,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
  },
  glowBar: {
    height: 2,
    backgroundColor: colors.purple,
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  verseBadge: {
    backgroundColor: colors.purpleMist,
    borderWidth: 1,
    borderColor: colors.purpleBorder,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  verseBadgeText: {
    color: colors.purpleGlow,
    fontSize: 10,
    fontFamily: fonts.uiBold,
    fontWeight: "700",
  },
  reference: {
    color: colors.purpleGlow,
    fontSize: 11,
    fontFamily: fonts.uiBold,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  divider: {
    height: 1,
    backgroundColor: colors.steel,
    marginHorizontal: 16,
  },
  content: {
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: fonts.verse,
    lineHeight: 28,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  expandToggle: {
    color: "#A855F7",
    fontSize: 12,
    marginTop: 4,
    fontFamily: fonts.uiMedium,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  actions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  actionButtonHovered: {
    backgroundColor: "rgba(138, 43, 226, 0.10)",
    borderColor: colors.purpleBorder,
  },
  actionText: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fonts.uiMedium,
  },
  actionTextActive: {
    color: colors.purpleGlow,
  },
});
