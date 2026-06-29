# StellarPay — Initial Project Setup Prompt
# For: Antigravity / Claude Code Agent
# Copy this entire file as your first message.

---

You are setting up **StellarPay**, a mobile payment app built on the Stellar blockchain for the APAC Stellar Hackathon. The design philosophy: **invisible Web3, premium banking UX**. Think Wise meets Revolut meets Apple Pay — no crypto jargon, no wallet addresses, just clean money-moving UI with world-class polish.

Complete every step below in order. Do not skip any section. After finishing all steps, confirm what was installed, what files were created, and flag any issues.

---

## 0. ADD THIS SKILL TO YOUR SKILLS SYSTEM

Before writing a single line of app code, add the following design system as a skill named `stellarpay-design`. Reference it every time you create or modify any screen, component, or style.

```
SKILL: stellarpay-design

IDENTITY
--------
StellarPay is a premium mobile payment app. The visual language is:
- Dark-first: deep navy/charcoal base (#0F0E23), not black
- One electric accent: Stellar purple (#7B61FF) — used sparingly, never decoratively
- Secondary success teal (#1DB98A) for confirmations and positive states
- Danger red (#E24B4A) for errors and destructive actions only
- Amber (#F0A500) for warnings and pending states
- All other UI: near-whites (#F0EFF8), soft grays (#2A2940, #3D3B5C), muted text (#8E8CAE)

TYPOGRAPHY
----------
- Display/Headlines: Use system font with fontWeight "800", letterSpacing -0.5 to -1
- Body: fontWeight "400", lineHeight 1.6
- Labels/Caps: fontWeight "600", letterSpacing 1.2, textTransform uppercase, fontSize 11
- Monospace (amounts, addresses): Platform.OS === 'ios' ? 'Menlo' : 'monospace'
- Amount displays: Always massive. fontWeight "300" for the integer, "600" for decimals/currency

SPACING SYSTEM
--------------
Use an 8px base grid. Never use arbitrary numbers.
xs=4, sm=8, md=16, lg=24, xl=32, xxl=48, xxxl=64

BORDER RADIUS
-------------
sm=8, md=12, lg=16, xl=24, full=9999
Cards use lg (16). Buttons use full (9999). Input fields use md (12). Modals use xl (24) top corners only.

SHADOWS
-------
Dark mode shadows use colored glow, not black drop shadows:
- Card glow: shadowColor: '#7B61FF', shadowOffset: {width:0, height:4}, shadowOpacity: 0.15, shadowRadius: 16
- Button glow (active): shadowColor: '#7B61FF', shadowOffset: {width:0, height:8}, shadowOpacity: 0.4, shadowRadius: 24

COMPONENT RULES
---------------
- Every card: background #1A1930, border 0.5px solid rgba(255,255,255,0.06), borderRadius 16
- Every primary button: background linear gradient #7B61FF → #5B41DF, borderRadius 9999, height 56, full width
- Every input: background #13122A, border 1px solid rgba(255,255,255,0.08), borderRadius 12, height 56
- Focus state on inputs: border color #7B61FF, shadow glow purple
- Every screen: background #0F0E23, SafeAreaView with edges ['top','bottom']
- Loading states: use skeleton shimmer (animated gradient), never spinner alone
- Empty states: centered icon (48px, teal), headline, subtext, CTA button
- Success states: full-screen animated checkmark (scale + fade), auto-dismiss after 1.5s

ANIMATION RULES (React Native Animated / Reanimated)
------------------------------------------------------
- Screen transitions: fade + slide up 12px, duration 280ms, easing Easing.out(Easing.cubic)
- Button press: scale 0.97, duration 80ms
- Card press: scale 0.98, duration 100ms
- Numbers changing (balance updates): count-up animation, duration 600ms
- Tab bar icons: scale 1.0 → 1.15 on select, duration 200ms
- Modal appear: translateY 100% → 0, spring stiffness 300, damping 30
- Haptic feedback: on every button press (Haptics.impactAsync(ImpactFeedbackStyle.Light))
  - Payment confirm: Haptics.notificationAsync(NotificationFeedbackType.Success)
  - Error: Haptics.notificationAsync(NotificationFeedbackType.Error)

NOTE ON FRAMER MOTION
---------------------
Framer Motion does not run in React Native. Use react-native-reanimated v3 for all animations.
It is the React Native equivalent — same declarative API philosophy, same performance level,
runs on the UI thread via Worklets. Every animation in this project uses Reanimated.
Install: expo install react-native-reanimated

ICON SYSTEM
-----------
Use @expo/vector-icons (Feather set) as default. Size 20 for nav, 24 for cards, 28 for hero actions.
Color: #8E8CAE (inactive), #FFFFFF (active), #7B61FF (accent).

WHAT "PREMIUM" MEANS IN THIS CODEBASE
--------------------------------------
1. Zero layout jank — every list uses FlashList, not FlatList
2. Zero raw hardcoded colors — every color comes from the token system above
3. Every touchable has a haptic response
4. Every async action has a loading state
5. Every error has a user-facing message (no "Something went wrong")
6. Amounts always format with Intl.NumberFormat
7. Stellar public keys always truncate: first 4 chars + '...' + last 4 chars
8. Never show a raw Stellar address to the user in normal flows
```

