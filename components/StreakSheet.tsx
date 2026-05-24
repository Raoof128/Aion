// components/StreakSheet.tsx
import { View, Text, StyleSheet, Modal, Pressable } from "react-native";
import { colors, fonts } from "../lib/theme";
import type { StreakState } from "../lib/types";
import type { WeekDay } from "../lib/streak-helpers";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MILESTONES = [7, 30, 100];

interface Props {
  visible: boolean;
  onClose: () => void;
  streak: StreakState;
  weekDays: WeekDay[];
}

export function StreakSheet({ visible, onClose, streak, weekDays }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close streak details"
      />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Your Streak</Text>

        {/* 7-day calendar row */}
        <View style={styles.calendarRow}>
          {weekDays.map((day, i) => (
            <View key={day.date} style={styles.dayCol}>
              <Text style={styles.dayLabel}>{DAYS[i]}</Text>
              <View style={[styles.dayDot, dotStyle(day.status)]} />
            </View>
          ))}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <LegendItem color={colors.amberGlow} label="Active" />
          <LegendItem color="#60A5FA" label="Frozen" />
          <LegendItem color={colors.graphite} label="Missed" />
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatBlock label="Current" value={streak.current_streak} />
          <View style={styles.statDivider} />
          <StatBlock label="Best" value={streak.longest_streak} />
        </View>

        {/* Milestone badges */}
        <Text style={styles.milestonesLabel}>Milestones</Text>
        <View style={styles.milestonesRow}>
          {MILESTONES.map((m) => {
            const earned = streak.longest_streak >= m;
            return (
              <View key={m} style={[styles.badge, earned && styles.badgeEarned]}>
                <Text style={[styles.badgeNum, earned && styles.badgeNumEarned]}>{m}</Text>
                <Text style={[styles.badgeDay, earned && styles.badgeDayEarned]}>days</Text>
              </View>
            );
          })}
        </View>

        <Pressable style={styles.closeBtn} onPress={onClose} accessibilityRole="button">
          <Text style={styles.closeBtnText}>Close</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function dotStyle(status: WeekDay["status"]): object {
  switch (status) {
    case "active":
      return {
        backgroundColor: colors.amberGlow,
        shadowColor: colors.amberGlow,
        shadowOpacity: 0.6,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 0 },
      };
    case "frozen":
      return { backgroundColor: "#60A5FA" };
    case "today":
      return { backgroundColor: "transparent", borderWidth: 2, borderColor: colors.amberGlow };
    case "future":
      return { backgroundColor: colors.graphite, opacity: 0.3 };
    default: // missed
      return { backgroundColor: colors.graphite };
  }
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    backgroundColor: colors.onyx,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: colors.amberBorder,
  },
  handle: {
    width: 36,
    height: 3,
    backgroundColor: colors.steel,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontFamily: fonts.verse,
    textAlign: "center",
    marginBottom: 24,
  },
  calendarRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  dayCol: { alignItems: "center", gap: 6 },
  dayLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: fonts.uiMedium,
    letterSpacing: 0.5,
  },
  dayDot: { width: 28, height: 28, borderRadius: 14 },
  legend: { flexDirection: "row", justifyContent: "center", gap: 16, marginBottom: 24 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { color: colors.textMuted, fontSize: 11, fontFamily: fonts.uiMedium },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
  },
  statBlock: { alignItems: "center", paddingHorizontal: 32 },
  statValue: { color: colors.amberGlow, fontSize: 36, fontFamily: fonts.verse },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.uiMedium,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  statDivider: { width: 1, height: 40, backgroundColor: colors.glass },
  milestonesLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: fonts.uiBold,
    letterSpacing: 2,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 12,
  },
  milestonesRow: { flexDirection: "row", justifyContent: "center", gap: 16, marginBottom: 28 },
  badge: {
    alignItems: "center",
    width: 60,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.graphite,
    borderWidth: 1,
    borderColor: colors.steel,
    opacity: 0.4,
  },
  badgeEarned: {
    backgroundColor: "rgba(217, 119, 6, 0.12)",
    borderColor: colors.amberBorder,
    opacity: 1,
    shadowColor: colors.amberGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  badgeNum: { color: colors.textGhost, fontSize: 20, fontFamily: fonts.verse },
  badgeNumEarned: { color: colors.amberGlow },
  badgeDay: {
    color: colors.textGhost,
    fontSize: 9,
    fontFamily: fonts.uiMedium,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  badgeDayEarned: { color: colors.amberGlow },
  closeBtn: {
    alignSelf: "center",
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  closeBtnText: { color: colors.textSecondary, fontSize: 13, fontFamily: fonts.uiMedium },
});
