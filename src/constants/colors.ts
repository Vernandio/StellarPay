export const Colors = {
  // Backgrounds
  base: "#0F0E23",
  surface: "#1A1930",
  surface2: "#2A2940",
  surface3: "#3D3B5C",

  // Borders
  border: "rgba(255,255,255,0.06)",
  borderStrong: "rgba(255,255,255,0.12)",
  borderFocus: "#7B61FF",

  // Brand
  primary: "#7B61FF",
  primaryDark: "#5B41DF",
  primaryGlow: "rgba(123, 97, 255, 0.3)",

  // Semantic
  teal: "#1DB98A",
  tealGlow: "rgba(29, 185, 138, 0.3)",
  amber: "#F0A500",
  danger: "#E24B4A",
  dangerGlow: "rgba(226, 75, 74, 0.3)",

  // Text
  textPrimary: "#F0EFF8",
  textSecondary: "#B8B6D4",
  textMuted: "#8E8CAE",
  textDisabled: "rgba(255,255,255,0.2)",

  // Light Theme
  baseLight: "#F5F6FA",
  surfaceLight: "#FFFFFF",
  textLightPrimary: "#111111",
  textLightSecondary: "#6B7280",
  textLightMuted: "#9CA3AF",
  borderLight: "rgba(0,0,0,0.06)",
  borderLightStrong: "rgba(0,0,0,0.12)",

  // Always
  white: "#FFFFFF",
  transparent: "transparent",
} as const;

export type ColorKey = keyof typeof Colors;