---

## 1. SCAFFOLD THE EXPO PROJECT

```bash
npx create-expo-app@latest stellarpay --template blank-typescript
cd stellarpay
```

Then immediately set up the folder structure exactly as follows:

```
stellarpay/
├── app/                          # Expo Router pages
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # Home / Wallet screen
│   │   ├── pay.tsx               # Send / Pay screen
│   │   ├── activity.tsx          # Transaction history
│   │   └── profile.tsx           # Profile / settings
│   ├── modals/
│   │   ├── send-confirm.tsx      # Payment confirmation modal
│   │   ├── receive.tsx           # Receive / show QR
│   │   └── qr-scan.tsx           # QR scanner
│   ├── _layout.tsx               # Root layout
│   └── index.tsx                 # Redirect to auth or tabs
├── src/
│   ├── components/
│   │   ├── ui/                   # Design system primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── AmountDisplay.tsx
│   │   ├── wallet/
│   │   │   ├── BalanceCard.tsx
│   │   │   ├── QuickActions.tsx
│   │   │   └── TransactionItem.tsx
│   │   └── pay/
│   │       ├── RecipientSearch.tsx
│   │       └── AmountInput.tsx
│   ├── constants/
│   │   ├── colors.ts             # Full token system
│   │   ├── spacing.ts
│   │   ├── typography.ts
│   │   └── stellar.ts            # Stellar network config
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useWallet.ts
│   │   └── useStellar.ts
│   ├── services/
│   │   ├── firebase/
│   │   │   ├── config.ts
│   │   │   ├── auth.ts
│   │   │   └── firestore.ts
│   │   └── stellar/
│   │       ├── client.ts         # Horizon + SDK setup
│   │       ├── wallet.ts         # createAccount, loadAccount
│   │       ├── payments.ts       # payment, pathPayment
│   │       └── assets.ts         # trustlines, USDC config
│   ├── store/                    # Zustand state
│   │   ├── authStore.ts
│   │   └── walletStore.ts
│   └── utils/
│       ├── format.ts             # Intl.NumberFormat, truncateAddress
│       └── stellar.ts            # TX builder helpers
├── global.css
├── tailwind.config.js
├── babel.config.js
├── metro.config.js
└── .env                          # Never commit this
```

Create all folders and placeholder files (even if empty with just a comment `// TODO`) so the structure is fully scaffolded before any real code is written.

---

## 2. INSTALL ALL DEPENDENCIES

Run these in order. Do not combine into one command — some have post-install scripts that must complete first.

