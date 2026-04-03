import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { colors } from "../../lib/theme";

export default function ChatTab() {
  const router = useRouter();

  useEffect(() => {
    const uniqueId = `new-${Date.now()}`;
    router.push({
      pathname: `/chat/${uniqueId}`,
      params: { initialMessage: "" },
    });
  }, []);

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.obsidian,
  },
});
