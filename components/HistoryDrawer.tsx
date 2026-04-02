import { View, Text, FlatList, Pressable, Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DrawerContentComponentProps } from "@react-navigation/drawer";
import { supabase } from "../lib/supabase";
import { colors, fonts } from "../lib/theme";
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
      <View style={styles.headerSection}>
        <Text style={styles.title}>HISTORY</Text>
        <View style={styles.titleDivider} />
      </View>

      <Pressable onPress={handleNewChat} style={styles.newChatButton}>
        <Text style={styles.newChatIcon}>+</Text>
        <Text style={styles.newChatText}>New Chat</Text>
      </Pressable>

      {isLoading ? (
        <Text style={styles.emptyText}>Loading...</Text>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✦</Text>
          <Text style={styles.emptyText}>No conversations yet</Text>
        </View>
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
    backgroundColor: colors.void,
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  headerSection: {
    marginBottom: 20,
  },
  title: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fonts.uiBold,
    fontWeight: "700",
    letterSpacing: 3,
    marginBottom: 8,
  },
  titleDivider: {
    height: 1,
    backgroundColor: colors.purpleBorder,
  },
  newChatButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.purpleMist,
    borderWidth: 1,
    borderColor: colors.purpleBorder,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  newChatIcon: {
    color: colors.purple,
    fontSize: 18,
    fontWeight: "300",
    marginRight: 10,
  },
  newChatText: {
    color: colors.purpleGlow,
    fontFamily: fonts.uiMedium,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 40,
  },
  emptyIcon: {
    color: colors.textGhost,
    fontSize: 20,
    marginBottom: 8,
  },
  emptyText: {
    color: colors.textGhost,
    fontSize: 13,
    fontFamily: fonts.ui,
  },
  conversationRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass,
  },
  conversationTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: fonts.ui,
  },
  conversationTime: {
    color: colors.textGhost,
    fontSize: 11,
    fontFamily: fonts.ui,
    marginTop: 4,
  },
});
