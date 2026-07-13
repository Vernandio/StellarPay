import { Dimensions, Platform, ViewStyle } from "react-native";

// Width of the left sidebar nav shown in place of the mobile bottom tab bar on web.
export const WEB_SIDEBAR_WIDTH = 240;

// Below this window width, web falls back to the same mobile bottom tab bar
// as native — a resized/narrow browser window (or an actual phone browser)
// isn't "desktop" just because it's running on web.
export const WEB_DESKTOP_BREAKPOINT = 900;

// Max width of the centered reading column inside each tab screen's content
// area (the space to the right of the sidebar) on web, so text/cards don't
// stretch edge-to-edge on wide screens. The sidebar and page background still
// fill the full browser width — only this inner column is capped.
export const WEB_TAB_CONTENT_MAX_WIDTH = 700;

// Several screens size elements (paging carousels, pulse rings) assuming a
// phone-width viewport, independent of how wide the browser window itself is.
export const MOBILE_REFERENCE_WIDTH = 448;

// Max width for form content (inputs, PIN boxes, CTAs) on web. The screen's
// backgrounds (hero images, gradients, white sheets) bleed the full browser
// width for a smooth, seamless page; only the interactive column is clamped.
export const WEB_FORM_MAX_WIDTH = 560;

// Web-only style for that form column: append to a ScrollView/View's style
// array. Resolves to null on native so layouts there are untouched.
export const webFormColumn: ViewStyle | null =
  Platform.OS === "web"
    ? { width: "100%", maxWidth: WEB_FORM_MAX_WIDTH, alignSelf: "center" }
    : null;

/**
 * The actual visible width available to page content. The web app fills the
 * whole browser window (no phone/device clamp), so this is just the window
 * width on every platform.
 */
export const getContentWidth = (): number => Dimensions.get("window").width;
