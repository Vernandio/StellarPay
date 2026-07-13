import { Stack } from "expo-router";

// Auth screens render full-bleed on every platform: their hero backgrounds
// (globe images, dark gradients) and white bottom sheets span the whole
// browser width for a smooth, seamless page. Only the form content inside
// each screen is clamped on web (see `webFormColumn` in src/constants/layout.ts).
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
      <Stack.Screen name="google-onboarding" />
      <Stack.Screen name="verify-phone" />
      <Stack.Screen name="pin-entry" />
    </Stack>
  );
}
