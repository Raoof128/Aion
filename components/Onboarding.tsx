import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { FadeInRight, FadeOutLeft } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";


const SLIDES = [
  {
    icon: "✦",
    title: "Welcome to Aion",
    subtitle: "Your AI-powered Bible companion.\nAsk anything about Scripture.",
  },
  {
    icon: "🔍",
    title: "Hybrid Search",
    subtitle: "Searches by meaning AND exact keywords.\nFinds the exact verse, every time.",
  },
  {
    icon: "📖",
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
    if (step < SLIDES.length - 1) {
      setStep(step + 1);
    } else {
      await AsyncStorage.setItem("onboarding_complete", "true");
      onComplete();
    }
  };

  const slide = SLIDES[step];

  return (
    <View style={styles.container}>
      <Animated.View key={step} entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)} style={styles.slide}>
        <Text style={styles.icon}>{slide.icon}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>

        <Pressable onPress={handleNext} style={styles.button}>
          <Text style={styles.buttonText}>
            {step < SLIDES.length - 1 ? "Next" : "Get Started"}
          </Text>
        </Pressable>

        {step < SLIDES.length - 1 && (
          <Pressable onPress={async () => { await AsyncStorage.setItem("onboarding_complete", "true"); onComplete(); }} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000", justifyContent: "center", alignItems: "center", padding: 32 },
  slide: { alignItems: "center", maxWidth: 320 },
  icon: { fontSize: 48, marginBottom: 24 },
  title: { color: "#F0F0F5", fontSize: 28, fontWeight: "200", letterSpacing: 2, textAlign: "center", marginBottom: 16 },
  subtitle: { color: "#7A7A8E", fontSize: 15, lineHeight: 24, textAlign: "center" },
  footer: { position: "absolute", bottom: 60, alignItems: "center", width: "100%" },
  dots: { flexDirection: "row", marginBottom: 24, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.15)" },
  dotActive: { backgroundColor: "#8A2BE2", shadowColor: "#8A2BE2", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6 },
  button: { backgroundColor: "#8A2BE2", borderRadius: 16, paddingHorizontal: 40, paddingVertical: 14, shadowColor: "#8A2BE2", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600", letterSpacing: 1 },
  skipButton: { marginTop: 16 },
  skipText: { color: "#56566A", fontSize: 13 },
});
