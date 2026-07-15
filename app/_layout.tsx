

import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useFonts } from "expo-font";
import { Feather, FontAwesome5, AntDesign } from "@expo/vector-icons";
import * as SplashScreen from "expo-splash-screen";
import { useNotificationListener } from "../src/hooks/useNotificationListener";
import { WebContainer } from "../src/components/WebContainer";
import { Colors } from "../src/constants/colors";
import { Toast } from "../src/components/Toast";
import { useAuth } from "../src/hooks/useAuth";
import "../global.css";

const isWeb = Platform.OS === "web";

// Routes that manage their own full-width web layout and must NOT be clamped
// into a centered content column: the tab group (has its own sidebar shell),
// the auth group (renders full-bleed heroes), and full-bleed / overlay modals.
const WEB_FULL_WIDTH_ROUTES = new Set([
  "(tabs)",
  "(auth)",
  "modals/qr-scan",
  "modals/share-link",
]);

// Screens whose root background differs from the default light theme — the
// clamped column's margins must match it exactly so the page reads as one
// smooth, continuous background (no letterbox seams).
const WEB_ROUTE_BACKGROUNDS: Record<string, string> = {
  "modals/send-confirm": Colors.base,
  "modals/receive": Colors.base,
  "transfer-success": "#F8F9FA",
};

// On web, center each stand-alone screen (send, request, pay-friends, settings,
// …) in a comfortable reading column instead of stretching it edge-to-edge.
const webStackScreenLayout = isWeb
  ? ({ route, children }: { route: { name: string }; children: React.ReactNode }) =>
      WEB_FULL_WIDTH_ROUTES.has(route.name) ? (
        <>{children}</>
      ) : (
        <WebContainer background={WEB_ROUTE_BACKGROUNDS[route.name]}>{children}</WebContainer>
      )
  : undefined;

// Keep the splash screen up until the icon fonts finish loading — otherwise
// (especially on web, where the font files load async over the network) icon
// glyphs briefly render as missing-glyph "tofu" boxes before swapping in.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...Feather.font,
    ...FontAwesome5.font,
    ...AntDesign.font,
  });

  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Listen to Firestore notifications and display local OS alerts
  useNotificationListener();

  useEffect(() => {
    if (!loaded || isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const isIndex = (segments.length as number) === 0;

    if (!isAuthenticated && !inAuthGroup && !isIndex) {
      router.replace("/(auth)/landing");
    }
  }, [isAuthenticated, isLoading, segments, loaded]);

  useEffect(() => {
    if (error) {
      console.error("Failed to load fonts:", error);
    }
  }, [error]);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <Stack
            screenLayout={webStackScreenLayout}
            screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0F0E23" } }}
          >
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
          <Toast />
        </SafeAreaProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
