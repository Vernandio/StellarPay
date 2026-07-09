import { Dimensions, Platform } from "react-native";

// On wide web/desktop viewports the app is clamped to a phone-sized column so
// cards, lists and grids don't stretch across the screen. Native is untouched.
export const APP_MAX_WIDTH = 448;

/**
 * The effective content width the UI should lay out against. On native this is
 * just the window width; on web it's the window width capped at APP_MAX_WIDTH,
 * so `Dimensions.get('window').width`-based sizing (circles, hero images) stays
 * inside the clamped column instead of overflowing.
 */
export const getContentWidth = (): number => {
  const w = Dimensions.get("window").width;
  return Platform.OS === "web" ? Math.min(w, APP_MAX_WIDTH) : w;
};
