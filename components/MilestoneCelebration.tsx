// components/MilestoneCelebration.tsx
import { View, Text, StyleSheet, Modal, Pressable, AccessibilityInfo } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useEffect, useState } from "react";
import { colors, fonts } from "../lib/theme";

const MESSAGES: Record<number, string> = {
  7: "One week of daily scripture. Your commitment is taking root.",
  30: "A full month. The Word is becoming part of your rhythm.",
  100: "One hundred days. A testimony written in faithfulness.",
};

interface Props {
  milestone: 7 | 30 | 100;
  onDismiss: () => void;
}

export function MilestoneCelebration({ milestone, onDismiss }: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const pulse = useSharedValue(1);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (!reduceMotion) {
      pulse.value = withRepeat(
        withSequence(withTiming(1.15, { duration: 600 }), withTiming(1, { duration: 600 })),
        3,
        false,
      );
    }
  }, [pulse, reduceMotion]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    shadowOpacity: reduceMotion ? 0.5 : pulse.value * 0.8,
  }));

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onDismiss}>
      <Animated.View
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        style={styles.overlay}
      >
        <Animated.View style={[styles.card, glowStyle]}>
          <View style={styles.glowRing} />
          <Text style={styles.fire}>🔥</Text>
          <Text style={styles.number}>{milestone}</Text>
          <Text style={styles.days}>DAYS</Text>
          <Text style={styles.message}>{MESSAGES[milestone]}</Text>
          <Pressable
            style={styles.button}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Continue"
          >
            <Text style={styles.buttonText}>Continue</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.onyx,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.amberBorder,
    alignItems: "center",
    padding: 36,
    shadowColor: colors.amberGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 32,
    shadowOpacity: 0.5,
  },
  glowRing: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(217, 119, 6, 0.05)",
    top: "50%",
    left: "50%",
    marginTop: -100,
    marginLeft: -100,
  },
  fire: { fontSize: 48, marginBottom: 8 },
  number: { color: colors.amberGlow, fontSize: 72, fontFamily: fonts.verse, lineHeight: 76 },
  days: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.uiBold,
    letterSpacing: 4,
    marginBottom: 20,
  },
  message: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: fonts.verseItalic,
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  button: {
    paddingHorizontal: 36,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: "rgba(217, 119, 6, 0.15)",
    borderWidth: 1,
    borderColor: colors.amberBorder,
  },
  buttonText: { color: colors.amberGlow, fontSize: 14, fontFamily: fonts.uiBold },
});
