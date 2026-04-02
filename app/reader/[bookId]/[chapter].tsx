import { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../../../lib/theme";
import { BIBLE_BOOKS } from "../../../lib/bible-data";
import { supabase } from "../../../lib/supabase";

interface Verse {
  verse: number;
  content: string;
  book_name: string;
}

function triggerHaptic() {
  if (Platform.OS !== "web") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export default function ChapterReaderScreen() {
  const router = useRouter();
  const { bookId, chapter } = useLocalSearchParams<{
    bookId: string;
    chapter: string;
  }>();

  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const chapterNum = Number(chapter);

  const book = useMemo(
    () => BIBLE_BOOKS.find((b) => b.id === bookId),
    [bookId]
  );

  const totalChapters = book?.chapters ?? 0;
  const hasPrev = chapterNum > 1;
  const hasNext = chapterNum < totalChapters;

  useEffect(() => {
    let cancelled = false;

    async function fetchVerses() {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from("bible_verses")
          .select("verse, content, book_name")
          .eq("book_id", bookId)
          .eq("chapter", chapterNum)
          .order("verse", { ascending: true });

        if (cancelled) return;

        if (fetchError) {
          setError("Failed to load chapter");
          console.error("Supabase fetch error:", fetchError);
        } else {
          setVerses(data ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load chapter");
          console.error("Fetch error:", err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchVerses();
    return () => {
      cancelled = true;
    };
  }, [bookId, chapterNum]);

  const handleBack = useCallback(() => {
    triggerHaptic();
    router.back();
  }, [router]);

  const navigateChapter = useCallback(
    (dir: "prev" | "next") => {
      triggerHaptic();
      const target = dir === "prev" ? chapterNum - 1 : chapterNum + 1;
      router.replace(`/reader/${bookId}/${target}`);
    },
    [router, bookId, chapterNum]
  );

  const headerTitle = book ? `${book.name} ${chapter}` : `Chapter ${chapter}`;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.inner}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={handleBack}
            style={styles.headerButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={colors.textPrimary}
            />
          </Pressable>

          <View style={styles.headerNav}>
            <Pressable
              onPress={() => navigateChapter("prev")}
              style={[styles.navArrow, !hasPrev && styles.navArrowDisabled]}
              disabled={!hasPrev}
              accessibilityLabel="Previous chapter"
              accessibilityRole="button"
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={hasPrev ? colors.textSecondary : colors.textGhost}
              />
            </Pressable>

            <Text style={styles.headerTitle} numberOfLines={1}>
              {headerTitle}
            </Text>

            <Pressable
              onPress={() => navigateChapter("next")}
              style={[styles.navArrow, !hasNext && styles.navArrowDisabled]}
              disabled={!hasNext}
              accessibilityLabel="Next chapter"
              accessibilityRole="button"
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={hasNext ? colors.textSecondary : colors.textGhost}
              />
            </Pressable>
          </View>

          {/* Spacer to balance back button */}
          <View style={styles.headerButton} />
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.purple} size="large" />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              onPress={() => {
                triggerHaptic();
                setLoading(true);
                setError(null);
                // Re-trigger fetch by forcing state update
                setVerses([]);
                // The useEffect will re-run because we reset loading
                setTimeout(() => {
                  supabase
                    .from("bible_verses")
                    .select("verse, content, book_name")
                    .eq("book_id", bookId)
                    .eq("chapter", chapterNum)
                    .order("verse", { ascending: true })
                    .then(({ data, error: fetchError }) => {
                      if (fetchError) {
                        setError("Failed to load chapter");
                      } else {
                        setVerses(data ?? []);
                      }
                      setLoading(false);
                    });
                }, 100);
              }}
              style={styles.retryButton}
              accessibilityLabel="Retry loading chapter"
              accessibilityRole="button"
            >
              <Text style={styles.retryText}>Tap to retry</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Verse text — continuous flowing layout */}
            <Text style={styles.verseBlock}>
              {verses.map((v) => (
                <Text key={v.verse} style={styles.verseText}>
                  <Text style={styles.verseNumber}>{v.verse} </Text>
                  <Text style={styles.verseContent}>{v.content} </Text>
                </Text>
              ))}
            </Text>

            {/* Bottom navigation */}
            <View style={styles.bottomNav}>
              <Text style={styles.chapterIndicator}>
                Chapter {chapterNum} of {totalChapters}
              </Text>

              <View style={styles.bottomButtons}>
                <Pressable
                  onPress={() => navigateChapter("prev")}
                  style={({ pressed }) => [
                    styles.bottomButton,
                    !hasPrev && styles.bottomButtonDisabled,
                    pressed && hasPrev && styles.bottomButtonPressed,
                  ]}
                  disabled={!hasPrev}
                  accessibilityLabel="Previous chapter"
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="chevron-back"
                    size={16}
                    color={hasPrev ? colors.textPrimary : colors.textGhost}
                  />
                  <Text
                    style={[
                      styles.bottomButtonText,
                      !hasPrev && styles.bottomButtonTextDisabled,
                    ]}
                  >
                    Previous
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => navigateChapter("next")}
                  style={({ pressed }) => [
                    styles.bottomButton,
                    !hasNext && styles.bottomButtonDisabled,
                    pressed && hasNext && styles.bottomButtonPressed,
                  ]}
                  disabled={!hasNext}
                  accessibilityLabel="Next chapter"
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.bottomButtonText,
                      !hasNext && styles.bottomButtonTextDisabled,
                    ]}
                  >
                    Next
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={hasNext ? colors.textPrimary : colors.textGhost}
                  />
                </Pressable>
              </View>
            </View>
          </ScrollView>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

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
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerNav: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  navArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.glass,
    alignItems: "center",
    justifyContent: "center",
  },
  navArrowDisabled: {
    opacity: 0.4,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: fonts.uiBold,
    color: colors.textPrimary,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 15,
    fontFamily: fonts.ui,
    color: colors.textMuted,
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.purpleBorder,
  },
  retryText: {
    fontSize: 14,
    fontFamily: fonts.uiMedium,
    color: colors.purpleGlow,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 60,
  },
  verseBlock: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  verseText: {
    // wrapper for each verse inline
  },
  verseNumber: {
    fontSize: 10,
    fontFamily: fonts.uiBold,
    color: colors.purpleGlow,
    lineHeight: 20,
  },
  verseContent: {
    fontSize: 17,
    fontFamily: fonts.verse,
    color: colors.textPrimary,
    lineHeight: 32,
  },
  bottomNav: {
    marginTop: 48,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    alignItems: "center",
  },
  chapterIndicator: {
    fontSize: 12,
    fontFamily: fonts.ui,
    color: colors.textGhost,
    marginBottom: 16,
  },
  bottomButtons: {
    flexDirection: "row",
    gap: 16,
  },
  bottomButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  bottomButtonPressed: {
    backgroundColor: colors.purpleAccent,
    borderColor: colors.purpleBorder,
  },
  bottomButtonDisabled: {
    opacity: 0.4,
  },
  bottomButtonText: {
    fontSize: 14,
    fontFamily: fonts.uiMedium,
    color: colors.textPrimary,
  },
  bottomButtonTextDisabled: {
    color: colors.textGhost,
  },
});
