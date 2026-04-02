import { Pressable, Text } from "react-native";

interface PromptPillProps {
  label: string;
  onPress: (label: string) => void;
}

export function PromptPill({ label, onPress }: PromptPillProps) {
  return (
    <Pressable
      onPress={() => onPress(label)}
      className="bg-neutral-900 border border-neutral-800 rounded-full px-4 py-2.5 mr-2 mb-2 active:bg-neutral-800"
    >
      <Text className="text-neutral-300 text-sm">{label}</Text>
    </Pressable>
  );
}
