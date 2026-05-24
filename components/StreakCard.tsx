// components/StreakCard.tsx
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { colors, fonts } from "../lib/theme";
import type { StreakState } from "../lib/types";

interface Props {
  streak: StreakState;
}

export function StreakCard({ streak }: Props) {
  const studiedToday =
    streak.last_active_date !== null && streak.last_active_date === streak.week_start
      ? false
      : streak.last_active_date !== null;
  const freezeAvailable = streak.freeze_uses_this_week < 1;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(750)} style={styles.card}>
      <View style={styles.topAccent} />
      <View style={styles.row}>
        <View style={styles.numeralBlock}>
          <Text style={styles.numeral}>{streak.current_streak}</Text>
          <Text style={styles.numeralLabel}>day streak</Text>
        </View>
        <View style={styles.rightBlock}>
          <Text style={styles.longest}>Best: {streak.longest_streak} days</Text>
          <View style={[styles.freezePill, !freezeAvailable && styles.freezePillUsed]}>
            <Text style={styles.freezeText}>
              {freezeAvailable ? "❄️  1 freeze available" : "❄️  Freeze used"}
            </Text>
          </View>
        </View>
      </View>
      <Text style={[styles.status, studiedToday && styles.statusDone]}>
        {studiedToday ? "Opened today ✓" : "Open daily to keep your streak"}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "rgba(17, 17, 20, 0.85)",
    borderWidth: 1,
    borderColor: colors.amberBorder,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: colors.amber,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
  },
  topAccent: { height: 2, backgroundColor: colors.amberGlow, opacity: 0.6 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  numeralBlock: { alignItems: "flex-start" },
  numeral: {
    color: colors.amberGlow,
    fontSize: 48,
    fontFamily: fonts.verse,
    lineHeight: 52,
  },
  numeralLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.uiMedium,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  rightBlock: { alignItems: "flex-end", gap: 8 },
  longest: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.uiMedium },
  freezePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(59, 130, 246, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.20)",
  },
  freezePillUsed: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  freezeText: { color: colors.textSecondary, fontSize: 11, fontFamily: fonts.uiMedium },
  status: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.uiMedium,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  statusDone: { color: colors.success },
});
