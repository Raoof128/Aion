import { useState, useEffect, ReactNode } from "react";
import { View, Image, StyleSheet, ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../lib/theme";
import { loadBgSettings, BookBgSettings, DEFAULT_BG_SETTINGS } from "../lib/bookBackgroundSettings";

interface BookBackgroundProps {
  bookId: string;
  imageSource: ImageSourcePropType;
  children: ReactNode;
}

export function BookBackground({ bookId, imageSource, children }: BookBackgroundProps) {
  const [settings, setSettings] = useState<BookBgSettings>(DEFAULT_BG_SETTINGS);

  useEffect(() => {
    loadBgSettings(bookId).then(setSettings);
  }, [bookId]);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.imageContainer,
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
    backgroundColor: colors.obsidian,
  },
  imageContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    flex: 1,
    width: "100%",
  },
});
