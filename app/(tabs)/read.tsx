import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Search, X } from "lucide-react-native";
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

export default function ReadScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Testament>("OT");
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const filteredBooks = useMemo(() => {
    const list = activeTab === "OT" ? OT_BOOKS : NT_BOOKS;
    if (!search.trim()) return list;
    return list.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));
  }, [activeTab, search]);

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
          <Text style={styles.bookAbbr}>{item.id}</Text>
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
          <View style={styles.headerCenter}>
            <View style={styles.headerRow}>
              <View style={styles.purpleDot} />
              <Text style={styles.headerTitle}>READER</Text>
            </View>
          </View>
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

        {/* Search bar */}
        <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused]}>
          <Search size={14} color={colors.textGhost} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search books..."
            placeholderTextColor={colors.textGhost}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            accessibilityLabel="Search Bible books"
          />
          {search.length > 0 && (
            <Animated.View entering={FadeIn.duration(150)}>
              <Pressable
                onPress={() => setSearch("")}
                accessibilityLabel="Clear search"
                accessibilityRole="button"
              >
                <X size={14} color={colors.textGhost} />
              </Pressable>
            </Animated.View>
          )}
        </View>

        {/* Section indicator */}
        <View style={styles.sectionInfo}>
          <View style={styles.sectionLine} />
          <Text style={styles.sectionText}>{filteredBooks.length} BOOKS</Text>
          <View style={styles.sectionLine} />
        </View>

        {/* Book Grid */}
        <FlatList
          data={filteredBooks}
          renderItem={renderBookCard}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            search.trim().length > 0 ? (
              <View style={styles.emptySearch}>
                <Text style={styles.emptySearchText}>No books match "{search}"</Text>
              </View>
            ) : null
          }
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
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerCenter: {
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
    paddingHorizontal: 20,
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
    padding: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minHeight: 80,
  },
  bookCardHovered: {
    backgroundColor: "rgba(138, 43, 226, 0.06)",
    borderColor: "rgba(138, 43, 226, 0.20)",
  },
  bookCardPressed: {
    backgroundColor: colors.purpleAccent,
    borderColor: colors.purpleBorder,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 14, fontFamily: fonts.ui },
  searchContainerFocused: {
    borderColor: "rgba(138, 43, 226, 0.35)",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  bookAbbr: {
    color: colors.purpleGlow,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 4,
    opacity: 0.8,
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
  emptySearch: {
    alignItems: "center",
    paddingTop: 40,
  },
  emptySearchText: {
    color: colors.textMuted,
    fontSize: 14,
    fontFamily: fonts.ui,
  },
});
