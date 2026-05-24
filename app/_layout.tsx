import "../global.css";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { Onboarding } from "../components/Onboarding";
import { colors } from "../lib/theme";

import { SettingsProvider } from "../lib/settings";
import { StreakProvider } from "../lib/streak";

const queryClient = new QueryClient();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_700Bold,
  });

  useEffect(() => {
    async function initAuth() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          const { error } = await supabase.auth.signInAnonymously();
          if (error) {
            console.error("Auth initialization failed:", error);
            setAuthFailed(true);
          }
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
        setAuthFailed(true);
      } finally {
        setReady(true);
      }
    }
    initAuth();
  }, []);

  useEffect(() => {
    async function checkOnboarding() {
      const done = await AsyncStorage.getItem("onboarding_complete");
      setShowOnboarding(!done);
      setOnboardingChecked(true);
    }
    checkOnboarding();
  }, []);

  if (!ready || !fontsLoaded || !onboardingChecked) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.purple} size="large" />
      </View>
    );
  }

  if (authFailed) {
    return (
      <View style={styles.loading}>
        <Text style={styles.authError}>
          Unable to connect. Please check your connection and restart the app.
        </Text>
      </View>
    );
  }

  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <StreakProvider>
      <SettingsProvider>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={styles.root}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.void },
                animation: "slide_from_right",
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: "none" }} />
              <Stack.Screen
                name="chat/[id]"
                options={{ headerShown: false, animation: "slide_from_bottom" }}
              />
              <Stack.Screen name="reader" options={{ headerShown: false }} />
            </Stack>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </SettingsProvider>
    </StreakProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.void,
  },
  root: {
    flex: 1,
  },
  authError: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
