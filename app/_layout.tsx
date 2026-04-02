import "../global.css";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { HistoryDrawer } from "../components/HistoryDrawer";

const queryClient = new QueryClient();

export default function RootLayout() {
  const [ready, setReady] = useState(false);

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

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator color="white" size="large" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Drawer
          drawerContent={(props) => <HistoryDrawer {...props} />}
          screenOptions={{
            headerShown: false,
            drawerStyle: { backgroundColor: "#0a0a0a", width: 300 },
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
