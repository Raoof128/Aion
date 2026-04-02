import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSettings, fontScale } from "../lib/settings";
import { colors } from "../lib/theme";

interface SettingsSheetProps {
  onClose: () => void;
}

export function SettingsSheet({ onClose }: SettingsSheetProps) {
  const { theme, fontSize, setTheme, setFontSize } = useSettings();
  const scale = fontScale(fontSize);

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <Text style={styles.title}>Settings</Text>

        {/* Theme Toggle */}
        <Text style={styles.sectionLabel}>APPEARANCE</Text>
        <View style={styles.optionRow}>
          <Pressable
            onPress={() => setTheme("dark")}
            style={[styles.optionButton, theme === "dark" && styles.optionActive]}
          >
            <Text style={styles.optionIcon}>🌙</Text>
            <Text style={[styles.optionText, theme === "dark" && styles.optionTextActive]}>
              Dark
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTheme("light")}
            style={[styles.optionButton, theme === "light" && styles.optionActive]}
          >
            <Text style={styles.optionIcon}>☀️</Text>
            <Text style={[styles.optionText, theme === "light" && styles.optionTextActive]}>
              Light
            </Text>
          </Pressable>
        </View>

        {/* Font Size */}
        <Text style={styles.sectionLabel}>VERSE TEXT SIZE</Text>
        <View style={styles.optionRow}>
          {(["small", "medium", "large"] as const).map((size) => (
            <Pressable
              key={size}
              onPress={() => setFontSize(size)}
              style={[styles.optionButton, fontSize === size && styles.optionActive]}
            >
              <Text style={[styles.fontPreview, { fontSize: 14 * fontScale(size) }]}>Aa</Text>
              <Text style={[styles.optionText, fontSize === size && styles.optionTextActive]}>
                {size.charAt(0).toUpperCase() + size.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Preview */}
        <Text style={styles.sectionLabel}>PREVIEW</Text>
        <View style={styles.previewCard}>
          <Text style={[styles.previewRef]}>GENESIS 1:1</Text>
          <Text style={[styles.previewVerse, { fontSize: 16 * scale }]}>
            "In the beginning God created the heavens and the earth."
          </Text>
        </View>

        <Pressable onPress={onClose} style={styles.doneButton}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
    zIndex: 100,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    backgroundColor: colors.onyx,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderBottomWidth: 0,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.steel,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "300",
    letterSpacing: 1,
    marginBottom: 24,
    textAlign: "center",
  },
  sectionLabel: {
    color: colors.textGhost,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 10,
    marginTop: 8,
  },
  optionRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  optionButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  optionActive: {
    backgroundColor: colors.purpleMist,
    borderColor: colors.purpleBorder,
  },
  optionIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  optionText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "500",
  },
  optionTextActive: {
    color: colors.purpleGlow,
  },
  fontPreview: {
    color: colors.textPrimary,
    marginBottom: 4,
  },
  previewCard: {
    backgroundColor: colors.obsidian,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: 20,
  },
  previewRef: {
    color: colors.purpleGlow,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 8,
  },
  previewVerse: {
    color: colors.textPrimary,
    fontStyle: "italic",
    lineHeight: 26,
  },
  doneButton: {
    backgroundColor: colors.purple,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  doneText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
