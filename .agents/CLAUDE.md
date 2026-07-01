# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

StellarPay is an Expo (React Native 0.81 / React 19) mobile wallet for gasless P2P and cross-border payments on the **Stellar testnet**. Firebase handles auth + a Firestore cache; the Stellar SDK handles on-chain operations. Built for a hackathon, so the network is hardcoded to testnet.

## Commands

```bash
npm start          # expo start (Metro dev server, then choose platform)
npm run ios        # expo start --ios
npm run android    # expo start --android
npm run web        # expo start --web
npx tsc --noEmit   # typecheck (strict mode is on)
```

There is no test runner, linter, or build script configured. Install Expo-managed packages with `npx expo install`; use `npm install` only for pure-JS packages.

## Runtime setup (the fragile parts)

Several files exist purely to make the Stellar SDK + Firebase work under Hermes/Metro. Do not "clean up" these without understanding why they exist — the reasons are documented inline:

- **[index.js](index.js)** is the entry point (set via `package.json` `main`). It uses `require()` **not** `import` on purpose: imports get hoisted above the crypto/Buffer/EventTarget polyfills, which must run before `expo-router/entry`. Order matters.
- **[src/services/firebase/config.ts](src/services/firebase/config.ts)** imports from `@firebase/*` internal packages directly, **not** the `firebase` wrapper. The wrapper resolves to the browser build and never registers React Native auth. Use the Firebase JS SDK, never `@react-native-firebase` (breaks Expo Go).
- **[metro.config.js](metro.config.js)** enables `.cjs`, disables package-exports resolution, and force-resolves `bignumber.js` to its CJS build. NativeWind is wired in here.
- **[src/services/stellar/wallet.ts](src/services/stellar/wallet.ts)**: `Keypair.random()`/`createKeypair()` crash in RN — keypairs are generated from `expo-crypto` random bytes via `Keypair.fromRawEd25519Seed`.
- Firebase config comes from `EXPO_PUBLIC_FIREBASE_*` env vars (a `.env` file, gitignored). Without these, auth/Firestore silently fail.

## Architecture

**Routing** — `expo-router` file-based routing under [app/](app/) with typed routes enabled:

- `app/index.tsx` — landing screen, routes to auth or tabs based on `useAuth()`.
- `app/(auth)/` — login, signup.
- `app/(tabs)/` — the 4 main tabs: `index` (Wallet), `pay`, `activity`, `profile`.
- `app/modals/` — `send-confirm`, `receive`, `qr-scan` (declared with modal presentation in [app/\_layout.tsx](app/_layout.tsx)).

**Two-layer data model.** Firebase is the source of truth for identity/profile; Stellar Horizon is the source of truth for on-chain balances and history. Firestore also holds a _cache_ of balances/transactions (`WalletData`, `TransactionCache` in [firestore.ts](src/services/firebase/firestore.ts)) for fast reads — but balances are always re-fetched from Horizon for accuracy (see `useWallet.refreshBalances`).

**Layering (respect this direction):**

- `src/services/` — pure async functions, no React. `firebase/` (auth, firestore, config) and `stellar/` (client, payments, wallet, assets, soroban).
- `src/hooks/` — React bindings that orchestrate services + stores: `useAuth` (subscribes to Firebase auth → authStore), `useWallet` (Horizon balances → walletStore), `useStellar` (wallet creation + send flows, exposes `isProcessing`/`error`).
- `src/store/` — Zustand stores (`authStore`, `walletStore`). Plain state holders; hooks do the work.
- Components consume hooks, never call services directly.

**Stellar specifics** ([src/constants/stellar.ts](src/constants/stellar.ts)): `ACTIVE_NETWORK` is testnet; USDC uses the testnet Circle issuer; new accounts are funded via Friendbot. USDC requires a trustline (`setupUSDCTrustline`) before receiving. Payment paths: `sendPayment` (P2P), `sendPathPayment` (cross-border, DEX auto-routing), `findPaymentPaths`. The Horizon server is a singleton in [client.ts](src/services/stellar/client.ts). `soroban.ts` is scaffolding only — not used in the MVP.

## Design system (enforced — see [.agents/AGENTS.md](.agents/AGENTS.md) and [.agents/skills/stellarpay-design/SKILL.md](.agents/skills/stellarpay-design/SKILL.md))

- **Colors**: only from [src/constants/colors.ts](src/constants/colors.ts) (`Colors.*`) or the matching NativeWind tokens in [tailwind.config.js](tailwind.config.js). Never hardcode hex values. Dark theme, base `#0F0E23`, brand purple `#7B61FF`.
- **Spacing/Radius/Typography**: only from [src/constants/](src/constants/) (`Spacing`, `Radius`, `Typography`). 8px grid; no arbitrary pixel values.
- **Lists**: use `@shopify/flash-list`, never `FlatList`.
- **Animations**: `react-native-reanimated` (its Babel plugin must stay last in [babel.config.js](babel.config.js)). Framer Motion does not work in RN.
- **Screens**: wrap in `SafeAreaView` with explicit `edges={['top','bottom']}`.
- **Haptics** (`expo-haptics`) on every button press and payment outcome.
- **Amounts**: format via `formatAmount` (`Intl.NumberFormat`). **Never render a raw Stellar public key** — always `truncateAddress` (first 4 + `...` + last 4). Both in [src/utils/format.ts](src/utils/format.ts).
- Styling is mixed: NativeWind classes and `StyleSheet.create` both appear; match the surrounding file.
