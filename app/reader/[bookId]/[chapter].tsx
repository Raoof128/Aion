import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Bookmark, BookmarkCheck, Copy, Share2, Sparkles} from "lucide-react-native";
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
  const [scrollProgress, setScrollProgress] = useState(0);
  const [copyFeedback, setCopyFeedback] = useState<number | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [bookmarkedVerses, setBookmarkedVerses] = useState<Set<number>>(new Set());
  const [bookmarkFeedback, setBookmarkFeedback] = useState<number | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const lastScrollY = useRef(0);

  const chapterNum = Number(chapter);

  const book = useMemo(
    () => BIBLE_BOOKS.find((b) => b.id === bookId),
    [bookId]
  );

  const totalChapters = book?.chapters ?? 0;
  const hasPrev = chapterNum > 1;
  const hasNext = chapterNum < totalChapters;

  const fetchChapter = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("bible_verses")
        .select("verse, content, book_name")
        .eq("book_id", bookId)
        .eq("chapter", chapterNum)
        .order("verse", { ascending: true });

      if (fetchError) {
        setError("Failed to load chapter");
      } else {
        setVerses(data ?? []);
      }
    } catch {
      setError("Failed to load chapter");
    } finally {
      setLoading(false);
    }
  }, [bookId, chapterNum]);

  useEffect(() => {
    fetchChapter();
  }, [fetchChapter]);

  // Load existing bookmarks for this chapter
  useEffect(() => {
    async function loadBookmarks() {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) return;
      const { data } = await supabase
        .from("user_verse_data")
        .select("verse")
        .eq("user_id", session.session.user.id)
        .eq("book_id", bookId)
        .eq("chapter", chapterNum)
        .eq("is_bookmarked", true);
      if (data) {
        setBookmarkedVerses(new Set(data.map((d: { verse: number }) => d.verse)));
      }
    }
    loadBookmarks();
  }, [bookId, chapterNum]);

  const handleVerseCopy = async (v: Verse) => {
    const text = `${book?.name} ${chapterNum}:${v.verse} — "${v.content}"`;
    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        const Clipboard = await import("expo-clipboard");
        await Clipboard.setStringAsync(text);
      }
    } catch {}
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCopyFeedback(v.verse);
    setTimeout(() => setCopyFeedback(null), 1200);
    setSelectedVerse(null);
  };

  const handleVerseShare = async (v: Verse) => {
    const text = `${book?.name} ${chapterNum}:${v.verse} — "${v.content}"`;
    try {
      await Share.share({ message: text });
    } catch {}
    setSelectedVerse(null);
  };

  const handleVerseBookmark = async (v: Verse) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) return;
      const userId = session.session.user.id;
      const isCurrentlyBookmarked = bookmarkedVerses.has(v.verse);

      if (isCurrentlyBookmarked) {
        await supabase
          .from("user_verse_data")
          .update({ is_bookmarked: false })
          .eq("user_id", userId)
          .eq("book_id", bookId)
          .eq("chapter", chapterNum)
          .eq("verse", v.verse);
        setBookmarkedVerses((prev) => {
          const next = new Set(prev);
          next.delete(v.verse);
          return next;
        });
      } else {
        await supabase
          .from("user_verse_data")
          .upsert({
            user_id: userId,
            book_id: bookId,
            chapter: chapterNum,
            verse: v.verse,
            is_bookmarked: true,
          }, { onConflict: "user_id,book_id,chapter,verse" });
        setBookmarkedVerses((prev) => new Set(prev).add(v.verse));
      }

      setBookmarkFeedback(v.verse);
      setTimeout(() => setBookmarkFeedback(null), 1200);
    } catch (err) {
      console.error("Bookmark error:", err);
    }
    setSelectedVerse(null);
  };

  const handleAskAion = (v: Verse) => {
    const question = `Explain ${book?.name} ${chapterNum}:${v.verse} — "${v.content}"`;
    router.push({
      pathname: `/chat/new-${Date.now()}`,
      params: { initialMessage: question },
    });
  };

  const handleBack = useCallback(() => {
    triggerHaptic();
    router.push(`/reader/${bookId}`);
  }, [router, bookId]);

  const navigateChapter = useCallback(
    (dir: "prev" | "next") => {
      triggerHaptic();
      scrollRef.current?.scrollTo({ y: 0, animated: false });
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
            style={({ hovered }: any) => [
              styles.headerButton,
              hovered && styles.headerButtonHovered,
            ]}
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
              style={({ hovered }: any) => [
                styles.navArrow,
                hovered && styles.navArrowHovered,
                !hasPrev && styles.navArrowDisabled,
              ]}
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
              style={({ hovered }: any) => [
                styles.navArrow,
                hovered && styles.navArrowHovered,
                !hasNext && styles.navArrowDisabled,
              ]}
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

        {/* Reading progress bar */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${scrollProgress * 100}%` as any }]} />
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
              onPress={fetchChapter}
              style={styles.retryButton}
              accessibilityLabel="Retry loading chapter"
              accessibilityRole="button"
            >
              <Text style={styles.retryText}>Tap to retry</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onScroll={(e) => {
              const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
              const y = contentOffset.y;
              const totalHeight = contentSize.height - layoutMeasurement.height;
              if (totalHeight > 0) {
                setScrollProgress(Math.min(y / totalHeight, 1));
              }
              if (selectedVerse !== null && Math.abs(y - lastScrollY.current) > 20) {
                setSelectedVerse(null);
              }
              lastScrollY.current = y;
            }}
            scrollEventThrottle={16}
          >
            {/* Chapter heading */}
            <View style={styles.chapterHeading}>
              <View style={styles.headingLine} />
              <Text style={styles.headingText}>{book?.name}</Text>
              <View style={styles.headingLine} />
            </View>
            <Text style={styles.chapterNumLarge}>{chapter}</Text>

            {/* Verse text — elegant flowing layout with paragraph grouping */}
            <View style={styles.verseBlock}>
              {verses.map((v, i) => (
                <View key={v.verse}>
                  <Pressable
                    onPress={() => setSelectedVerse(selectedVerse === v.verse ? null : v.verse)}
                    style={[
                      styles.verseLine,
                      i === 0 && styles.verseLineFirst,
                      selectedVerse === v.verse && styles.verseLineSelected,
                      i > 0 && i % 5 === 0 && styles.verseLineParagraph,
                    ]}
                  >
                    <View style={styles.verseNumberContainer}>
                      {bookmarkedVerses.has(v.verse) ? (
                        <BookmarkCheck size={14} color={colors.purpleGlow} />
                      ) : (
                        <Text style={styles.verseNumber}>{v.verse}</Text>
                      )}
                    </View>
                    <Text style={styles.verseContent}>
                      {v.content}
                      {copyFeedback === v.verse && <Text style={styles.copiedBadge}> ✓ Copied</Text>}
                      {bookmarkFeedback === v.verse && (
                        <Text style={styles.copiedBadge}>
                          {bookmarkedVerses.has(v.verse) ? " ✓ Saved" : " Removed"}
                        </Text>
                      )}
                    </Text>
                  </Pressable>
                  {selectedVerse === v.verse && (
                    <Animated.View entering={FadeIn.duration(150)} style={styles.verseActions}>
                      <Pressable onPress={(e) => { e.stopPropagation(); handleVerseCopy(v); }} style={styles.verseActionBtn}>
                        <View style={styles.verseActionRow}>
                          <Copy size={12} color={colors.textSecondary} />
                          <Text style={styles.verseActionText}> Copy</Text>
                        </View>
                      </Pressable>
                      <Pressable onPress={(e) => { e.stopPropagation(); handleVerseBookmark(v); }} style={[styles.verseActionBtn, bookmarkedVerses.has(v.verse) && styles.verseActionActive]}>
                        <View style={styles.verseActionRow}>
                          {bookmarkedVerses.has(v.verse) ? (
                            <BookmarkCheck size={12} color={colors.purpleGlow} />
                          ) : (
                            <Bookmark size={12} color={colors.textSecondary} />
                          )}
                          <Text style={[styles.verseActionText, bookmarkedVerses.has(v.verse) && styles.verseActionActiveText]}>
                            {bookmarkedVerses.has(v.verse) ? " Saved" : " Bookmark"}
                          </Text>
                        </View>
                      </Pressable>
                      <Pressable onPress={(e) => { e.stopPropagation(); handleVerseShare(v); }} style={styles.verseActionBtn}>
                        <View style={styles.verseActionRow}>
                          <Share2 size={12} color={colors.textSecondary} />
                          <Text style={styles.verseActionText}> Share</Text>
                        </View>
                      </Pressable>
                      <Pressable onPress={(e) => { e.stopPropagation(); handleAskAion(v); }} style={[styles.verseActionBtn, styles.verseActionPrimary]}>
                        <View style={styles.verseActionRow}>
                          <Sparkles size={12} color={colors.purpleGlow} />
                          <Text style={[styles.verseActionText, styles.verseActionPrimaryText]}> Ask Aion</Text>
                        </View>
                      </Pressable>
                    </Animated.View>
                  )}
                </View>
              ))}
            </View>

            {/* Bottom navigation */}
            <View style={styles.bottomNav}>
              <Text style={styles.chapterIndicator}>
                Chapter {chapterNum} of {totalChapters}
              </Text>

              <View style={styles.bottomButtons}>
                <Pressable
                  onPress={() => navigateChapter("prev")}
                  style={({ pressed, hovered }: any) => [
                    styles.bottomButton,
                    hovered && styles.bottomButtonHovered,
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
                  style={({ pressed, hovered }: any) => [
                    styles.bottomButton,
                    hovered && styles.bottomButtonHovered,
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
  headerButtonHovered: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
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
  navArrowHovered: {
    backgroundColor: "rgba(138, 43, 226, 0.10)",
    borderColor: "rgba(138, 43, 226, 0.20)",
  },
  navArrowDisabled: {
    opacity: 0.4,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: fonts.uiBold,
    color: colors.textPrimary,
  },
  progressBarBg: {
    height: 2,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  progressBarFill: {
    height: 2,
    backgroundColor: "#8A2BE2",
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
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 80,
  },
  chapterHeading: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  headingLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  headingText: {
    color: "#9494A8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 3,
    textTransform: "uppercase",
    paddingHorizontal: 12,
  },
  chapterNumLarge: {
    color: "#A855F7",
    fontSize: 48,
    fontWeight: "200",
    textAlign: "center",
    marginBottom: 32,
    letterSpacing: 4,
  },
  verseBlock: {
    gap: 2,
  },
  verseLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  verseLineFirst: {
    paddingTop: 0,
  },
  verseNumberContainer: {
    width: 28,
    alignItems: "flex-end",
    marginRight: 12,
    paddingTop: 4,
  },
  verseNumber: {
    fontSize: 11,
    fontFamily: fonts.uiBold,
    color: colors.purpleGlow,
    lineHeight: 30,
    textAlign: "right",
    opacity: 0.7,
  },
  verseContent: {
    flex: 1,
    fontSize: 18,
    fontFamily: fonts.verse,
    color: colors.textPrimary,
    lineHeight: 30,
    letterSpacing: 0.2,
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
  bottomButtonHovered: {
    backgroundColor: "rgba(138, 43, 226, 0.06)",
    borderColor: "rgba(138, 43, 226, 0.20)",
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
  verseLineSelected: {
    backgroundColor: "rgba(138, 43, 226, 0.08)",
    borderRadius: 8,
    marginHorizontal: -4,
    paddingHorizontal: 8,
  },
  verseLineParagraph: {
    marginTop: 16,
  },
  verseActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  verseActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  verseActionPrimary: {
    backgroundColor: "rgba(138, 43, 226, 0.12)",
    borderColor: "rgba(138, 43, 226, 0.25)",
  },
  verseActionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  verseActionText: {
    color: "#9494A8",
    fontSize: 12,
  },
  verseActionPrimaryText: {
    color: "#A855F7",
  },
  copiedBadge: {
    color: "#A855F7",
    fontSize: 12,
    fontStyle: "italic",
  },
  verseActionActive: {
    backgroundColor: "rgba(138, 43, 226, 0.12)",
    borderColor: "rgba(138, 43, 226, 0.25)",
  },
  verseActionActiveText: {
    color: "#A855F7",
  },
});
