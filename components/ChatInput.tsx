import { useState } from "react";
import { View, TextInput, Pressable, Text } from "react-native";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <View className="flex-row items-end px-4 py-3 border-t border-neutral-800 bg-black">
      <TextInput
        className="flex-1 bg-neutral-900 text-white rounded-2xl px-4 py-3 mr-3 text-base max-h-24"
        placeholder="Ask Aion anything..."
        placeholderTextColor="#525252"
        value={text}
        onChangeText={setText}
        onSubmitEditing={handleSend}
        multiline
        editable={!disabled}
      />
      <Pressable
        onPress={handleSend}
        disabled={disabled || !text.trim()}
        className={`rounded-full w-10 h-10 items-center justify-center ${
          text.trim() && !disabled ? "bg-amber-500" : "bg-neutral-800"
        }`}
      >
        <Text className="text-black text-lg font-bold">↑</Text>
      </Pressable>
    </View>
  );
}
