// components/StreakBadge.tsx
import { Pressable, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";
import { colors, fonts } from "../lib/theme";

interface Props {
  count: number;
  onPress: () => void;
}

export function StreakBadge({ count, onPress }: Props) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (count > 0) {
      scale.value = withSequence(
        withTiming(1.25, { duration: 200, easing: Easing.out(Easing.back(2)) }),
        withTiming(1, { duration: 200, easing: Easing.in(Easing.quad) }),
      );
    }
  }, [count, scale]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${count}-day streak. Tap for details.`}
    >
      <Animated.View style={[styles.badge, animStyle]}>
        <Text style={styles.fire}>🔥</Text>
        <Text style={styles.count}>{count}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "rgba(217, 119, 6, 0.12)",
    borderWidth: 1,
    borderColor: colors.amberBorder,
    shadowColor: colors.amberGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  fire: { fontSize: 14 },
  count: {
    color: colors.amberGlow,
    fontSize: 13,
    fontFamily: fonts.uiBold,
    fontWeight: "700",
  },
});
