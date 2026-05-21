import { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import {
  Search,
  Brain,
  Flame,
  Sparkle,
  Bird,
  Zap,
  BookOpen,
  ChevronRight,
  AlertTriangle,
} from "lucide-react-native";
import { PromptPill } from "../../components/PromptPill";
import { ChatInput } from "../../components/ChatInput";
import { colors, fonts } from "../../lib/theme";
import { getVerseOfTheDay } from "../../lib/bible-data";
import { isSupabaseConfigured } from "../../lib/supabase";

const PROMPT_SUGGESTIONS = [
  { Icon: Search, label: "Find verses with the number 444" },
  { Icon: Brain, label: "What is a stoic view on Ecclesiastes?" },
  { Icon: Flame, label: "I'm feeling completely burnt out today" },
  { Icon: Sparkle, label: "What does the Bible say about new beginnings?" },
  { Icon: Bird, label: "Verses about finding peace in chaos" },
  { Icon: Zap, label: "What does Proverbs say about wisdom?" },
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
      true,
    );
  }, [breathe]);

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
        {/* Ambient background glows */}
        <View style={styles.glowOrbPurple} />
        <View style={styles.glowOrbAmber} />

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Time-based greeting */}
          <Animated.Text entering={FadeIn.duration(400).delay(0)} style={styles.greeting}>
            {getGreeting()}
          </Animated.Text>

          {/* Logo */}
          <Animated.Text
            entering={FadeInDown.duration(600).delay(100)}
            style={styles.logo}
            accessibilityRole="header"
          >
            A I O N
          </Animated.Text>

          {/* Divider */}
          <Animated.View
            entering={FadeIn.duration(400).delay(400)}
            style={[styles.divider, breatheStyle]}
          />

          {/* Tagline */}
          <Animated.Text entering={FadeIn.duration(400).delay(600)} style={styles.tagline}>
            "Seek, and you shall find."
          </Animated.Text>

          {/* Supabase Warning Banner */}
          {!isSupabaseConfigured && (
            <Animated.View
              entering={FadeInDown.duration(400).delay(650)}
              style={styles.warningCard}
              accessibilityRole="alert"
            >
              <View style={styles.warningHeader}>
                <AlertTriangle size={14} color={colors.warning} />
                <Text style={styles.warningLabel}>Database Setup Required</Text>
              </View>
              <Text style={styles.warningContent}>
                Please update your <Text style={styles.codeText}>.env</Text> file in the project
                root with your actual Supabase URL and Anon Key, then restart the Expo server.
              </Text>
            </Animated.View>
          )}

          {/* Verse of the Day */}
          <Animated.View
            entering={FadeIn.duration(400).delay(700)}
            style={styles.votdCard}
            accessibilityRole="summary"
            accessibilityLabel={`Verse of the Day: ${votd.content} — ${votd.book_name} ${votd.chapter}:${votd.verse}`}
          >
            <View style={styles.votdHeaderRow}>
              <Text style={styles.votdLabel}>VERSE OF THE DAY</Text>
              <Sparkle size={10} color={colors.amberGlow} />
            </View>
            <Text style={styles.votdContent}>"{votd.content}"</Text>
            <Text style={styles.votdRef}>
              — {votd.book_name} {votd.chapter}:{votd.verse}
            </Text>
          </Animated.View>

          {/* Read Bible Button */}
          <Pressable
            onPress={() => router.push("/read")}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.readerButton,
              hovered && styles.readerButtonHovered,
              pressed && styles.readerButtonPressed,
            ]}
            accessibilityLabel="Open Bible Reader"
            accessibilityRole="button"
          >
            <BookOpen size={18} color={colors.amberGlow} style={styles.readerIcon} />
            <Text style={styles.readerButtonText}>Read the Bible</Text>
            <ChevronRight size={18} color={colors.textGhost} />
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
            <View style={styles.pillGrid} accessibilityRole="list">
              {PROMPT_SUGGESTIONS.map((prompt, index) => (
                <PromptPill
                  key={prompt.label}
                  Icon={prompt.Icon}
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
  glowOrbPurple: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(138, 43, 226, 0.02)",
    top: "20%",
    left: "10%",
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 80,
  },
  glowOrbAmber: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(217, 119, 6, 0.02)",
    top: "35%",
    right: "10%",
    shadowColor: colors.amber,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
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
    backgroundColor: colors.amberMist,
    borderWidth: 1,
    borderColor: colors.amberBorder,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.amber,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  votdHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  votdLabel: {
    color: colors.amberGlow,
    fontSize: 10,
    fontFamily: fonts.uiBold,
    fontWeight: "700",
    letterSpacing: 2,
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
    marginBottom: 16,
  },
  readerButtonHovered: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: colors.purpleBorder,
  },
  readerButtonPressed: {
    backgroundColor: colors.purpleMist,
    borderColor: colors.purpleBorder,
  },
  readerIcon: {
    marginRight: 12,
  },
  readerButtonText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: fonts.uiMedium,
  },
  warningCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  warningLabel: {
    color: colors.warning,
    fontSize: 11,
    fontFamily: fonts.uiBold,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  warningContent: {
    color: colors.textPrimary,
    fontSize: 13,
    fontFamily: fonts.ui,
    lineHeight: 18,
    opacity: 0.9,
  },
  codeText: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontWeight: "700",
    color: colors.warning,
  },
});
