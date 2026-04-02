import { View, Text, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PromptPill } from "../components/PromptPill";
import { ChatInput } from "../components/ChatInput";
import { colors, fonts } from "../lib/theme";

const PROMPT_SUGGESTIONS = [
  { icon: "🔍", label: "Find verses with the number 444" },
  { icon: "🧠", label: "What is a stoic view on Ecclesiastes?" },
  { icon: "🔥", label: "I'm feeling completely burnt out today" },
  { icon: "✨", label: "What does the Bible say about new beginnings?" },
];

export default function HomeScreen() {
  const router = useRouter();

  const handleSend = (message: string) => {
    const uniqueId = `new-${Date.now()}`;
    router.push({
      pathname: `/chat/${uniqueId}`,
      params: { initialMessage: message },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.centerContent}>
          {/* Logo */}
          <Text style={styles.logo}>A I O N</Text>
          <View style={styles.divider} />
          <Text style={styles.tagline}>"Seek, and you shall find."</Text>

          {/* Suggestions */}
          <View style={styles.suggestionsSection}>
            <Text style={styles.suggestionsLabel}>✨ Suggested for you today</Text>
            <ScrollView style={styles.pillScroll} showsVerticalScrollIndicator={false}>
              {PROMPT_SUGGESTIONS.map((prompt) => (
                <PromptPill
                  key={prompt.label}
                  icon={prompt.icon}
                  label={prompt.label}
                  onPress={handleSend}
                />
              ))}
            </ScrollView>
          </View>
        </View>

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
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
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
    marginBottom: 48,
  },
  suggestionsSection: {
    width: "100%",
    maxWidth: 420,
  },
  suggestionsLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.uiMedium,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 12,
    paddingLeft: 4,
  },
  pillScroll: {
    maxHeight: 280,
  },
});