```bash
# Expo Router (navigation)
npx expo install expo-router expo-constants expo-linking expo-status-bar expo-splash-screen

# Reanimated (animations — the Framer Motion of React Native)
npx expo install react-native-reanimated

# Gesture handler (required by Reanimated + navigation)
npx expo install react-native-gesture-handler

# NativeWind v4 (Tailwind for React Native)
npm install nativewind@^4.0.0
npm install --save-dev tailwindcss@3.3.2

# Safe area
npx expo install react-native-safe-area-context react-native-screens

# Camera + QR Scanner
npx expo install expo-camera expo-barcode-scanner

# Biometrics
npx expo install expo-local-authentication

# Haptics
npx expo install expo-haptics

# Crypto (needed for Stellar keypair generation in RN)
npx expo install expo-crypto

# Secure storage (for encrypted keypair storage)
npx expo install expo-secure-store

# Icons
npx expo install @expo/vector-icons

# Firebase JS SDK (NOT react-native-firebase — that breaks Expo Go)
npm install firebase@^10.0.0

# Stellar SDK
npm install @stellar/stellar-sdk

# Stellar Wallet SDK (higher-level wallet abstractions)
npm install @stellar/typescript-wallet-sdk

# State management
npm install zustand

# FlashList (high-performance lists — never use FlatList)
npm install @shopify/flash-list

# Bottom sheet (for modals / confirm screens)
npm install @gorhom/bottom-sheet

# QR Code generator (for receive screen)
npm install react-native-qrcode-svg react-native-svg

# Date formatting
npm install date-fns

# AsyncStorage (Firebase JS SDK requires this in RN)
npx expo install @react-native-async-storage/async-storage

# Lottie (for success animations)
npx expo install lottie-react-native
```

---

## 3. CONFIGURE TAILWIND + NATIVEWIND

Create `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./global.css",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // StellarPay design tokens — mirrors src/constants/colors.ts
        base: "#0F0E23",
        surface: "#1A1930",
        "surface-2": "#2A2940",
        "surface-3": "#3D3B5C",
        border: "rgba(255,255,255,0.06)",
        "border-strong": "rgba(255,255,255,0.12)",
        primary: "#7B61FF",
        "primary-dark": "#5B41DF",
        teal: "#1DB98A",
        amber: "#F0A500",
        danger: "#E24B4A",
        "text-primary": "#F0EFF8",
        "text-secondary": "#B8B6D4",
        "text-muted": "#8E8CAE",
      },
      fontFamily: {
        mono: ["Menlo", "monospace"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
      },
    },
  },
  plugins: [],
};
```

Create `global.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Update `babel.config.js`:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      "react-native-reanimated/plugin", // MUST be last plugin
    ],
  };
};
```

Update `metro.config.js`:

```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Support .cjs files (required by Firebase JS SDK)
config.resolver.sourceExts.push("cjs");
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: "./global.css" });
```

---

## 4. CONFIGURE EXPO ROUTER

Update `app.json`:

