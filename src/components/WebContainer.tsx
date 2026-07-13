import React from "react";
import { View, Platform, StyleSheet } from "react-native";
import { Colors } from "../constants/colors";

/**
 * Web-only responsive wrapper. On web it centers a screen's content in a
 * comfortable, capped-width column (so pages read like a website instead of a
 * stretched-full-width or phone-narrow app), filling the surrounding margins
 * with the screen's own background color so the column looks seamless. On
 * iOS/Android it's a transparent pass-through — no extra view in the native tree.
 *
 * Used as a navigator `screenLayout` so every routed screen gets the same
 * treatment without editing each screen file. Pass `background` to match the
 * wrapped screen's root background (defaults to the light theme most screens use).
 */
export function WebContainer({
  children,
  maxWidth = 880,
  background = Colors.baseLight,
}: {
  children: React.ReactNode;
  maxWidth?: number;
  background?: string;
}) {
  if (Platform.OS !== "web") return <>{children}</>;

  return (
    <View style={[styles.outer, { backgroundColor: background }]}>
      <View style={[styles.inner, { maxWidth }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: "center",
  },
  inner: {
    flex: 1,
    width: "100%",
    overflow: "hidden",
  },
});
