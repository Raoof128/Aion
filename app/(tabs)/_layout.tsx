import { Tabs } from "expo-router";
import { View, Text, StyleSheet, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { Sparkles, BookOpen, MessageCircle, Menu } from "lucide-react-native";
import { colors } from "../../lib/theme";

function TabIcon({ Icon, label, focused }: { Icon: React.ElementType; label: string; focused: boolean }) {
  return (
    <View style={styles.tabItem}>
      <Icon size={22} color={focused ? colors.purpleGlow : colors.textGhost} />
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
      {focused && <View style={styles.tabDot} />}
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
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={Sparkles} label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="read"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={BookOpen} label="Read" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={MessageCircle} label="Chat" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
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