```json
{
  "expo": {
    "name": "StellarPay",
    "slug": "stellarpay",
    "scheme": "stellarpay",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0F0E23"
    },
    "ios": {
      "supportsTablet": false,
      "infoPlist": {
        "NSCameraUsageDescription": "StellarPay uses your camera to scan QR codes for payments.",
        "NSFaceIDUsageDescription": "StellarPay uses Face ID to protect your wallet."
      }
    },
    "android": {
      "permissions": ["CAMERA", "USE_BIOMETRIC", "USE_FINGERPRINT"]
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      [
        "expo-camera",
        { "cameraPermission": "StellarPay uses your camera to scan QR payment codes." }
      ],
      [
        "expo-local-authentication",
        { "faceIDPermission": "StellarPay uses Face ID to protect your wallet." }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

Create `app/_layout.tsx`:

```tsx
import { useEffect } from "react";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import "../global.css";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="#0F0E23" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0F0E23" } }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="modals/send-confirm"
            options={{ presentation: "modal", animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="modals/receive"
            options={{ presentation: "modal", animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="modals/qr-scan"
            options={{ presentation: "fullScreenModal", animation: "fade" }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

---

## 5. DESIGN TOKENS — src/constants/

Create `src/constants/colors.ts`:

```ts
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

  // Always
  white: "#FFFFFF",
  transparent: "transparent",
} as const;

export type ColorKey = keyof typeof Colors;
```

Create `src/constants/spacing.ts`:

```ts
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;
```

Create `src/constants/typography.ts`:

```ts
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
```

---

## 6. FIREBASE SETUP — src/services/firebase/

Create `.env` in the project root (add to `.gitignore` immediately):

```
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Add `.env` to `.gitignore` immediately:

```bash
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

Create `src/services/firebase/config.ts`:

```ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Prevent multiple initializations (important in Expo dev)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth with AsyncStorage persistence (required in React Native)
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
export const functions = getFunctions(app);

export default app;
```

Create `src/services/firebase/auth.ts`:

```ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./config";

export const signUp = async (email: string, password: string, username: string) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  // Create user profile in Firestore
  await setDoc(doc(db, "users", cred.user.uid), {
    uid: cred.user.uid,
    email,
    username: username.toLowerCase(),
    displayName: username,
    createdAt: serverTimestamp(),
    stellarPublicKey: null, // Set after wallet creation in Firebase Function
  });
  return cred.user;
};

export const signIn = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const signOut = () => firebaseSignOut(auth);

export const subscribeToAuth = (cb: (user: User | null) => void) =>
  onAuthStateChanged(auth, cb);
```

Create `src/services/firebase/firestore.ts`:

```ts
import {
  doc, getDoc, setDoc, updateDoc, collection,
  query, where, getDocs, orderBy, limit,
  onSnapshot, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "./config";

// ── Firestore schema types ────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  stellarPublicKey: string | null;
  createdAt: Timestamp;
}

export interface WalletData {
  uid: string;
  stellarPublicKey: string;
  xlmBalance: string;        // cached from Horizon, always re-fetch for accuracy
  usdcBalance: string;       // cached
  lastSyncedAt: Timestamp;
}

export interface TransactionCache {
  id: string;                // Stellar transaction hash
  uid: string;
  type: "send" | "receive" | "swap";
  amount: string;
  asset: "XLM" | "USDC";
  counterpartyUsername: string | null;
  counterpartyAddress: string;
  memo: string | null;
  createdAt: Timestamp;
  stellarTxHash: string;
}

// ── Collections ───────────────────────────────────────────────────────

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
};

export const getUserByUsername = async (username: string): Promise<UserProfile | null> => {
  const q = query(collection(db, "users"), where("username", "==", username.toLowerCase()), limit(1));
  const snap = await getDocs(q);
  return snap.empty ? null : (snap.docs[0].data() as UserProfile);
};

export const getWallet = async (uid: string): Promise<WalletData | null> => {
  const snap = await getDoc(doc(db, "wallets", uid));
  return snap.exists() ? (snap.data() as WalletData) : null;
};

export const updateWalletCache = (uid: string, data: Partial<WalletData>) =>
  updateDoc(doc(db, "wallets", uid), { ...data, lastSyncedAt: serverTimestamp() });

export const subscribeToTransactions = (
  uid: string,
  cb: (txs: TransactionCache[]) => void
) => {
  const q = query(
    collection(db, "transactions"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => d.data() as TransactionCache))
  );
};
```

---

## 7. STELLAR SDK SETUP — src/services/stellar/

Create `src/constants/stellar.ts`:

```ts
// Network configuration
export const STELLAR_NETWORK = {
  TESTNET: {
    networkPassphrase: "Test SDF Network ; September 2015",
    horizonUrl: "https://horizon-testnet.stellar.org",
    friendbotUrl: "https://friendbot.stellar.org",
  },
  MAINNET: {
    networkPassphrase: "Public Global Stellar Network ; September 2015",
    horizonUrl: "https://horizon.stellar.org",
    friendbotUrl: null,
  },
} as const;

// Always use testnet during hackathon
export const ACTIVE_NETWORK = STELLAR_NETWORK.TESTNET;

// USDC on Stellar testnet (Circle issuer)
export const USDC_ASSET = {
  code: "USDC",
  issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
} as const;

// Minimum XLM balance to keep in account (Stellar requires this)
export const MIN_XLM_RESERVE = "2"; // 2 XLM minimum

// Base fee for transactions (in stroops, 100 stroops = 0.00001 XLM)
export const BASE_FEE = "100";

// Default memo prefix for StellarPay transactions
export const APP_MEMO_PREFIX = "SP:";
```

Create `src/services/stellar/client.ts`:

```ts
import { Horizon } from "@stellar/stellar-sdk";
import { ACTIVE_NETWORK } from "../../constants/stellar";

// Singleton Horizon server instance
let _server: Horizon.Server | null = null;

export const getHorizonServer = (): Horizon.Server => {
  if (!_server) {
    _server = new Horizon.Server(ACTIVE_NETWORK.horizonUrl);
  }
  return _server;
};

export const loadAccount = async (publicKey: string) => {
  const server = getHorizonServer();
  return server.loadAccount(publicKey);
};

export const getAccountBalances = async (publicKey: string) => {
  const account = await loadAccount(publicKey);
  return account.balances;
};

export const getXLMBalance = async (publicKey: string): Promise<string> => {
  const balances = await getAccountBalances(publicKey);
  const xlm = balances.find((b) => b.asset_type === "native");
  return xlm?.balance ?? "0";
};

export const getUSDCBalance = async (publicKey: string): Promise<string> => {
  const balances = await getAccountBalances(publicKey);
  const usdc = balances.find(
    (b) =>
      b.asset_type === "credit_alphanum4" &&
      (b as any).asset_code === "USDC"
  );
  return usdc?.balance ?? "0";
};

export const getPaymentHistory = async (publicKey: string, limit = 20) => {
  const server = getHorizonServer();
  return server.payments().forAccount(publicKey).limit(limit).order("desc").call();
};

export const streamPayments = (
  publicKey: string,
  onPayment: (payment: any) => void
) => {
  const server = getHorizonServer();
  return server
    .payments()
    .forAccount(publicKey)
    .cursor("now")
    .stream({ onmessage: onPayment });
};
```

Create `src/services/stellar/wallet.ts`:

```ts
import { Keypair, TransactionBuilder, Operation, Networks, Asset, BASE_FEE } from "@stellar/stellar-sdk";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { getHorizonServer, loadAccount } from "./client";
import { ACTIVE_NETWORK, USDC_ASSET, APP_MEMO_PREFIX } from "../../constants/stellar";

const KEYPAIR_STORE_KEY = (uid: string) => `stellarpay_keypair_${uid}`;

// ──────────────────────────────────────────────────────────────────────
// IMPORTANT: createKeypair() from the SDK crashes in React Native.
// We use expo-crypto to generate the random bytes instead.
// ──────────────────────────────────────────────────────────────────────
export const generateKeypair = async (): Promise<Keypair> => {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  return Keypair.fromRawEd25519Seed(Buffer.from(randomBytes));
};

export const storeKeypairSecurely = async (uid: string, keypair: Keypair) => {
  await SecureStore.setItemAsync(
    KEYPAIR_STORE_KEY(uid),
    keypair.secret(),
    { requireAuthentication: false } // Set true to require biometrics on access
  );
};

export const loadKeypairFromSecureStore = async (uid: string): Promise<Keypair | null> => {
  const secret = await SecureStore.getItemAsync(KEYPAIR_STORE_KEY(uid));
  return secret ? Keypair.fromSecret(secret) : null;
};

export const fundTestnetAccount = async (publicKey: string): Promise<void> => {
  const resp = await fetch(`${ACTIVE_NETWORK.friendbotUrl}?addr=${publicKey}`);
  if (!resp.ok) throw new Error(`Friendbot failed: ${resp.statusText}`);
};

export const createWallet = async (uid: string): Promise<string> => {
  const keypair = await generateKeypair();
  await fundTestnetAccount(keypair.publicKey());
  await storeKeypairSecurely(uid, keypair);
  return keypair.publicKey();
};

export const setupUSDCTrustline = async (uid: string, publicKey: string): Promise<string> => {
  const keypair = await loadKeypairFromSecureStore(uid);
  if (!keypair) throw new Error("Keypair not found in secure store");

  const server = getHorizonServer();
  const account = await loadAccount(publicKey);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: ACTIVE_NETWORK.networkPassphrase,
  })
    .addOperation(
      Operation.changeTrust({
        asset: new Asset(USDC_ASSET.code, USDC_ASSET.issuer),
      })
    )
    .setTimeout(30)
    .build();

  tx.sign(keypair);
  const result = await server.submitTransaction(tx);
  return result.hash;
};
```

Create `src/services/stellar/payments.ts`:

```ts
import {
  TransactionBuilder, Operation, Asset, BASE_FEE, Memo, MemoText,
} from "@stellar/stellar-sdk";
import { getHorizonServer, loadAccount } from "./client";
import { ACTIVE_NETWORK, USDC_ASSET, APP_MEMO_PREFIX } from "../../constants/stellar";
import { loadKeypairFromSecureStore } from "./wallet";

// ── Helpers ───────────────────────────────────────────────────────────

const getAsset = (assetCode: "XLM" | "USDC") =>
  assetCode === "XLM"
    ? Asset.native()
    : new Asset(USDC_ASSET.code, USDC_ASSET.issuer);

// ── Send payment (P2P) ────────────────────────────────────────────────

export const sendPayment = async ({
  senderUid,
  senderPublicKey,
  destinationAddress,
  amount,
  asset = "USDC",
  memo,
}: {
  senderUid: string;
  senderPublicKey: string;
  destinationAddress: string;
  amount: string;
  asset?: "XLM" | "USDC";
  memo?: string;
}): Promise<string> => {
  const keypair = await loadKeypairFromSecureStore(senderUid);
  if (!keypair) throw new Error("Wallet keypair not found");

  const server = getHorizonServer();
  const account = await loadAccount(senderPublicKey);

  const txBuilder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: ACTIVE_NETWORK.networkPassphrase,
  }).addOperation(
    Operation.payment({
      destination: destinationAddress,
      asset: getAsset(asset),
      amount,
    })
  );

  if (memo) {
    txBuilder.addMemo(Memo.text(`${APP_MEMO_PREFIX}${memo}`.substring(0, 28)));
  }

  const tx = txBuilder.setTimeout(30).build();
  tx.sign(keypair);

  const result = await server.submitTransaction(tx);
  return result.hash;
};

// ── Cross-border path payment ─────────────────────────────────────────

export const sendPathPayment = async ({
  senderUid,
  senderPublicKey,
  destinationAddress,
  sendAsset,
  sendAmount,
  destAsset,
  destMin,
}: {
  senderUid: string;
  senderPublicKey: string;
  destinationAddress: string;
  sendAsset: "XLM" | "USDC";
  sendAmount: string;
  destAsset: "XLM" | "USDC";
  destMin: string;
}): Promise<string> => {
  const keypair = await loadKeypairFromSecureStore(senderUid);
  if (!keypair) throw new Error("Wallet keypair not found");

  const server = getHorizonServer();
  const account = await loadAccount(senderPublicKey);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: ACTIVE_NETWORK.networkPassphrase,
  })
    .addOperation(
      Operation.pathPaymentStrictSend({
        sendAsset: getAsset(sendAsset),
        sendAmount,
        destination: destinationAddress,
        destAsset: getAsset(destAsset),
        destMin,
        path: [], // Stellar DEX finds the path automatically
      })
    )
    .setTimeout(30)
    .build();

  tx.sign(keypair);
  const result = await server.submitTransaction(tx);
  return result.hash;
};

// ── Query available paths before sending ─────────────────────────────

export const findPaymentPaths = async (
  sourcePublicKey: string,
  destAddress: string,
  destAsset: "XLM" | "USDC",
  destAmount: string
) => {
  const server = getHorizonServer();
  return server
    .strictReceivePaths(
      sourcePublicKey,
      getAsset(destAsset),
      destAmount
    )
    .call();
};
```

---

## 8. ZUSTAND STATE STORES — src/store/

Create `src/store/authStore.ts`:

```ts
import { create } from "zustand";
import { User } from "firebase/auth";
import { UserProfile } from "../services/firebase/firestore";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ user: null, profile: null, isLoading: false }),
}));
```

Create `src/store/walletStore.ts`:

```ts
import { create } from "zustand";
import { TransactionCache } from "../services/firebase/firestore";

interface WalletState {
  publicKey: string | null;
  xlmBalance: string;
  usdcBalance: string;
  transactions: TransactionCache[];
  isLoadingBalance: boolean;
  isLoadingTx: boolean;
  setPublicKey: (key: string | null) => void;
  setBalances: (xlm: string, usdc: string) => void;
  setTransactions: (txs: TransactionCache[]) => void;
  setLoadingBalance: (v: boolean) => void;
  setLoadingTx: (v: boolean) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  publicKey: null,
  xlmBalance: "0",
  usdcBalance: "0",
  transactions: [],
  isLoadingBalance: false,
  isLoadingTx: false,
  setPublicKey: (publicKey) => set({ publicKey }),
  setBalances: (xlmBalance, usdcBalance) => set({ xlmBalance, usdcBalance }),
  setTransactions: (transactions) => set({ transactions }),
  setLoadingBalance: (isLoadingBalance) => set({ isLoadingBalance }),
  setLoadingTx: (isLoadingTx) => set({ isLoadingTx }),
}));
```

---

## 9. UTILITY FUNCTIONS — src/utils/

Create `src/utils/format.ts`:

```ts
// Format currency amounts for display
export const formatAmount = (
  amount: string | number,
  currency = "USD",
  decimals = 2
): string => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0.00";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

// Truncate Stellar public key for display — NEVER show full key in UI
export const truncateAddress = (address: string, chars = 4): string => {
  if (!address || address.length < chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

// Format XLM amounts (7 decimal places max)
export const formatXLM = (amount: string): string => {
  const num = parseFloat(amount);
  return isNaN(num) ? "0.0000000" : num.toFixed(7).replace(/\.?0+$/, "");
};

// Validate Stellar public key (starts with G, 56 chars)
export const isValidStellarAddress = (address: string): boolean =>
  /^G[A-Z2-7]{55}$/.test(address);

// Format relative time (e.g. "2 min ago")
export const formatRelativeTime = (date: Date): string => {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};
```

---

## 10. SOROBAN SETUP (Stretch Goal Infrastructure)

Install Soroban dependencies but do NOT build any contracts yet. Just set up the scaffolding so Dev A can add it in Sprint 2 if needed.

```bash
npm install @stellar/stellar-sdk  # already installed — includes Soroban client
```

Create `src/services/stellar/soroban.ts`:

```ts
// ─────────────────────────────────────────────────────────────────────
// Soroban Smart Contract Client — Sprint 2 stretch goal
//
// Soroban is Stellar's smart contract platform (Rust contracts).
// For StellarPay MVP, all features use native Stellar operations.
// This file is scaffolded for Sprint 2 if conditional escrow is added.
//
// Relevant docs:
// - https://developers.stellar.org/docs/smart-contracts
// - https://developers.stellar.org/docs/build/guides/soroban-rpc
// ─────────────────────────────────────────────────────────────────────

import { SorobanRpc, Contract, TransactionBuilder, BASE_FEE } from "@stellar/stellar-sdk";
import { ACTIVE_NETWORK } from "../../constants/stellar";

const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";

export const getSorobanServer = () =>
  new SorobanRpc.Server(SOROBAN_RPC_URL, { allowHttp: false });

// Placeholder for deployed escrow contract ID (set when contract is deployed)
export const ESCROW_CONTRACT_ID = ""; // TODO: Deploy contract and set ID in Sprint 2

// Example: invoke a Soroban contract function
// Uncomment and implement in Sprint 2
/*
export const invokeEscrowContract = async ({
  callerPublicKey,
  callerUid,
  method,
  args,
}: {
  callerPublicKey: string;
  callerUid: string;
  method: string;
  args: xdr.ScVal[];
}) => {
  const server = getSorobanServer();
  const keypair = await loadKeypairFromSecureStore(callerUid);
  const contract = new Contract(ESCROW_CONTRACT_ID);
  const account = await server.getAccount(callerPublicKey);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: ACTIVE_NETWORK.networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(keypair!);
  return server.sendTransaction(prepared);
};
*/
```

---

## 11. ENVIRONMENT + GITIGNORE

Add to `.gitignore`:

```
.env
.env.local
.env.*.local
node_modules/
.expo/
dist/
*.jks
*.p8
*.p12
*.key
*.mobileprovision
```

---

## 12. VERIFICATION — RUN THESE CHECKS

After setup is complete, verify the following:

```bash
# 1. Check all packages installed
npx expo-doctor

# 2. Confirm TypeScript compiles
npx tsc --noEmit

# 3. Start the dev server
npx expo start

# 4. Confirm the app loads in Expo Go on your phone
# The home screen should be dark (#0F0E23) with no errors in the console
```

---

## 13. WHAT YOU SHOULD CONFIRM WHEN DONE

Report back with:

1. ✅ All npm packages installed with no peer dependency errors
2. ✅ Folder structure created exactly as specified in Section 1
3. ✅ `tailwind.config.js`, `global.css`, `babel.config.js`, `metro.config.js` updated
4. ✅ All files in `src/constants/` created with full content
5. ✅ Firebase config at `src/services/firebase/config.ts` (with placeholder env vars)
6. ✅ Stellar client at `src/services/stellar/client.ts`
7. ✅ Stellar wallet at `src/services/stellar/wallet.ts` (with expo-crypto keypair fix)
8. ✅ Stellar payments at `src/services/stellar/payments.ts`
9. ✅ Soroban scaffold at `src/services/stellar/soroban.ts`
10. ✅ Zustand stores created
11. ✅ Utility functions created
12. ✅ `.env` added to `.gitignore`
13. ✅ `npx expo-doctor` passes
14. ✅ `npx tsc --noEmit` passes
15. ✅ App starts in Expo Go with dark background and no console errors

Flag any step that failed with the exact error message.

---

## NOTES FOR THE AGENT

- **Never use FlatList** — always use `@shopify/flash-list`
- **Never hardcode colors** — always use `Colors` from `src/constants/colors.ts`
- **Never use Framer Motion** — it does not run in React Native. Use `react-native-reanimated` for all animations. It is the equivalent.
- **Never commit `.env`** — verify `.gitignore` covers it before first commit
- **Never show raw Stellar addresses** to users — always use `truncateAddress()`
- **Always use `expo install`** for Expo-managed packages, `npm install` for pure JS packages
- **Firebase JS SDK only** — not `@react-native-firebase`. React Native Firebase breaks Expo Go.
- The stellarpay-design skill must be applied to every screen and component you create going forward.
