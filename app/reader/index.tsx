import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ChevronLeft } from "lucide-react-native";
import { colors, fonts } from "../../lib/theme";
import {
  OT_BOOKS,
  NT_BOOKS,
  BibleBook,
} from "../../lib/bible-data";

type Testament = "OT" | "NT";

function triggerHaptic() {
  if (Platform.OS !== "web") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export default function BookListScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Testament>("OT");

  const books = activeTab === "OT" ? OT_BOOKS : NT_BOOKS;

  const handleBookPress = useCallback(
    (book: BibleBook) => {
      triggerHaptic();
      router.push(`/reader/${book.id}`);
    },
    [router]
  );

  const handleTabPress = useCallback((tab: Testament) => {
    triggerHaptic();
    setActiveTab(tab);
  }, []);

  const renderBookCard = useCallback(
    ({ item, index }: { item: BibleBook; index: number }) => (
      <Animated.View
        entering={FadeInUp.delay(index * 30).duration(300)}
        style={styles.bookCardWrapper}
      >
        <Pressable
          style={({ pressed, hovered }: any) => [
            styles.bookCard,
            hovered && styles.bookCardHovered,
            pressed && styles.bookCardPressed,
          ]}
          onPress={() => handleBookPress(item)}
          accessibilityLabel={`${item.name}, ${item.chapters} chapters`}
          accessibilityRole="button"
        >
          <Text style={styles.bookName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.chapterCount}>
            {item.chapters} {item.chapters === 1 ? "chapter" : "chapters"}
          </Text>
        </Pressable>
      </Animated.View>
    ),
    [handleBookPress]
  );

  const keyExtractor = useCallback((item: BibleBook) => item.id, []);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.inner}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => { triggerHaptic(); router.back(); }}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <ChevronLeft size={20} color={colors.textSecondary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <View style={styles.headerRow}>
              <View style={styles.purpleDot} />
              <Text style={styles.headerTitle}>READER</Text>
            </View>
          </View>
          {/* Spacer to balance back button */}
          <View style={styles.backButton} />
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tab, activeTab === "OT" && styles.tabActive]}
            onPress={() => handleTabPress("OT")}
            accessibilityLabel="Old Testament"
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "OT" }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "OT" && styles.tabTextActive,
              ]}
            >
              Old Testament (39)
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "NT" && styles.tabActive]}
            onPress={() => handleTabPress("NT")}
            accessibilityLabel="New Testament"
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "NT" }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "NT" && styles.tabTextActive,
              ]}
            >
              New Testament (27)
            </Text>
          </Pressable>
        </View>

        {/* Section indicator */}
        <View style={styles.sectionInfo}>
          <View style={styles.sectionLine} />
          <Text style={styles.sectionText}>{books.length} BOOKS</Text>
          <View style={styles.sectionLine} />
        </View>

        {/* Book Grid */}
        <FlatList
          data={books}
          renderItem={renderBookCard}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
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
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: colors.purple,
  },
  tabText: {
    fontSize: 14,
    fontFamily: fonts.uiMedium,
    color: colors.textGhost,
  },
  tabTextActive: {
    color: colors.purpleGlow,
  },
  sectionInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
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
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  row: {
    gap: 10,
    marginBottom: 10,
  },
  bookCardWrapper: {
    flex: 1,
  },
  bookCard: {
    flex: 1,
    backgroundColor: colors.glass,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  bookCardHovered: {
    backgroundColor: colors.purpleMist,
    borderColor: colors.selection,
  },
  bookCardPressed: {
    backgroundColor: colors.purpleAccent,
    borderColor: colors.purpleBorder,
  },
  bookName: {
    fontSize: 14,
    fontFamily: fonts.uiMedium,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  chapterCount: {
    fontSize: 11,
    fontFamily: fonts.ui,
    color: colors.textGhost,
  },
});
