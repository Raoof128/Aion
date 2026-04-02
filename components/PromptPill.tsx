import { useState } from "react";
import { Pressable, Text, Platform, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { colors, fonts } from "../lib/theme";

interface PromptPillProps {
  icon: string;
  label: string;
  onPress: (label: string) => void;
}

export function PromptPill({ icon, label, onPress }: PromptPillProps) {
  const [pressed, setPressed] = useState(false);

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress(label);
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[styles.pill, pressed && styles.pillPressed]}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  pillPressed: {
    backgroundColor: colors.glassHover,
    borderColor: colors.purpleBorder,
  },
  icon: {
    fontSize: 16,
    marginRight: 12,
  },
  label: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: fonts.ui,
  },
  arrow: {
    color: colors.textGhost,
    fontSize: 20,
    marginLeft: 8,
  },
});
