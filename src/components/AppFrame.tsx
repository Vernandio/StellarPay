import React from "react";
import { View, Platform } from "react-native";
import { APP_MAX_WIDTH } from "../constants/layout";

/**
 * Clamps the whole app to a phone-sized, centered column on web/desktop so the
 * mobile-first UI doesn't stretch across wide browser windows. On iOS/Android
 * it's a transparent pass-through (no extra view in the native tree).
 */
export function AppFrame({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== "web") return <>{children}</>;

  return (
    <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center" }}>
      <View
        style={{
          flex: 1,
          width: "100%",
          maxWidth: APP_MAX_WIDTH,
          backgroundColor: "#0F0E23",
          // Subtle "device" edge so the clamped column reads as intentional.
          // @ts-ignore — web-only CSS box-shadow via RNW style bridge
          boxShadow: "0 0 40px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        {children}
      </View>
    </View>
  );
}
