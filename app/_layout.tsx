

import { useEffect } from "react";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useNotificationListener } from "../src/hooks/useNotificationListener";
import { AppFrame } from "../src/components/AppFrame";
import "../global.css";

export default function RootLayout() {
  // Listen to Firestore notifications and display local OS alerts
  useNotificationListener();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <AppFrame>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0F0E23" } }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="modals/send-confirm"
              options={{ presentation: "modal", animation: "slide_from_bottom" }}
            />
            <Stack.Screen
              name="modals/receive"
              options={{ presentation: "modal", animation: "slide_from_bottom" }}
            />
            <Stack.Screen
              name="modals/share-link"
              options={{ 
                presentation: "transparentModal", 
                animation: "fade",
                contentStyle: { backgroundColor: "transparent" }
              }}
            />
            <Stack.Screen
              name="modals/qr-scan"
              options={{ presentation: "fullScreenModal", animation: "fade" }}
            />
            <Stack.Screen name="add-money" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="withdraw" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="send" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="qr-pay" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="request" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="pay-friends" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="request-friends" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="pay-tap" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="pay-onchain" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="swap" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="split-bill" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="notifications" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="security" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="personal-information" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="notification-settings" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="linked-accounts" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="support" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="about" options={{ animation: "slide_from_right" }} />
          </Stack>
          </AppFrame>
        </SafeAreaProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
