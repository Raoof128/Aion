import { View, Text, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PromptPill } from "../components/PromptPill";
import { ChatInput } from "../components/ChatInput";
import { colors } from "../lib/theme";

const PROMPT_SUGGESTIONS = [
  "Find verses with the number 444",
  "What is a stoic perspective on Ecclesiastes?",
  "I'm feeling completely burnt out today",
  "What does the Bible say about new beginnings?",
];

export default function HomeScreen() {
  const router = useRouter();

  const handleSend = (message: string) => {
    // Use a unique ID each time so Expo Router creates a fresh screen
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
          <Text style={styles.logo}>Aion</Text>
          <View style={styles.divider} />
          <Text style={styles.subtitle}>Your AI Bible companion</Text>

          <ScrollView
            horizontal={false}
            style={styles.pillScroll}
            contentContainerStyle={styles.pillContainer}
          >
            {PROMPT_SUGGESTIONS.map((prompt) => (
              <PromptPill key={prompt} label={prompt} onPress={handleSend} />
            ))}
          </ScrollView>
        </View>

        <ChatInput onSend={handleSend} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
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
    color: colors.text,
    fontSize: 52,
    fontWeight: "200",
    letterSpacing: 12,
    textTransform: "uppercase",
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: colors.accent,
    marginVertical: 12,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 40,
  },
  pillScroll: {
    maxHeight: 160,
    width: "100%",
  },
  pillContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
});
