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
  DimensionValue,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { BookBackground } from "../../../components/BookBackground";
import { BookArtTuner } from "../../../components/BookArtTuner";
import { Ionicons } from "@expo/vector-icons";
import { Bookmark, BookmarkCheck, Copy, Share2, Sparkles } from "lucide-react-native";
import { colors, fonts } from "../../../lib/theme";
import { BIBLE_BOOKS } from "../../../lib/bible-data";
import { supabase } from "../../../lib/supabase";
import { useSettings, fontScale, lightColors } from "../../../lib/settings";
import { SettingsSheet } from "../../../components/SettingsSheet";

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

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [tunerVisible, setTunerVisible] = useState(false);

  const { theme, fontSize } = useSettings();
  const scale = fontScale(fontSize);

  const activeColors = useMemo(() => {
    if (theme === "light") {
      return {
        ...colors,
        ...lightColors,
      };
    }
    return colors;
  }, [theme]);

  const dynamicStyles = useMemo(() => {
    return StyleSheet.create({
      container: {
        backgroundColor: activeColors.obsidian,
      },
      header: {
        borderBottomColor: activeColors.glassBorder,
      },
      headerTitle: {
        color: activeColors.textPrimary,
      },
      progressBarBg: {
        backgroundColor: activeColors.glass,
      },
      errorText: {
        color: activeColors.textMuted,
      },
      retryButton: {
        backgroundColor: activeColors.glass,
        borderColor: activeColors.purpleBorder,
      },
      headingText: {
        color: activeColors.textSecondary,
      },
      verseNumber: {
        color: activeColors.purpleGlow,
      },
      verseContent: {
        color: activeColors.textPrimary,
      },
      bottomButton: {
        backgroundColor: activeColors.glass,
        borderColor: activeColors.glassBorder,
      },
      bottomButtonText: {
        color: activeColors.textPrimary,
      },
      verseLineSelected: {
        backgroundColor: activeColors.purpleMist,
      },
      verseActionBtn: {
        backgroundColor: activeColors.glass,
        borderColor: activeColors.glassBorder,
      },
      verseActionText: {
        color: activeColors.textSecondary,
      },
    });
  }, [activeColors]);

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

  const book = useMemo(() => BIBLE_BOOKS.find((b) => b.id === bookId), [bookId]);

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
        await supabase.from("user_verse_data").upsert(
          {
            user_id: userId,
            book_id: bookId,
            chapter: chapterNum,
            verse: v.verse,
            is_bookmarked: true,
          },
          { onConflict: "user_id,book_id,chapter,verse" },
        );
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
    router.back();
  }, [router]);

  const navigateChapter = useCallback(
    (dir: "prev" | "next") => {
      triggerHaptic();
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      const target = dir === "prev" ? chapterNum - 1 : chapterNum + 1;
      router.replace(`/reader/${bookId}/${target}`);
    },
    [router, bookId, chapterNum],
  );

  const headerTitle = book ? `${book.name} ${chapter}` : `Chapter ${chapter}`;

  /* eslint-disable @typescript-eslint/no-require-imports */
  const bgImageSource = useMemo(() => {
    switch (bookId?.toUpperCase()) {
      case "GEN":
        return require("../../../assets/Genesis.png");
      case "EXO":
        return require("../../../assets/Exodus.png");
      case "LEV":
        return require("../../../assets/Leviticus.png");
      case "NUM":
        return require("../../../assets/Numbers.png");
      case "DEU":
        return require("../../../assets/Deuteronomy.png");
      case "JOS":
        return require("../../../assets/Joshua.png");
      case "JDG":
        return require("../../../assets/Judges.png");
      case "RUT":
        return require("../../../assets/Ruth.png");
      case "1SA":
        return require("../../../assets/1Samuel.png");
      case "2SA":
        return require("../../../assets/2Samuel.png");
      case "1KI":
        return require("../../../assets/1Kings.png");
      case "2KI":
        return require("../../../assets/2Kings.png");
      case "1CH":
        return require("../../../assets/1Chronicles.png");
      case "2CH":
        return require("../../../assets/2Chronicles.png");
      case "EZR":
        return require("../../../assets/Ezra.png");
      case "NEH":
        return require("../../../assets/Nehemiah.png");
      case "EST":
        return require("../../../assets/Esther.png");
      case "JOB":
        return require("../../../assets/Job.png");
      case "PSA":
        return require("../../../assets/Psalms.png");
      case "PRO":
        return require("../../../assets/Proverbs.png");
      case "ECC":
        return require("../../../assets/Ecclesiastes.png");
      case "SNG":
        return require("../../../assets/SongOfSolomon.png");
      case "ISA":
        return require("../../../assets/Isaiah.png");
      case "JER":
        return require("../../../assets/Jeremiah.png");
      case "LAM":
        return require("../../../assets/Lamentations.png");
      case "EZK":
        return require("../../../assets/Ezekiel.png");
      case "DAN":
        return require("../../../assets/Daniel.png");
      case "HOS":
        return require("../../../assets/Hosea.png");
      case "JOL":
        return require("../../../assets/Joel.png");
      case "AMO":
        return require("../../../assets/Amos.png");
      case "OBA":
        return require("../../../assets/Obadiah.png");
      case "JON":
        return require("../../../assets/Jonah.png");
      case "MIC":
        return require("../../../assets/Micah.png");
      case "NAM":
        return require("../../../assets/Nahum.png");
      case "HAB":
        return require("../../../assets/Habakkuk.png");
      case "ZEP":
        return require("../../../assets/Zephaniah.png");
      case "HAG":
        return require("../../../assets/Haggai.png");
      case "ZEC":
        return require("../../../assets/Zechariah.png");
      case "MAL":
        return require("../../../assets/Malachi.png");
      case "MAT":
        return require("../../../assets/Matthew.png");
      case "MRK":
        return require("../../../assets/Mark.png");
      case "LUK":
        return require("../../../assets/Luke.png");
      case "JHN":
        return require("../../../assets/John.png");
      case "ACT":
        return require("../../../assets/Acts.png");
      case "ROM":
        return require("../../../assets/Romans.png");
      case "1CO":
        return require("../../../assets/1Corinthians.png");
      case "2CO":
        return require("../../../assets/2Corinthians.png");
      case "GAL":
        return require("../../../assets/Galatians.png");
      case "EPH":
        return require("../../../assets/Ephesians.png");
      case "PHP":
        return require("../../../assets/Philippians.png");
      case "COL":
        return require("../../../assets/Colossians.png");
      case "1TH":
        return require("../../../assets/1Thessalonians.png");
      case "2TH":
        return require("../../../assets/2Thessalonians.png");
      case "1TI":
        return require("../../../assets/1Timothy.png");
      case "2TI":
        return require("../../../assets/2Timothy.png");
      case "TIT":
        return require("../../../assets/Titus.png");
      case "PHM":
        return require("../../../assets/Philemon.png");
      case "HEB":
        return require("../../../assets/Hebrews.png");
      case "JAS":
        return require("../../../assets/James.png");
      case "1PE":
        return require("../../../assets/1Peter.png");
      case "2PE":
        return require("../../../assets/2Peter.png");
      case "1JN":
        return require("../../../assets/1John.png");
      case "2JN":
        return require("../../../assets/2John.png");
      case "3JN":
        return require("../../../assets/3John.png");
      case "JUD":
        return require("../../../assets/Jude.png");
      case "REV":
        return require("../../../assets/Revelation.png");
      default:
        return null;
    }
  }, [bookId]);
  /* eslint-enable @typescript-eslint/no-require-imports */

  const isCustomBg = bgImageSource !== null;

  const readerContent = (
    <SafeAreaView
      style={[styles.container, dynamicStyles.container, isCustomBg && styles.transparentBg]}
      edges={["top"]}
    >
      <Animated.View entering={FadeIn.duration(400)} style={styles.inner}>
        {/* Header */}
        <View style={[styles.header, dynamicStyles.header]}>
          <Pressable
            onPress={handleBack}
            style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.headerButton,
              hovered && styles.headerButtonHovered,
            ]}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color={activeColors.textPrimary} />
          </Pressable>

          <View style={styles.headerNav}>
            <Pressable
              onPress={() => navigateChapter("prev")}
              style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
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
                color={hasPrev ? activeColors.textSecondary : activeColors.textGhost}
              />
            </Pressable>

            <Pressable
              onLongPress={isCustomBg ? () => setTunerVisible(true) : undefined}
              delayLongPress={800}
              style={styles.headerTitlePressable}
            >
              <Text style={[styles.headerTitle, dynamicStyles.headerTitle]} numberOfLines={1}>
                {headerTitle}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => navigateChapter("next")}
              style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
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
                color={hasNext ? activeColors.textSecondary : activeColors.textGhost}
              />
            </Pressable>
          </View>

          {/* Settings Button */}
          <Pressable
            onPress={() => {
              triggerHaptic();
              setSettingsVisible(true);
            }}
            style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.headerButton,
              hovered && styles.headerButtonHovered,
            ]}
            accessibilityLabel="Open settings"
            accessibilityRole="button"
          >
            <Ionicons name="settings-outline" size={22} color={activeColors.textPrimary} />
          </Pressable>
        </View>

        {/* Reading progress bar */}
        <View style={[styles.progressBarBg, dynamicStyles.progressBarBg]}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${scrollProgress * 100}%` as DimensionValue },
            ]}
          />
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.purple} size="large" />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={[styles.errorText, dynamicStyles.errorText]}>{error}</Text>
            <Pressable
              onPress={fetchChapter}
              style={[styles.retryButton, dynamicStyles.retryButton]}
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
              <View style={[styles.headingLine, { backgroundColor: activeColors.glass }]} />
              <Text style={[styles.headingText, dynamicStyles.headingText]}>{book?.name}</Text>
              <View style={[styles.headingLine, { backgroundColor: activeColors.glass }]} />
            </View>
            <Text style={styles.chapterNumLarge}>{chapter}</Text>

            {/* Verse text — elegant flowing layout with paragraph grouping */}
            <View style={styles.verseBlock}>
              {verses.map((v, i) => {
                const isFirstVerse = i === 0;

                // Gutenberg drop cap extraction
                let dropCap = "";
                let remaining = v.content;
                if (isFirstVerse && v.content.trim().length > 0) {
                  const trimmed = v.content.trim();
                  if (
                    trimmed.startsWith('"') ||
                    trimmed.startsWith("“") ||
                    trimmed.startsWith("'") ||
                    trimmed.startsWith("‘")
                  ) {
                    dropCap = trimmed.slice(0, 2);
                    remaining = trimmed.slice(2);
                  } else {
                    dropCap = trimmed.charAt(0);
                    remaining = trimmed.slice(1);
                  }
                }

                return (
                  <View key={v.verse}>
                    <Pressable
                      onPress={() => setSelectedVerse(selectedVerse === v.verse ? null : v.verse)}
                      style={[
                        styles.verseLine,
                        isFirstVerse && styles.verseLineFirst,
                        selectedVerse === v.verse && [
                          styles.verseLineSelected,
                          dynamicStyles.verseLineSelected,
                        ],
                        i > 0 && i % 5 === 0 && styles.verseLineParagraph,
                      ]}
                      accessibilityLabel={`Verse ${v.verse}`}
                      accessibilityRole="button"
                      accessibilityHint="Tap for options"
                    >
                      <View style={styles.verseNumberContainer}>
                        {bookmarkedVerses.has(v.verse) ? (
                          <BookmarkCheck size={14} color={colors.purpleGlow} />
                        ) : (
                          <Text style={[styles.verseNumber, dynamicStyles.verseNumber]}>
                            {v.verse}
                          </Text>
                        )}
                      </View>

                      {isFirstVerse ? (
                        <Text
                          style={[
                            styles.verseContent,
                            { fontSize: 18 * scale, lineHeight: 30 * scale },
                            dynamicStyles.verseContent,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dropCapText,
                              {
                                fontSize: 40 * scale,
                                color: theme === "light" ? colors.amber : colors.amberGlow,
                              },
                            ]}
                          >
                            {dropCap}
                          </Text>
                          {remaining}
                          {copyFeedback === v.verse && (
                            <Text style={styles.copiedBadge}> ✓ Copied</Text>
                          )}
                          {bookmarkFeedback === v.verse && (
                            <Text style={styles.copiedBadge}>
                              {bookmarkedVerses.has(v.verse) ? " ✓ Saved" : " Removed"}
                            </Text>
                          )}
                        </Text>
                      ) : (
                        <Text
                          style={[
                            styles.verseContent,
                            { fontSize: 18 * scale, lineHeight: 30 * scale },
                            dynamicStyles.verseContent,
                          ]}
                        >
                          {v.content}
                          {copyFeedback === v.verse && (
                            <Text style={styles.copiedBadge}> ✓ Copied</Text>
                          )}
                          {bookmarkFeedback === v.verse && (
                            <Text style={styles.copiedBadge}>
                              {bookmarkedVerses.has(v.verse) ? " ✓ Saved" : " Removed"}
                            </Text>
                          )}
                        </Text>
                      )}
                    </Pressable>
                    {selectedVerse === v.verse && (
                      <Animated.View entering={FadeIn.duration(150)} style={styles.verseActions}>
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            handleVerseCopy(v);
                          }}
                          style={[styles.verseActionBtn, dynamicStyles.verseActionBtn]}
                          accessibilityLabel="Copy verse"
                          accessibilityRole="button"
                        >
                          <View style={styles.verseActionRow}>
                            <Copy size={12} color={activeColors.textSecondary} />
                            <Text style={[styles.verseActionText, dynamicStyles.verseActionText]}>
                              {" "}
                              Copy
                            </Text>
                          </View>
                        </Pressable>
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            handleVerseBookmark(v);
                          }}
                          style={[
                            styles.verseActionBtn,
                            dynamicStyles.verseActionBtn,
                            bookmarkedVerses.has(v.verse) && styles.verseActionActive,
                          ]}
                          accessibilityLabel={
                            bookmarkedVerses.has(v.verse) ? "Remove bookmark" : "Bookmark verse"
                          }
                          accessibilityRole="button"
                        >
                          <View style={styles.verseActionRow}>
                            {bookmarkedVerses.has(v.verse) ? (
                              <BookmarkCheck size={12} color={colors.purpleGlow} />
                            ) : (
                              <Bookmark size={12} color={activeColors.textSecondary} />
                            )}
                            <Text
                              style={[
                                styles.verseActionText,
                                dynamicStyles.verseActionText,
                                bookmarkedVerses.has(v.verse) && styles.verseActionActiveText,
                              ]}
                            >
                              {bookmarkedVerses.has(v.verse) ? " Saved" : " Bookmark"}
                            </Text>
                          </View>
                        </Pressable>
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            handleVerseShare(v);
                          }}
                          style={[styles.verseActionBtn, dynamicStyles.verseActionBtn]}
                          accessibilityLabel="Share verse"
                          accessibilityRole="button"
                        >
                          <View style={styles.verseActionRow}>
                            <Share2 size={12} color={activeColors.textSecondary} />
                            <Text style={[styles.verseActionText, dynamicStyles.verseActionText]}>
                              {" "}
                              Share
                            </Text>
                          </View>
                        </Pressable>
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            handleAskAion(v);
                          }}
                          style={[styles.verseActionBtn, styles.verseActionPrimary]}
                          accessibilityLabel="Ask Aion about this verse"
                          accessibilityRole="button"
                        >
                          <View style={styles.verseActionRow}>
                            <Sparkles size={12} color={colors.purpleGlow} />
                            <Text style={[styles.verseActionText, styles.verseActionPrimaryText]}>
                              {" "}
                              Ask Aion
                            </Text>
                          </View>
                        </Pressable>
                      </Animated.View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Bottom navigation */}
            <View style={[styles.bottomNav, { borderTopColor: activeColors.glassBorder }]}>
              <Text style={[styles.chapterIndicator, { color: activeColors.textGhost }]}>
                Chapter {chapterNum} of {totalChapters}
              </Text>

              <View style={styles.bottomButtons}>
                <Pressable
                  onPress={() => navigateChapter("prev")}
                  style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                    styles.bottomButton,
                    dynamicStyles.bottomButton,
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
                    color={hasPrev ? activeColors.textPrimary : activeColors.textGhost}
                  />
                  <Text
                    style={[
                      styles.bottomButtonText,
                      dynamicStyles.bottomButtonText,
                      !hasPrev && styles.bottomButtonTextDisabled,
                    ]}
                  >
                    Previous
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => navigateChapter("next")}
                  style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                    styles.bottomButton,
                    dynamicStyles.bottomButton,
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
                      dynamicStyles.bottomButtonText,
                      !hasNext && styles.bottomButtonTextDisabled,
                    ]}
                  >
                    Next
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={hasNext ? activeColors.textPrimary : activeColors.textGhost}
                  />
                </Pressable>
              </View>
            </View>
          </ScrollView>
        )}
      </Animated.View>

      {settingsVisible && <SettingsSheet onClose={() => setSettingsVisible(false)} />}
      {tunerVisible && book && isCustomBg && bgImageSource && (
        <BookArtTuner
          bookId={book.id}
          bookName={book.name}
          imageSource={bgImageSource}
          onClose={() => setTunerVisible(false)}
        />
      )}
    </SafeAreaView>
  );

  if (isCustomBg && bgImageSource) {
    return (
      <BookBackground bookId={book?.id ?? ""} imageSource={bgImageSource}>
        {readerContent}
      </BookBackground>
    );
  }

  return readerContent;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.obsidian,
  },
  transparentBg: {
    backgroundColor: "transparent",
  },
  headerTitlePressable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
    width: "100%",
    ...Platform.select({
      web: {
        maxWidth: 680,
        alignSelf: "center",
      },
      default: {},
    }),
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerButtonHovered: {
    backgroundColor: colors.glass,
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
    backgroundColor: colors.purpleMist,
    borderColor: colors.purpleBorder,
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
    backgroundColor: colors.glass,
  },
  progressBarFill: {
    height: 2,
    backgroundColor: colors.purple,
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
    width: "100%",
    ...Platform.select({
      web: {
        maxWidth: 680,
        alignSelf: "center",
      },
      default: {},
    }),
  },
  chapterHeading: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  headingLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.glass,
  },
  headingText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fonts.uiBold,
    fontWeight: "700",
    letterSpacing: 3,
    textTransform: "uppercase",
    paddingHorizontal: 12,
  },
  chapterNumLarge: {
    color: colors.purpleGlow,
    fontSize: 48,
    fontFamily: fonts.ui,
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
    backgroundColor: colors.purpleMist,
    borderColor: colors.purpleBorder,
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
    backgroundColor: "rgba(217, 119, 6, 0.05)",
    borderColor: "rgba(217, 119, 6, 0.25)",
    borderWidth: 1,
    borderRadius: 10,
    marginHorizontal: -6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  verseLineParagraph: {
    marginTop: 16,
  },
  verseActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: colors.void,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  verseActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  verseActionPrimary: {
    backgroundColor: "rgba(138, 43, 226, 0.10)",
    borderColor: "rgba(138, 43, 226, 0.30)",
  },
  verseActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  verseActionText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.uiMedium,
  },
  verseActionPrimaryText: {
    color: colors.purpleGlow,
    fontWeight: "600",
  },
  copiedBadge: {
    color: colors.purpleGlow,
    fontSize: 12,
    fontFamily: fonts.verseItalic,
    fontStyle: "italic",
  },
  verseActionActive: {
    backgroundColor: colors.purpleMist,
    borderColor: colors.purpleBorder,
  },
  verseActionActiveText: {
    color: colors.purpleGlow,
  },
  dropCapText: {
    fontFamily: fonts.verse,
    fontWeight: "700",
  },
});
