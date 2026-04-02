import { View, Text, FlatList, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DrawerContentComponentProps } from "@react-navigation/drawer";
import { supabase } from "../lib/supabase";
import type { Conversation } from "../lib/types";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function HistoryDrawer(props: DrawerContentComponentProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as Conversation[];
    },
  });

  const handleOpen = (id: string) => {
    router.push(`/chat/${id}`);
    props.navigation?.closeDrawer();
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete conversation?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await supabase.from("conversations").delete().eq("id", id);
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
      },
    ]);
  };

  const handleNewChat = () => {
    router.push("/");
    props.navigation?.closeDrawer();
  };

  return (
    <View className="flex-1 bg-neutral-950 pt-16 px-4">
      <Text className="text-white text-xl font-bold mb-4">History</Text>

      <Pressable
        onPress={handleNewChat}
        className="bg-amber-600 rounded-xl py-3 px-4 mb-4 active:bg-amber-700"
      >
        <Text className="text-white font-semibold text-center">+ New Chat</Text>
      </Pressable>

      {isLoading ? (
        <Text className="text-neutral-500">Loading...</Text>
      ) : conversations.length === 0 ? (
        <Text className="text-neutral-500">No conversations yet</Text>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleOpen(item.id)}
              onLongPress={() => handleDelete(item.id)}
              className="py-3 border-b border-neutral-800 active:bg-neutral-900"
            >
              <Text className="text-white text-base" numberOfLines={1}>
                {item.title || "Untitled"}
              </Text>
              <Text className="text-neutral-500 text-xs mt-1">{timeAgo(item.updated_at)}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
