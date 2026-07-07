---
name: stellarpay-design
description: Design system and animation guidelines for the StellarPay React Native app using Reanimated and NativeWind.
---

# StellarPay Design & Animation Guidelines

Always follow these rules when writing or modifying UI components or screens. 

## Visual Identity (Clean Light Mode with Contrast Header)
- **Base Canvas**: The screen background should use `Colors.baseLight`.
- **Top Contrast Gradient**: Use a `LinearGradient` at the top of the screen (typically `height: 380`) transitioning from `["#000000", "#111111", Colors.baseLight]` with `locations={[0, 0.6, 1]}`. This creates a striking dark header area that fades cleanly into the light background.
- **Top Header Content**: Any text or icons placed over the dark top gradient must use `Colors.white` for maximum contrast.
- **Surfaces (Cards & Bento Grid)**: All primary content cards must use `Colors.surfaceLight` as their background color.
- **Corner Radii**: Main featured cards should have a `borderRadius: 24`. Secondary elements (like Bento grid actions or list containers) should have a `borderRadius: 16`.
- **Dividers**: Use `Colors.borderLight` for subtle borders and list separators.

## Typography
- Display/Headlines: System font, `fontWeight: '700'`.
- Over dark header: `Colors.white`.
- Over light surfaces: `Colors.textLightPrimary`.
- Subtitles/Descriptions: `Colors.textLightSecondary`.
- Ensure tight letter spacing for large headers (e.g., `-1.2` for display text).

## Elevation & Depth (Shadows)
Do not use `BlurView` for light mode components. Rely entirely on soft drop shadows to define depth against the `Colors.baseLight` canvas.
- **Heavy Elevation (Main Cards)**: `shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.05, shadowRadius: 24, elevation: 8`
- **Light Elevation (Bento Grid / Action Buttons)**: `shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2`

## Layout (Bento Grid)
- **Grid Spacing**: Use standard spacing metrics (`Spacing.md`, `Spacing.lg`, etc.).
- Utilize Flexbox heavily to create masonry-style or Bento box arrangements for quick actions. 
- Elements should be padded generously (`Spacing.lg` horizontally for full-screen content, `Spacing.xl` internally for main cards).

## Animations & Haptics
- **Entry Animations**: Use `FadeInDown` from `react-native-reanimated` with duration around `300ms` and staggered delays (e.g., `0`, `100`, `200`, `300`) to cascade UI elements onto the screen.
- **Haptics**: Always include `Haptics.selectionAsync()` or `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` for important user actions (e.g., changing currency, opening modals, pressing action buttons).
