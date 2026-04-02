import { View, Text, Pressable } from "react-native";
import * as Clipboard from "expo-clipboard";
import type { Verse } from "../lib/types";

interface VerseCardProps {
  verse: Verse;
}

export function VerseCard({ verse }: VerseCardProps) {
  const reference = `${verse.book_name} ${verse.chapter}:${verse.verse}`;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(`${reference} — "${verse.content}"`);
  };

  return (
    <View className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 my-1.5">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-amber-400 font-semibold text-sm">{reference}</Text>
        <Pressable onPress={handleCopy} hitSlop={8}>
          <Text className="text-neutral-500 text-xs">Copy</Text>
        </Pressable>
      </View>
      <Text className="text-neutral-200 text-base leading-6">{verse.content}</Text>
    </View>
  );
}
