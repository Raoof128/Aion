import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
  StyleSheet,
  TextInput,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Pencil, Sparkles } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { colors, fonts } from "../../lib/theme";
import type { Conversation } from "../../lib/types";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function ConversationItem({
  item,
  onOpen,
  onDelete,
  timeAgoStr,
}: {
  item: Conversation;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  timeAgoStr: string;
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
    await supabase
      .from("conversations")
      .update({ title: editTitle.trim() })
      .eq("id", item.id);
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
    setIsEditing(false);
  };

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={() => !isEditing && onOpen(item.id)}
        onLongPress={() => !isEditing && onDelete(item.id)}
        onPressIn={() => {
          if (!isEditing) scale.value = withSpring(0.98);
        }}
        onPressOut={() => {
          scale.value = withSpring(1);
        }}
        style={({ hovered }: any) => [
          styles.conversationRow,
          hovered && styles.conversationRowHovered,
        ]}
        accessibilityLabel={`${item.title || "Untitled"}, ${timeAgoStr}`}
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
            <Text style={styles.conversationTime}>{timeAgoStr}</Text>
          </View>
          <Pressable
            onPress={() => setIsEditing(true)}
            style={({ hovered }: any) => [styles.editButton, hovered && styles.editButtonHovered]}
          >
            <Pencil size={14} color={colors.textGhost} />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function MoreScreen() {
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
    const uniqueId = `new-${Date.now()}`;
    router.push({
      pathname: `/chat/${uniqueId}`,
      params: { initialMessage: "" },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.purpleDot} />
          <Text style={styles.headerTitle}>MORE</Text>
        </View>
      </View>

      {/* New Chat button */}
      <View style={styles.actionsSection}>
        <Pressable
          onPress={handleNewChat}
          style={({ hovered }: any) => [
            styles.newChatButton,
            hovered && styles.newChatButtonHovered,
          ]}
          accessibilityLabel="Start new chat"
          accessibilityRole="button"
        >
          <Text style={styles.newChatIcon}>+</Text>
          <Text style={styles.newChatText}>New Chat</Text>
        </Pressable>
      </View>

      {/* Section label */}
      <View style={styles.sectionLabelRow}>
        <View style={styles.sectionLine} />
        <Text style={styles.sectionLabel}>CHAT HISTORY</Text>
        <View style={styles.sectionLine} />
      </View>

      {/* History list */}
      {isLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={colors.purple} size="small" />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Sparkles size={20} color={colors.textGhost} />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySubtitle}>
            Your chat history will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationItem
              item={item}
              onOpen={handleOpen}
              onDelete={handleDelete}
              timeAgoStr={timeAgo(item.updated_at)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {conversations.length} conversation
          {conversations.length !== 1 ? "s" : ""}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.obsidian,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  purpleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.purple,
  },
  headerTitle: {
    fontSize: 13,
    letterSpacing: 2,
    color: colors.textSecondary,
    fontFamily: fonts.uiBold,
  },
  actionsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
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
  },
  newChatButtonHovered: {
    backgroundColor: "rgba(138, 43, 226, 0.15)",
    borderColor: "rgba(138, 43, 226, 0.30)",
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
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 10,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.glassBorder,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: colors.textGhost,
    fontFamily: fonts.uiBold,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  conversationRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass,
  },
  conversationRowHovered: {
    backgroundColor: colors.glass,
  },
  rowContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowText: {
    flex: 1,
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
  editButton: {
    padding: 8,
  },
  editButtonHovered: {
    backgroundColor: colors.glass,
    borderRadius: 8,
  },
  editInput: {
    color: colors.textPrimary,
    fontSize: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.purple,
    paddingVertical: 4,
  },
  footer: {
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
});
