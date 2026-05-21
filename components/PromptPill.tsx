import { Pressable, Text, Platform, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { ChevronRight } from "lucide-react-native";
import { colors, fonts } from "../lib/theme";

interface PromptPillProps {
  Icon: React.ElementType;
  label: string;
  onPress: (label: string) => void;
  index?: number;
}

export function PromptPill({ Icon, label, onPress, index }: PromptPillProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress(label);
  };

  return (
    <Animated.View
      entering={FadeInUp.delay((index ?? 0) * 80)
        .duration(300)
        .springify()}
      style={animStyle}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={() => {
          scale.value = withSpring(0.97);
        }}
        onPressOut={() => {
          scale.value = withSpring(1);
        }}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.pill,
          hovered && styles.pillHovered,
          pressed && styles.pillPressed,
        ]}
        accessibilityLabel={label}
        accessibilityRole="button"
      >
        {({ hovered }: { pressed: boolean; hovered?: boolean }) => (
          <>
            <Icon size={16} color={colors.purpleGlow} />
            <Text style={[styles.label, hovered && styles.labelHovered]}>{label}</Text>
            <ChevronRight size={16} color={hovered ? colors.purpleGlow : colors.textGhost} />
          </>
        )}
      </Pressable>
    </Animated.View>
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
  pillHovered: {
    backgroundColor: "rgba(138, 43, 226, 0.06)",
    borderColor: "rgba(138, 43, 226, 0.20)",
  },
  pillPressed: {
    backgroundColor: colors.glassHover,
    borderColor: colors.purpleBorder,
  },
  label: {
    marginLeft: 12,
    flex: 1,
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: fonts.ui,
  },
  labelHovered: {
    color: colors.textPrimary,
  },
});
