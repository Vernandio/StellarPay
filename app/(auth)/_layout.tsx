import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      initialRouteName="landing"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0F0E23" },
        animation: "fade",
      }}
    >
      <Stack.Screen name="landing" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="verify-phone" />
      <Stack.Screen name="pin-entry" />
    </Stack>
  );
}
