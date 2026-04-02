import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PromptPill } from "../components/PromptPill";
import { ChatInput } from "../components/ChatInput";

const PROMPT_SUGGESTIONS = [
  "Find verses with the number 444",
  "What is a stoic perspective on Ecclesiastes?",
  "I'm feeling completely burnt out today",
  "What does the Bible say about new beginnings?",
];

export default function HomeScreen() {
  const router = useRouter();

  const handleSend = (message: string) => {
    router.push({
      pathname: "/chat/new",
      params: { initialMessage: message },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-white text-4xl font-bold mb-2">Aion</Text>
          <Text className="text-neutral-500 text-base mb-10">Your AI Bible companion</Text>

          <ScrollView
            horizontal={false}
            className="max-h-40 w-full"
            contentContainerClassName="flex-row flex-wrap justify-center"
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
