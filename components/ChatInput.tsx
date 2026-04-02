import { useState } from "react";
import { View, TextInput, Pressable, Text, Platform, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { colors, fonts } from "../lib/theme";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onSend(trimmed);
    setText("");
  };

  const canSend = text.trim().length > 0 && !disabled;

  const sendScale = useSharedValue(1);
  const sendAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          placeholder="Ask Aion anything..."
          placeholderTextColor={colors.textGhost}
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleSend}
          multiline
          editable={!disabled}
          accessibilityLabel="Message input"
        />
        <Animated.View style={[styles.sendButton, canSend ? styles.sendActive : styles.sendInactive, sendAnimStyle]}>
          <Pressable
            onPress={handleSend}
            onPressIn={() => { sendScale.value = withSpring(0.85); }}
            onPressOut={() => { sendScale.value = withSpring(1); }}
            disabled={!canSend}
            style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}
            accessibilityLabel="Send message"
            accessibilityRole="button"
          >
            <Text style={[styles.sendIcon, canSend && styles.sendIconActive]}>↑</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
    backgroundColor: colors.obsidian,
  },
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 24,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: fonts.ui,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 100,
  },
  sendButton: {
    borderRadius: 18,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  sendActive: {
    backgroundColor: colors.purple,
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  sendInactive: {
    backgroundColor: colors.steel,
  },
  sendIcon: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textGhost,
  },
  sendIconActive: {
    color: colors.white,
  },
});
