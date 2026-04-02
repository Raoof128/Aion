import "../global.css";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold } from "@expo-google-fonts/inter";
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import { supabase } from "../lib/supabase";
import { HistoryDrawer } from "../components/HistoryDrawer";
import { colors } from "../lib/theme";

const queryClient = new QueryClient();

export default function RootLayout() {
  const [ready, setReady] = useState(false);

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
          await supabase.auth.signInAnonymously();
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
      } finally {
        setReady(true);
      }
    }
    initAuth();
  }, []);

  if (!ready || !fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.purple} size="large" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={styles.root}>
        <Drawer
          drawerContent={(props) => <HistoryDrawer {...props} />}
          screenOptions={{
            headerShown: false,
            drawerStyle: { backgroundColor: colors.void, width: 300 },
          }}
        >
          <Drawer.Screen name="index" options={{ title: "Aion" }} />
          <Drawer.Screen
            name="chat/[id]"
            options={{ title: "Chat", drawerItemStyle: { display: "none" } }}
          />
        </Drawer>
      </GestureHandlerRootView>
    </QueryClientProvider>
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
});
