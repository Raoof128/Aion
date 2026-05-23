import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "aion_book_bg_settings";

export interface BookBgSettings {
  positionX: number;
  positionY: number;
  scale: number;
  overlayOpacity: number;
}

export const DEFAULT_BG_SETTINGS: BookBgSettings = {
  positionX: 0,
  positionY: 0,
  scale: 1,
  overlayOpacity: 0,
};

interface AllBookSettings {
  [bookId: string]: BookBgSettings | undefined;
}

let cachedSettings: AllBookSettings | null = null;

export async function loadBgSettings(bookId: string): Promise<BookBgSettings> {
  try {
    let map: AllBookSettings;
    if (cachedSettings) {
      map = cachedSettings;
    } else {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      map = raw ? JSON.parse(raw) : {};
      cachedSettings = map;
    }
    const saved = map[bookId];
    if (saved) return { ...DEFAULT_BG_SETTINGS, ...saved };
    return { ...DEFAULT_BG_SETTINGS };
  } catch {
    return { ...DEFAULT_BG_SETTINGS };
  }
}

export function getBgSettingsSync(bookId: string): BookBgSettings {
  if (!cachedSettings) return { ...DEFAULT_BG_SETTINGS };
  const saved = cachedSettings[bookId];
  if (saved) return { ...DEFAULT_BG_SETTINGS, ...saved };
  return { ...DEFAULT_BG_SETTINGS };
}

export async function saveBgSettings(bookId: string, settings: BookBgSettings): Promise<void> {
  try {
    let map: AllBookSettings;
    if (cachedSettings) {
      map = cachedSettings;
    } else {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      map = raw ? JSON.parse(raw) : {};
      cachedSettings = map;
    }
    map[bookId] = settings;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error("Failed to save bg settings:", e);
  }
}

export async function resetBgSettings(bookId: string): Promise<void> {
  try {
    if (cachedSettings) {
      delete cachedSettings[bookId];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cachedSettings));
    }
  } catch (e) {
    console.error("Failed to reset bg settings:", e);
  }
}
