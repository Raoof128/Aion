import { View, Text } from "react-native";
import { VerseCard } from "./VerseCard";
import type { Verse } from "../lib/types";

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  verses?: Verse[] | null;
}

export function ChatBubble({ role, content, verses }: ChatBubbleProps) {
  if (role === "user") {
    return (
      <View className="self-end bg-amber-600 rounded-2xl rounded-br-sm px-4 py-3 max-w-[85%] my-1">
        <Text className="text-white text-base">{content}</Text>
      </View>
    );
  }

  return (
    <View className="self-start max-w-[95%] my-1">
      <Text className="text-neutral-200 text-base leading-7 mb-2">
        {content}
      </Text>
      {verses && verses.length > 0 && (
        <View className="mt-1">
          {verses.map((v) => (
            <VerseCard
              key={`${v.book_id}-${v.chapter}-${v.verse}`}
              verse={v}
            />
          ))}
        </View>
      )}
    </View>
  );
}
