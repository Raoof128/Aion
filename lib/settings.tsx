import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Feature 12: Dark/Light theme toggle
// Feature 13: Font size control

type ThemeMode = "dark" | "light";
type FontSize = "small" | "medium" | "large";

interface Settings {
  theme: ThemeMode;
  fontSize: FontSize;
  setTheme: (theme: ThemeMode) => void;
  setFontSize: (size: FontSize) => void;
}

const SettingsContext = createContext<Settings>({
  theme: "dark",
  fontSize: "medium",
  setTheme: () => {},
  setFontSize: () => {},
});

export function useSettings() {
  return useContext(SettingsContext);
}

export function fontScale(size: FontSize): number {
  switch (size) {
    case "small":
      return 0.85;
    case "medium":
      return 1;
    case "large":
      return 1.2;
  }
}

// Light theme overrides (dark is default from theme.ts)
export const lightColors = {
  void: "#FFFFFF",
  obsidian: "#F5F5F7",
  onyx: "#EBEBEF",
  slate: "#E0E0E6",
  graphite: "#D5D5DD",
  steel: "#C0C0CC",
  glass: "rgba(0, 0, 0, 0.04)",
  glassBorder: "rgba(0, 0, 0, 0.08)",
  glassHover: "rgba(0, 0, 0, 0.06)",
  glassBright: "rgba(0, 0, 0, 0.10)",
  textPrimary: "#1A1A2E",
  textSecondary: "#4A4A5E",
  textMuted: "#6A6A7E",
  textGhost: "#9A9AAE",
  white: "#1A1A2E",
  purpleMist: "rgba(138, 43, 226, 0.06)",
  purpleBorder: "rgba(138, 43, 226, 0.12)",
  userBubbleBg: "rgba(138, 43, 226, 0.06)",
  userBubbleBorder: "rgba(138, 43, 226, 0.12)",
  errorBg: "rgba(220, 38, 38, 0.08)",
};

const STORAGE_KEY_THEME = "aion_theme";
const STORAGE_KEY_FONT = "aion_font_size";

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("dark");
  const [fontSize, setFontSizeState] = useState<FontSize>("medium");

  useEffect(() => {
    async function load() {
      const [savedTheme, savedFont] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_THEME),
        AsyncStorage.getItem(STORAGE_KEY_FONT),
      ]);
      if (savedTheme === "light" || savedTheme === "dark") setThemeState(savedTheme);
      if (savedFont === "small" || savedFont === "medium" || savedFont === "large")
        setFontSizeState(savedFont);
    }
    load();
  }, []);

  const setTheme = async (t: ThemeMode) => {
    setThemeState(t);
    await AsyncStorage.setItem(STORAGE_KEY_THEME, t);
  };

  const setFontSize = async (s: FontSize) => {
    setFontSizeState(s);
    await AsyncStorage.setItem(STORAGE_KEY_FONT, s);
  };

  return (
    <SettingsContext.Provider value={{ theme, fontSize, setTheme, setFontSize }}>
      {children}
    </SettingsContext.Provider>
  );
}
