import { useState, useEffect, useMemo, ReactNode } from "react";
import { View, Image, StyleSheet, ImageSourcePropType, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../lib/theme";
import { loadBgSettings, BookBgSettings, DEFAULT_BG_SETTINGS } from "../lib/bookBackgroundSettings";

interface BookBackgroundProps {
  bookId: string;
  imageSource: ImageSourcePropType;
  children: ReactNode;
}

export function BookBackground({ bookId, imageSource, children }: BookBackgroundProps) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [settings, setSettings] = useState<BookBgSettings>(DEFAULT_BG_SETTINGS);

  const photoBox = useMemo(() => {
    try {
      const resolved = Image.resolveAssetSource(imageSource);
      if (resolved && resolved.width > 0 && resolved.height > 0) {
        const fit = screenH / resolved.height;
        return {
          width: resolved.width * fit,
          height: resolved.height * fit,
        };
      }
    } catch {}
    return { width: screenW, height: screenH };
  }, [imageSource, screenW, screenH]);

  useEffect(() => {
    loadBgSettings(bookId).then(setSettings);
  }, [bookId]);

  return (
    <View style={styles.container}>
      <View style={[styles.photoCenter]}>
        <View style={[styles.photoBox, { width: photoBox.width, height: photoBox.height }]}>
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                transform: [
                  { translateX: settings.positionX },
                  { translateY: settings.positionY },
                  { scale: settings.scale },
                ],
              },
            ]}
          >
            <Image source={imageSource} style={styles.image} resizeMode="cover" />
          </View>
        </View>
      </View>
      {settings.overlayOpacity > 0 && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.void, opacity: settings.overlayOpacity },
          ]}
          pointerEvents="none"
        />
      )}
      <LinearGradient
        colors={["rgba(10, 10, 12, 0.45)", "rgba(10, 10, 12, 0.95)"]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.void,
  },
  photoCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  photoBox: {
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
