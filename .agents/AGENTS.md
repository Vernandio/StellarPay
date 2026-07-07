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

## Stellar React Native (Hermes Engine) Pitfalls & Rules
- **Never use `server.submitTransaction(tx)`**: The Stellar JS SDK's default submit method relies on prototype base64 encoding of `Uint8Array`, which is corrupted under React Native's Hermes engine. Instead, always wrap raw transaction bytes using `Buffer.from(tx.toEnvelope().toXDR()).toString("base64")` and send it via raw `fetch` as `tx=${encodeURIComponent(xdrBase64)}` with `Content-Type: application/x-www-form-urlencoded`.
- **Do not pass raw `URLSearchParams` to `fetch`**: React Native's fetch does not support native `URLSearchParams` objects, causing empty request payloads (resulting in `400 Bad Request` from endpoints like SEP-24). In our code, we explicitly patch `global.fetch` in `index.js` to intercept and stringify `URLSearchParams` strictly by constructor name (`options.body.constructor.name === 'URLSearchParams'`).
- **Preserve FormData in the fetch interceptor**: Never use broad duck-typing checks (e.g. checking for `.append` and `.toString`) in the `fetch` override because it will match `FormData` (multipart uploads), corrupting image uploads and form submissions into `"[object FormData]"` strings.
- **Dynamic Localhost Resolution**: When referencing backend endpoints on mobile, always import `API_BASE` from `src/services/api/client.ts` rather than hardcoding `localhost`. `client.ts` automatically extracts the host computer's IP via Expo Constants (`hostUri`), allowing test devices and emulators to successfully communicate with the local server.
- **Scanner Viewfinder Locks**: When building QR camera views inside Tab navigators, the tab stays mounted when navigating away. Always register a React Navigation `focus` listener to reset scanned state refs (e.g. `scannedRef.current = false`) when the scanner screen gains focus, preventing the viewfinder from getting locked.
