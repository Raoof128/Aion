import { Stack } from "expo-router";
import { colors } from "../../lib/theme";

export default function ReaderLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.void },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[bookId]/index" />
      <Stack.Screen name="[bookId]/[chapter]" />
    </Stack>
  );
}
