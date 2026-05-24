import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInRight, FadeOutLeft } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Sparkles, Search, BookOpen } from "lucide-react-native";
import { colors, fonts } from "../lib/theme";

const SLIDES = [
  {
    Icon: Sparkles,
    title: "Welcome to Aion",
    subtitle: "Your AI-powered Bible companion.\nAsk anything about Scripture.",
  },
  {
    Icon: Search,
    title: "Hybrid Search",
    subtitle: "Searches by meaning AND exact keywords.\nFinds the exact verse, every time.",
  },
  {
    Icon: BookOpen,
    title: "Grounded in Scripture",
    subtitle: "Every response is backed by real Bible verses.\nNo hallucinations. No guessing.",
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);

  const handleNext = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < SLIDES.length - 1) {
      setStep(step + 1);
    } else {
      await AsyncStorage.setItem("onboarding_complete", "true");
      onComplete();
    }
  };

  const slide = SLIDES[step];

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        key={step}
        entering={FadeInRight.duration(300)}
        exiting={FadeOutLeft.duration(200)}
        style={styles.slide}
      >
        <View style={styles.icon}>
          <slide.Icon size={48} color={colors.purpleGlow} />
        </View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.dots} accessibilityRole="list">
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === step && styles.dotActive]}
              accessibilityLabel={`Step ${i + 1} of ${SLIDES.length}${i === step ? ", current" : ""}`}
            />
          ))}
        </View>

        <Pressable
          onPress={handleNext}
          style={styles.button}
          accessibilityRole="button"
          accessibilityLabel={step < SLIDES.length - 1 ? "Next" : "Get Started"}
        >
          <Text style={styles.buttonText}>{step < SLIDES.length - 1 ? "Next" : "Get Started"}</Text>
        </Pressable>

        {step < SLIDES.length - 1 && (
          <Pressable
            onPress={async () => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              await AsyncStorage.setItem("onboarding_complete", "true");
              onComplete();
            }}
            style={styles.skipButton}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.void,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  slide: { alignItems: "center", maxWidth: 320 },
  icon: { marginBottom: 24 },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "200",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 24, textAlign: "center" },
  footer: { position: "absolute", bottom: 60, alignItems: "center", width: "100%" },
  dots: { flexDirection: "row", marginBottom: 24, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.glassBorder },
  dotActive: {
    backgroundColor: colors.purple,
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  button: {
    backgroundColor: colors.purple,
    borderRadius: 16,
    paddingHorizontal: 40,
    paddingVertical: 14,
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.uiBold,
    fontWeight: "600",
    letterSpacing: 1,
  },
  skipButton: { marginTop: 16 },
  skipText: { color: colors.textGhost, fontSize: 13, fontFamily: fonts.ui },
});
