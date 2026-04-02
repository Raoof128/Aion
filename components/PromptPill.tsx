import { useState } from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { colors } from "../lib/theme";

interface PromptPillProps {
  label: string;
  onPress: (label: string) => void;
}

export function PromptPill({ label, onPress }: PromptPillProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPress={() => onPress(label)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[styles.pill, pressed && styles.pillPressed]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  pillPressed: {
    backgroundColor: colors.bgCard,
    borderColor: colors.accentDim,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
