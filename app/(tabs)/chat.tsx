import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Sparkles } from "lucide-react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { colors, fonts } from "../../lib/theme";

export default function ChatTab() {
  const router = useRouter();

  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  const handleNewChat = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const uniqueId = `new-${Date.now()}`;
    router.push({
      pathname: `/chat/${uniqueId}`,
      params: { initialMessage: "" },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.purpleDot} />
          <Text style={styles.headerTitle}>CHAT</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Sparkles size={40} color={colors.purpleDim} />
        <Text style={styles.title}>Ask Aion anything</Text>
        <Text style={styles.subtitle}>Get AI-powered insights grounded{"\n"}in Scripture</Text>

        <Animated.View style={btnStyle}>
          <Pressable
            onPress={handleNewChat}
            onPressIn={() => {
              btnScale.value = withSpring(0.95);
            }}
            onPressOut={() => {
              btnScale.value = withSpring(1);
            }}
            style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.startButton,
              hovered && styles.startButtonHovered,
            ]}
            accessibilityLabel="Start new conversation"
            accessibilityRole="button"
          >
            <Text style={styles.startButtonText}>Start a conversation</Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.obsidian },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  purpleDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.purple },
  headerTitle: {
    fontSize: 13,
    letterSpacing: 2,
    color: colors.textSecondary,
    fontFamily: fonts.uiBold,
  },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  icon: { marginBottom: 20 },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "300",
    letterSpacing: 1,
    marginBottom: 8,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  startButton: {
    backgroundColor: colors.purple,
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 14,
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  startButtonHovered: { shadowOpacity: 0.6, shadowRadius: 16 },
  startButtonText: {
    color: colors.white,
    fontSize: 15,
    fontFamily: fonts.uiMedium,
    letterSpacing: 0.5,
  },
});
