import { Platform } from "react-native";

export const Typography = {
  displayLarge: {
    fontSize: 40,
    fontWeight: "800" as const,
    letterSpacing: -1,
    lineHeight: 48,
  },
  displayMedium: {
    fontSize: 32,
    fontWeight: "800" as const,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  headingLarge: {
    fontSize: 24,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
    lineHeight: 32,
  },
  headingMedium: {
    fontSize: 18,
    fontWeight: "600" as const,
    letterSpacing: -0.2,
    lineHeight: 26,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 26,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: "400" as const,
    lineHeight: 18,
  },
  labelLarge: {
    fontSize: 13,
    fontWeight: "600" as const,
    letterSpacing: 0.5,
  },
  labelSmall: {
    fontSize: 11,
    fontWeight: "600" as const,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
  },
  amount: {
    fontSize: 48,
    fontWeight: "300" as const,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    letterSpacing: -1,
  },
  mono: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
  },
};
