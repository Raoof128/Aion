import { Tabs } from "expo-router";
import { View, Text, StyleSheet, Platform } from "react-native";
import * as Haptics from "expo-haptics";

const colors = {
  void: "#000000",
  obsidian: "#0A0A0C",
  purple: "#8A2BE2",
  purpleGlow: "#A855F7",
  textGhost: "#56566A",
  glassBorder: "rgba(255, 255, 255, 0.06)",
};

function TabIcon({
  icon,
  label,
  focused,
}: {
  icon: string;
  label: string;
  focused: boolean;
}) {
  return (
    <View style={styles.tabItem}>
      <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>
        {icon}
      </Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
        {label}
      </Text>
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
            <TabIcon icon="✦" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="read"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="📖" label="Read" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="💬" label="Chat" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="☰" label="More" focused={focused} />
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
    height: 70,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  tabIcon: {
    fontSize: 20,
    color: colors.textGhost,
  },
  tabIconActive: {
    color: colors.purpleGlow,
  },
  tabLabel: {
    fontSize: 10,
    color: colors.textGhost,
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: colors.purpleGlow,
  },
});
