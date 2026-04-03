import { Tabs } from "expo-router";
import { View, Text, StyleSheet, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { Sparkles, BookOpen, MessageCircle, Menu } from "lucide-react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { colors } from "../../lib/theme";

function TabIcon({ Icon, label, focused }: { Icon: React.ElementType; label: string; focused: boolean }) {
  return (
    <View style={styles.tabItem}>
      <Icon size={22} color={focused ? colors.purpleGlow : colors.textGhost} />
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
      {focused && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.tabDot} />
      )}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.purpleGlow,
        tabBarInactiveTintColor: colors.textGhost,
      }}
      screenListeners={{
        tabPress: () => {
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarAccessibilityLabel: "Home tab",
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={Sparkles} label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="read"
        options={{
          tabBarAccessibilityLabel: "Read tab",
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={BookOpen} label="Read" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarAccessibilityLabel: "Chat tab",
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={MessageCircle} label="Chat" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          tabBarAccessibilityLabel: "More tab",
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={Menu} label="More" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.void,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    height: 60,
    paddingBottom: 4,
    paddingTop: 6,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    minHeight: 48,
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    color: colors.textGhost,
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: colors.purpleGlow,
  },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.purple,
    marginTop: 2,
  },
});
