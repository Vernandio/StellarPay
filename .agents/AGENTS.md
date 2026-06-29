# StellarPay Developer Rules

## UI & UX Principles
- **No placeholders**: Every image or icon must be generated or utilize exact Feather vector icons from `@expo/vector-icons`.
- **Format standards**: Always format currency amounts via `Intl.NumberFormat` with correct decimals.
- **Stellar Address display**: Never display raw public keys. Always truncate using `first 4 + ... + last 4`.
- **List performance**: Never use standard `FlatList`. Use `@shopify/flash-list` for zero-jank lists.
- **Safe Zones**: Always wrap full screens in `SafeAreaView` with explicit top/bottom edges.
- **Animations**: Never use Framer Motion. Use `react-native-reanimated` v3 for all animations. It runs on the UI thread via Worklets.
- **Firebase**: Use the Firebase JS SDK (`firebase` package), never `@react-native-firebase`. The latter breaks Expo Go.
- **Package installation**: Use `npx expo install` for Expo-managed packages, `npm install` for pure JS packages.
- **Secrets**: Never commit `.env` files. Verify `.gitignore` covers all env patterns before first commit.

## Accessibility
- Minimum touch targets for buttons/interactive elements: `44px x 44px`.
- Contrast ratios for text should meet WCAG AA standards.
- Interactive elements must have clear focus states.

## Code Quality
- Preserve all existing comments and docstrings unrelated to your code changes.
- All colors must come from `src/constants/colors.ts`, never hardcoded.
- All spacing must come from `src/constants/spacing.ts`, never arbitrary pixel values.
