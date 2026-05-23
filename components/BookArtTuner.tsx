import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  PanResponder,
  Image,
  ImageSourcePropType,
} from "react-native";
import Slider from "@react-native-community/slider";
import { colors, fonts } from "../lib/theme";
import {
  BookBgSettings,
  DEFAULT_BG_SETTINGS,
  loadBgSettings,
  getBgSettingsSync,
  saveBgSettings,
  resetBgSettings,
} from "../lib/bookBackgroundSettings";

interface BookArtTunerProps {
  bookId: string;
  bookName: string;
  imageSource: ImageSourcePropType;
  onClose: () => void;
}

const PREVIEW_SIZE = { width: 280, height: 180 };
const PREVIEW_BASE_SCALE = 1.3;

export function BookArtTuner({ bookId, bookName, imageSource, onClose }: BookArtTunerProps) {
  const [settings, setSettings] = useState<BookBgSettings>(() => getBgSettingsSync(bookId));
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const dragStart = useRef({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStart.current = {
          x: settingsRef.current.positionX,
          y: settingsRef.current.positionY,
        };
      },
      onPanResponderMove: (_, gesture) => {
        setSettings((prev) => ({
          ...prev,
          positionX: Math.round(dragStart.current.x + gesture.dx),
          positionY: Math.round(dragStart.current.y + gesture.dy),
        }));
      },
      onPanResponderRelease: (_, gesture) => {
        const newX = Math.round(dragStart.current.x + gesture.dx);
        const newY = Math.round(dragStart.current.y + gesture.dy);
        setSettings((prev) => {
          const updated = { ...prev, positionX: newX, positionY: newY };
          saveBgSettings(bookId, updated);
          return updated;
        });
      },
    }),
  ).current;

  useEffect(() => {
    loadBgSettings(bookId).then((s) => setSettings(s));
  }, [bookId]);

  const updateSetting = <K extends keyof BookBgSettings>(key: K, value: BookBgSettings[K]) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: value };
      saveBgSettings(bookId, updated);
      return updated;
    });
  };

  const handleReset = async () => {
    setSettings({ ...DEFAULT_BG_SETTINGS });
    await resetBgSettings(bookId);
  };

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Book Art Tuner</Text>
        <Text style={styles.subtitle}>{bookName}</Text>

        <View style={styles.previewContainer}>
          <View style={styles.previewCrop} {...panResponder.panHandlers}>
            <View
              style={[
                styles.previewImageWrap,
                {
                  transform: [
                    { translateX: settings.positionX },
                    { translateY: settings.positionY },
                    { scale: settings.scale * PREVIEW_BASE_SCALE },
                  ],
                },
              ]}
            >
              <Image source={imageSource} style={styles.previewImage} resizeMode="cover" />
            </View>
          </View>
          <Text style={styles.dragHint}>Drag to position image</Text>
        </View>

        <View style={styles.sliderGroup}>
          <Text style={styles.sliderLabel}>Scale: {settings.scale.toFixed(2)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0.8}
            maximumValue={1.8}
            value={settings.scale}
            onValueChange={(v) => updateSetting("scale", v)}
            minimumTrackTintColor={colors.purpleGlow}
            maximumTrackTintColor={colors.steel}
            thumbTintColor={colors.purple}
            step={0.01}
          />
        </View>

        <View style={styles.sliderGroup}>
          <Text style={styles.sliderLabel}>
            Dark Overlay: {(settings.overlayOpacity * 100).toFixed(0)}%
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={0.8}
            value={settings.overlayOpacity}
            onValueChange={(v) => updateSetting("overlayOpacity", v)}
            minimumTrackTintColor={colors.purpleGlow}
            maximumTrackTintColor={colors.steel}
            thumbTintColor={colors.purple}
            step={0.01}
          />
        </View>

        <View style={styles.buttonRow}>
          <Pressable onPress={handleReset} style={styles.resetButton}>
            <Text style={styles.resetText}>Reset to Default</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.saveButton}>
            <Text style={styles.saveText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
    zIndex: 200,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    backgroundColor: colors.onyx,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === "web" ? 24 : 40,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderBottomWidth: 0,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.steel,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    color: colors.purpleGlow,
    fontSize: 18,
    fontFamily: fonts.uiBold,
    textAlign: "center",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: fonts.ui,
    textAlign: "center",
    marginBottom: 16,
    marginTop: 4,
  },
  previewContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  previewCrop: {
    width: PREVIEW_SIZE.width,
    height: PREVIEW_SIZE.height,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.void,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  previewImageWrap: {
    width: "100%",
    height: "100%",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  dragHint: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.ui,
    marginTop: 6,
  },
  sliderGroup: {
    marginBottom: 16,
  },
  sliderLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: fonts.uiMedium,
    marginBottom: 4,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: "center",
  },
  resetText: {
    color: colors.textMuted,
    fontSize: 15,
    fontFamily: fonts.uiMedium,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.purple,
    alignItems: "center",
  },
  saveText: {
    color: colors.white,
    fontSize: 15,
    fontFamily: fonts.uiMedium,
  },
});
