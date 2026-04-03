import { StyleSheet, Platform } from "react-native";

// ═══════════════════════════════════════════════════════
// OBSIDIAN & ETHER — Aion Design System 2026
// Dark-first, glassmorphic, futuristic data terminal
// ═══════════════════════════════════════════════════════

export const colors = {
  // Obsidian — the void
  void: "#000000",
  obsidian: "#0A0A0C",
  onyx: "#111114",
  slate: "#17171B",
  graphite: "#1E1E24",
  steel: "#3E3E4A",

  // Ether — the glow
  purple: "#8A2BE2",
  purpleDim: "#6B21A8",
  purpleGlow: "#A855F7",
  purpleMist: "rgba(138, 43, 226, 0.08)",
  purpleBorder: "rgba(138, 43, 226, 0.15)",
  purpleAccent: "rgba(138, 43, 226, 0.25)",

  // Glass surfaces
  glass: "rgba(255, 255, 255, 0.06)",
  glassBorder: "rgba(255, 255, 255, 0.10)",
  glassHover: "rgba(255, 255, 255, 0.10)",
  glassBright: "rgba(255, 255, 255, 0.14)",

  // Text
  white: "#FFFFFF",
  textPrimary: "#F0F0F5",
  textSecondary: "#9494A8",
  textMuted: "#7A7A8E",
  textGhost: "#56566A",

  // Focus ring (web)
  focus: "rgba(138, 43, 226, 0.5)",

  // Semantic
  error: "#DC2626",
  errorBg: "rgba(220, 38, 38, 0.12)",
  success: "#22C55E",

  // Additional semantic colors
  warning: "#F59E0B",
  warningBg: "rgba(245, 158, 11, 0.12)",
  info: "#3B82F6",
  infoBg: "rgba(59, 130, 246, 0.12)",

  // Disabled states
  disabled: "rgba(255, 255, 255, 0.04)",
  disabledText: "#4A4A58",

  // Selection
  selection: "rgba(138, 43, 226, 0.20)",
} as const;

// Font families — loaded in _layout.tsx
export const fonts = {
  // UI / Headers — clean, modern, techy
  ui: Platform.select({
    web: "Inter, -apple-system, sans-serif",
    default: "Inter_400Regular",
  }),
  uiMedium: Platform.select({
    web: "Inter, -apple-system, sans-serif",
    default: "Inter_500Medium",
  }),
  uiBold: Platform.select({
    web: "Inter, -apple-system, sans-serif",
    default: "Inter_700Bold",
  }),
  // Verse text — ancient, authoritative serif
  verse: Platform.select({
    web: "'Playfair Display', Georgia, serif",
    default: "PlayfairDisplay_400Regular",
  }),
  verseItalic: Platform.select({
    web: "'Playfair Display', Georgia, serif",
    default: "PlayfairDisplay_400Regular_Italic",
  }),
} as const;

export const typeScale = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 15,
  lg: 16,
  xl: 18,
  "2xl": 22,
  "3xl": 28,
  "4xl": 36,
  "5xl": 44,
} as const;

export const lineHeights = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.625,
  loose: 1.75,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
} as const;

export const shared = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: colors.obsidian,
  },
});
