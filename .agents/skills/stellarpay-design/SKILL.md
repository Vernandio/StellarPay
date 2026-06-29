---
name: stellarpay-design
description: Design system and animation guidelines for the StellarPay React Native app using Reanimated and NativeWind.
---

# StellarPay Design & Animation Guidelines

Always follow these rules when writing or modifying UI components or screens.

## Visual Identity
- **Base Canvas**: Deep dark navy/charcoal (`#0F0E23`), never pitch black.
- **Brand Accent**: Electric purple (`#7B61FF`), used selectively for highlights and main CTAs.
- **Status Colors**:
  - Success/Confirm: Teal (`#1DB98A`)
  - Warnings: Amber (`#F0A500`)
  - Errors: Red (`#E24B4A`)
- **Surfaces**: `#1A1930` (card), `#2A2940` (secondary), `#3D3B5C` (elevated).
- **Text**: Primary `#F0EFF8`, Secondary `#B8B6D4`, Muted `#8E8CAE`.
- **Cards**: background `#1A1930`, border `0.5px solid rgba(255,255,255,0.06)`, `borderRadius: 16`.

## Typography
- Display/Headlines: System font, fontWeight `800`, letterSpacing -0.5 to -1.
- Body: fontWeight `400`, lineHeight 1.6.
- Labels/Caps: fontWeight `600`, letterSpacing 1.2, textTransform uppercase, fontSize 11.
- Monospace (amounts, addresses): `Menlo` (iOS) / `monospace` (Android).
- Amount displays: Always massive. fontWeight `300` for the integer, `600` for decimals/currency.

## Spacing System (8px base grid)
- xs=4, sm=8, md=16, lg=24, xl=32, xxl=48, xxxl=64.
- Never use arbitrary pixel values.

## Border Radius
- sm=8, md=12, lg=16, xl=24, full=9999.
- Cards: lg (16). Buttons: full (9999). Inputs: md (12). Modals: xl (24) top corners only.

## Shadows (Dark Mode — Colored Glow)
- Card glow: `shadowColor: '#7B61FF'`, offset `{0,4}`, opacity 0.15, radius 16.
- Button glow (active): `shadowColor: '#7B61FF'`, offset `{0,8}`, opacity 0.4, radius 24.

## Component Rules
- Every primary button: linear gradient `#7B61FF` → `#5B41DF`, borderRadius 9999, height 56, full width.
- Every input: background `#13122A`, border `1px solid rgba(255,255,255,0.08)`, borderRadius 12, height 56.
- Focus state: border color `#7B61FF`, shadow glow purple.
- Every screen: background `#0F0E23`, SafeAreaView with edges `['top','bottom']`.
- Loading states: skeleton shimmer (animated gradient), never spinner alone.
- Empty states: centered icon (48px, teal), headline, subtext, CTA button.
- Success states: full-screen animated checkmark (scale + fade), auto-dismiss after 1.5s.

## Animation Rules (React Native Reanimated v3)

**Framer Motion does NOT work in React Native.** Use `react-native-reanimated` for all animations.

- Screen transitions: fade + slide up 12px, duration 280ms, easing `Easing.out(Easing.cubic)`.
- Button press: scale 0.97, duration 80ms.
- Card press: scale 0.98, duration 100ms.
- Numbers changing (balance updates): count-up animation, duration 600ms.
- Tab bar icons: scale 1.0 → 1.15 on select, duration 200ms.
- Modal appear: translateY 100% → 0, spring stiffness 300, damping 30.

## Haptic Feedback (expo-haptics)
- Every button press: `Haptics.impactAsync(ImpactFeedbackStyle.Light)`.
- Payment confirm: `Haptics.notificationAsync(NotificationFeedbackType.Success)`.
- Error: `Haptics.notificationAsync(NotificationFeedbackType.Error)`.

## Icon System
- Use `@expo/vector-icons` (Feather set) as default.
- Size: 20 (nav), 24 (cards), 28 (hero actions).
- Color: `#8E8CAE` (inactive), `#FFFFFF` (active), `#7B61FF` (accent).

## Premium Standards
1. Zero layout jank — every list uses FlashList, not FlatList.
2. Zero raw hardcoded colors — every color comes from the token system.
3. Every touchable has a haptic response.
4. Every async action has a loading state.
5. Every error has a user-facing message (no "Something went wrong").
6. Amounts always format with `Intl.NumberFormat`.
7. Stellar public keys always truncate: first 4 chars + `...` + last 4 chars.
8. Never show a raw Stellar address to the user in normal flows.
