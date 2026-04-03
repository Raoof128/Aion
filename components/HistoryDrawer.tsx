import { useState } from "react";
import { View, Text, FlatList, Pressable, Alert, ActivityIndicator, Platform, StyleSheet, TextInput } from "react-native";
import * as Haptics from "expo-haptics";
import { Pencil, Sparkles } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DrawerContentComponentProps } from "@react-navigation/drawer";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
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

function ConversationItem({ item, onOpen, onDelete, timeAgo }: {
  item: Conversation;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  timeAgo: string;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title || "");
  const queryClient = useQueryClient();

  const handleRename = async () => {
    if (!editTitle.trim()) return;
    await supabase.from("conversations").update({ title: editTitle.trim() }).eq("id", item.id);
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
    setIsEditing(false);
  };

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={() => !isEditing && onOpen(item.id)}
        onLongPress={() => !isEditing && onDelete(item.id)}
        onPressIn={() => { if (!isEditing) scale.value = withSpring(0.98); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        style={({ hovered }: any) => [styles.conversationRow, hovered && styles.conversationRowHovered]}
        accessibilityLabel={`${item.title || "Untitled"}, ${timeAgo}`}
        accessibilityRole="button"
        accessibilityHint="Tap to open, long press to delete"
      >
        <View style={styles.rowContent}>
          <View style={styles.rowText}>
            {isEditing ? (
              <TextInput
                value={editTitle}
                onChangeText={setEditTitle}
                onSubmitEditing={handleRename}
                onBlur={() => setIsEditing(false)}
                autoFocus
                style={styles.editInput}
              />
            ) : (
              <Text style={styles.conversationTitle} numberOfLines={2}>
                {item.title || "Untitled"}
              </Text>
            )}
            <Text style={styles.conversationTime}>{timeAgo}</Text>
          </View>
          <Pressable onPress={() => setIsEditing(true)} style={styles.editButton}>
            <Pencil size={14} color={colors.textGhost} />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
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
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          }
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

      <Pressable
        onPress={handleNewChat}
        style={({ hovered }: any) => [styles.newChatButton, hovered && styles.newChatButtonHovered]}
        accessibilityLabel="Start new chat"
        accessibilityRole="button"
      >
        <Text style={styles.newChatIcon}>+</Text>
        <Text style={styles.newChatText}>New Chat</Text>
      </Pressable>

      {isLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={colors.purple} size="small" />
        </View>
      ) : conversations.length === 0 ? (
        <>
          <View style={styles.emptyContainer}>
            <Sparkles size={20} color={colors.textGhost} />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtitle}>Your chat history will appear here</Text>
          </View>
          <View style={styles.drawerFooter}>
            <Text style={styles.footerText}>0 conversations</Text>
          </View>
        </>
      ) : (
        <>
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ConversationItem
                item={item}
                onOpen={handleOpen}
                onDelete={handleDelete}
                timeAgo={timeAgo(item.updated_at)}
              />
            )}
          />
          <View style={styles.drawerFooter}>
            <Text style={styles.footerText}>
              {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </>
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
  newChatButtonHovered: {
    backgroundColor: colors.purpleAccent,
    borderColor: colors.purple,
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
    marginBottom: 8,
  },
  emptyTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: fonts.uiMedium,
    marginBottom: 4,
  },
  emptySubtitle: {
    color: colors.textGhost,
    fontSize: 12,
    fontFamily: fonts.ui,
  },
  drawerFooter: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.glass,
    alignItems: "center",
  },
  footerText: {
    color: colors.textGhost,
    fontSize: 11,
    fontFamily: fonts.ui,
    letterSpacing: 1,
  },
  conversationRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass,
  },
  conversationRowHovered: {
    backgroundColor: colors.glass,
  },
  conversationTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: fonts.ui,
    lineHeight: 20,
  },
  conversationTime: {
    color: colors.textGhost,
    fontSize: 11,
    fontFamily: fonts.ui,
    marginTop: 4,
  },
  rowContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowText: {
    flex: 1,
  },
  editButton: {
    padding: 8,
  },
  editInput: {
    color: colors.textPrimary,
    fontSize: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.purple,
    paddingVertical: 4,
  },
});
