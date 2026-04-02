import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Feature 15: Daily verse notification
// Uses web Notification API on web, placeholder for native (expo-notifications)

const NOTIFICATION_KEY = "aion_daily_verse_enabled";

export async function isDailyVerseEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(NOTIFICATION_KEY);
  return val === "true";
}

export async function setDailyVerseEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATION_KEY, enabled ? "true" : "false");

  if (enabled && Platform.OS === "web") {
    // Request web notification permission
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }
}

// Sample daily verses for the notification
const DAILY_VERSES = [
  { ref: "Psalm 46:10", text: "Be still, and know that I am God." },
  { ref: "Proverbs 3:5", text: "Trust in the LORD with all your heart and lean not on your own understanding." },
  { ref: "Isaiah 41:10", text: "So do not fear, for I am with you; do not be dismayed, for I am your God." },
  { ref: "Philippians 4:13", text: "I can do all things through Christ who strengthens me." },
  { ref: "Jeremiah 29:11", text: "For I know the plans I have for you, declares the LORD, plans to prosper you." },
  { ref: "Romans 8:28", text: "And we know that in all things God works for the good of those who love him." },
  { ref: "Psalm 23:1", text: "The LORD is my shepherd; I shall not want." },
];

export function getDailyVerse(): { ref: string; text: string } {
  // Use day of year as index for consistent daily rotation
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
}

export function sendDailyVerseNotification(): void {
  if (Platform.OS !== "web") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const verse = getDailyVerse();
  new Notification(`Aion — ${verse.ref}`, {
    body: verse.text,
    icon: "/assets/icon.png",
    tag: "daily-verse",
  });
}
