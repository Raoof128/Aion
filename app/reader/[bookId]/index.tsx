import { useMemo, useCallback } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../../../lib/theme";
import { BIBLE_BOOKS } from "../../../lib/bible-data";

function triggerHaptic() {
  if (Platform.OS !== "web") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export default function ChapterListScreen() {
  const router = useRouter();
  const { bookId } = useLocalSearchParams<{ bookId: string }>();

  const book = useMemo(() => BIBLE_BOOKS.find((b) => b.id === bookId), [bookId]);

  const chapters = useMemo(() => {
    if (!book) return [];
    return Array.from({ length: book.chapters }, (_, i) => i + 1);
  }, [book]);

  const handleChapterPress = useCallback(
    (chapter: number) => {
      triggerHaptic();
      router.push(`/reader/${bookId}/${chapter}`);
    },
    [router, bookId],
  );

  const handleBack = useCallback(() => {
    triggerHaptic();
    router.back();
  }, [router]);

  const renderChapter = useCallback(
    ({ item, index }: { item: number; index: number }) => (
      <Animated.View entering={FadeInUp.delay(Math.min(index * 15, 500)).duration(200)}>
        <Pressable
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.chapterCell,
            hovered && styles.chapterCellHovered,
            pressed && styles.chapterCellPressed,
          ]}
          onPress={() => handleChapterPress(item)}
          accessibilityLabel={`Chapter ${item}`}
          accessibilityRole="button"
        >
          <Text style={styles.chapterNumber}>{item}</Text>
        </Pressable>
      </Animated.View>
    ),
    [handleChapterPress],
  );

  const keyExtractor = useCallback((item: number) => String(item), []);

  if (!book) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Book not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.inner}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={handleBack}
            style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.backButton,
              hovered && styles.backButtonHovered,
            ]}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {book.name}
            </Text>
            <Text style={styles.headerSubtitle}>
              {book.chapters} {book.chapters === 1 ? "chapter" : "chapters"}
            </Text>
          </View>
          {/* Spacer to balance the back button */}
          <View style={styles.backButton} />
        </View>

        {/* Section indicator */}
        <View style={styles.sectionInfo}>
          <View style={styles.sectionLine} />
          <Text style={styles.sectionText}>SELECT CHAPTER</Text>
          <View style={styles.sectionLine} />
        </View>
        <Text style={styles.hintText}>Tap to start reading</Text>

        {/* Chapter Grid */}
        <FlatList
          data={chapters}
          renderItem={renderChapter}
          keyExtractor={keyExtractor}
          numColumns={5}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const CELL_SIZE = 64;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.obsidian,
  },
  inner: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonHovered: {
    backgroundColor: colors.glass,
    borderRadius: 10,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.uiBold,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: fonts.ui,
    color: colors.textGhost,
    marginTop: 2,
  },
  sectionInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.glassBorder,
  },
  sectionText: {
    fontSize: 10,
    letterSpacing: 2,
    color: colors.textGhost,
    fontFamily: fonts.uiBold,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: "center",
  },
  row: {
    gap: 10,
    marginBottom: 10,
    justifyContent: "center",
  },
  chapterCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 14,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  chapterCellHovered: {
    borderColor: colors.purpleAccent,
    backgroundColor: colors.purpleMist,
  },
  chapterCellPressed: {
    backgroundColor: colors.purpleAccent,
    borderColor: colors.purple,
  },
  chapterNumber: {
    fontSize: 16,
    fontFamily: fonts.uiMedium,
    color: colors.textPrimary,
  },
  hintText: {
    color: colors.textGhost,
    fontSize: 11,
    textAlign: "center",
    marginBottom: 12,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 16,
    fontFamily: fonts.ui,
    color: colors.textMuted,
  },
});
