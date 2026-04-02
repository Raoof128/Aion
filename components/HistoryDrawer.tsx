import { View, Text, FlatList, Pressable, Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DrawerContentComponentProps } from "@react-navigation/drawer";
import { supabase } from "../lib/supabase";
import { colors } from "../lib/theme";
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
    <View style={styles.container}>
      <Text style={styles.title}>History</Text>

      <Pressable onPress={handleNewChat} style={styles.newChatButton}>
        <Text style={styles.newChatText}>+ New Chat</Text>
      </Pressable>

      {isLoading ? (
        <Text style={styles.emptyText}>Loading...</Text>
      ) : conversations.length === 0 ? (
        <Text style={styles.emptyText}>No conversations yet</Text>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleOpen(item.id)}
              onLongPress={() => handleDelete(item.id)}
              style={styles.conversationRow}
            >
              <Text style={styles.conversationTitle} numberOfLines={1}>
                {item.title || "Untitled"}
              </Text>
              <Text style={styles.conversationTime}>{timeAgo(item.updated_at)}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  newChatButton: {
    backgroundColor: colors.accentDim,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  newChatText: {
    color: colors.text,
    fontWeight: "600",
    textAlign: "center",
    fontSize: 15,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  conversationRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  conversationTitle: {
    color: colors.text,
    fontSize: 15,
  },
  conversationTime: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
});
