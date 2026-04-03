import { useEffect } from "react";
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from "react-native-reanimated";
import { PromptPill } from "../../components/PromptPill";
import { ChatInput } from "../../components/ChatInput";
import { colors, fonts } from "../../lib/theme";
import { getVerseOfTheDay } from "../../lib/bible-data";

const PROMPT_SUGGESTIONS = [
  { icon: "🔍", label: "Find verses with the number 444" },
  { icon: "🧠", label: "What is a stoic view on Ecclesiastes?" },
  { icon: "🔥", label: "I'm feeling completely burnt out today" },
  { icon: "✨", label: "What does the Bible say about new beginnings?" },
  { icon: "🕊️", label: "Verses about finding peace in chaos" },
  { icon: "⚡", label: "What does Proverbs say about wisdom?" },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const router = useRouter();
  const votd = getVerseOfTheDay();

  const breathe = useSharedValue(0.5);

  useEffect(() => {
    breathe.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const breatheStyle = useAnimatedStyle(() => ({
    shadowOpacity: breathe.value,
    opacity: 0.6 + breathe.value * 0.4,
  }));

  const handleSend = (message: string) => {
    const uniqueId = `new-${Date.now()}`;
    router.push({
      pathname: `/chat/${uniqueId}`,
      params: { initialMessage: message },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        {/* Subtle background glow orb behind the logo area */}
        <View style={styles.glowOrb} />

        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Time-based greeting */}
          <Animated.Text
            entering={FadeIn.duration(400).delay(0)}
            style={styles.greeting}
          >
            {getGreeting()}
          </Animated.Text>

          {/* Logo */}
          <Animated.Text
            entering={FadeInDown.duration(600).delay(100)}
            style={styles.logo}
          >
            A I O N
          </Animated.Text>

          {/* Divider */}
          <Animated.View
            entering={FadeIn.duration(400).delay(400)}
            style={[styles.divider, breatheStyle]}
          />

          {/* Tagline */}
          <Animated.Text
            entering={FadeIn.duration(400).delay(600)}
            style={styles.tagline}
          >
            "Seek, and you shall find."
          </Animated.Text>

          {/* Verse of the Day */}
          <Animated.View entering={FadeIn.duration(400).delay(700)} style={styles.votdCard}>
            <Text style={styles.votdLabel}>VERSE OF THE DAY</Text>
            <Text style={styles.votdContent}>"{votd.content}"</Text>
            <Text style={styles.votdRef}>— {votd.book_name} {votd.chapter}:{votd.verse}</Text>
          </Animated.View>

          {/* Read Bible Button */}
          <Pressable
            onPress={() => router.push("/read")}
            style={({ hovered }: any) => [styles.readerButton, hovered && styles.readerButtonHovered]}
            accessibilityLabel="Open Bible Reader"
            accessibilityRole="button"
          >
            <Text style={styles.readerButtonIcon}>📖</Text>
            <Text style={styles.readerButtonText}>Read the Bible</Text>
            <Text style={styles.readerButtonArrow}>›</Text>
          </Pressable>

          {/* Suggestions */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(800)}
            style={styles.suggestionsSection}
          >
            <View style={styles.labelRow}>
              <View style={styles.labelLine} />
              <Text style={styles.suggestionsLabel}>Explore</Text>
              <View style={styles.labelLine} />
            </View>
            <View style={styles.pillGrid}>
              {PROMPT_SUGGESTIONS.map((prompt, index) => (
                <PromptPill
                  key={prompt.label}
                  icon={prompt.icon}
                  label={prompt.label}
                  onPress={handleSend}
                  index={index}
                />
              ))}
            </View>
          </Animated.View>
        </ScrollView>

        <ChatInput onSend={handleSend} />
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
  glowOrb: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(138, 43, 226, 0.04)",
    top: "30%",
    alignSelf: "center",
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 80,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  greeting: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fonts.uiMedium,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 20,
  },
  logo: {
    color: colors.white,
    fontSize: 44,
    fontFamily: fonts.ui,
    fontWeight: "100",
    letterSpacing: 18,
  },
  divider: {
    width: 50,
    height: 2,
    backgroundColor: colors.purple,
    marginVertical: 14,
    borderRadius: 1,
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: fonts.verseItalic,
    fontStyle: "italic",
    letterSpacing: 1,
    marginBottom: 20,
  },
  suggestionsSection: {
    width: "100%",
    maxWidth: 420,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    width: "100%",
  },
  labelLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.glass,
  },
  suggestionsLabel: {
    color: colors.textGhost,
    fontSize: 11,
    fontFamily: fonts.uiMedium,
    letterSpacing: 3,
    textTransform: "uppercase",
    paddingHorizontal: 12,
  },
  pillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  votdCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "rgba(138, 43, 226, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(138, 43, 226, 0.15)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  votdLabel: {
    color: colors.purpleGlow,
    fontSize: 10,
    fontFamily: fonts.uiBold,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 10,
  },
  votdContent: {
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: fonts.verseItalic,
    fontStyle: "italic",
    lineHeight: 26,
    marginBottom: 8,
  },
  votdRef: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fonts.uiMedium,
    textAlign: "right",
  },
  readerButton: {
    width: "100%",
    maxWidth: 420,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 24,
  },
  readerButtonHovered: {
    backgroundColor: "rgba(138, 43, 226, 0.06)",
    borderColor: "rgba(138, 43, 226, 0.20)",
  },
  readerButtonIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  readerButtonText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: fonts.uiMedium,
  },
  readerButtonArrow: {
    color: colors.textGhost,
    fontSize: 20,
  },
});
