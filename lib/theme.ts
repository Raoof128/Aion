import { StyleSheet } from "react-native";

// Aion Design System — Dark luxury with warm amber accents
export const colors = {
  bg: "#050505",
  bgElevated: "#0f0f0f",
  bgCard: "#141414",
  bgInput: "#1a1a1a",
  border: "#262626",
  borderSubtle: "#1c1c1c",
  text: "#f0ece4",
  textSecondary: "#8a8578",
  textMuted: "#524e45",
  accent: "#d4a340",
  accentDim: "#a37c2c",
  accentBright: "#f0c040",
  userBubble: "#2c2418",
  userBubbleBorder: "#3d3220",
  error: "#7a2020",
  errorText: "#e08080",
} as const;

export const fonts = {
  regular: { fontFamily: "System" },
  bold: { fontFamily: "System", fontWeight: "700" as const },
  light: { fontFamily: "System", fontWeight: "300" as const },
} as const;

export const shared = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
