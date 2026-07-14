# StellarPay: Invisible Web3 Wallet (Web2.5 Architecture)

StellarPay is a hybrid Web2.5 digital wallet built on the Stellar blockchain network. It bridges the gap between Web2 convenience (like Cash App or Venmo) and Web3 utility. All blockchain-specific complexities—such as gas fees, trustlines, public keys, secret keys, and base64-encoded XDR transactions—are abstracted away from the end user. The interface is presented entirely in fiat equivalents (USD), while settling transactions fully on-chain in the background.

## Problem Statement
Traditional Web3 wallets are intimidating for everyday users due to complex onboarding, seed phrases, gas fees, and confusing cryptographic addresses. Meanwhile, Web2 fiat wallets lack transparency, global interoperability, and the decentralized security of blockchain networks. Splitting bills and managing peer-to-peer payments across borders remains fragmented and costly.

## Proposed Solution
StellarPay delivers a "Web2.5" experience: a familiar, Cash App-like interface that completely abstracts blockchain complexities. It leverages the Stellar network for near-instant, low-cost settlements while using Gemini AI to effortlessly parse and split receipts. Users get the UX of traditional finance with the borderless power of decentralized finance.

## Target Users / Audience
- **Everyday Consumers:** Friends and groups who frequently split bills (dinners, trips) and want a frictionless P2P payment experience.
- **Crypto-Curious Individuals:** People interested in digital assets but intimidated by the technical hurdles of traditional Web3 wallets.
- **Cross-Border Senders:** Users needing fast, low-cost international transfers without dealing with complex crypto exchanges.

## Expected Stellar Integration
StellarPay relies natively on the Stellar blockchain infrastructure:
- **Invisible Gas & Trustlines:** Transactions, account funding (Friendbot), and trustline creations are seamlessly handled in the background.
- **Real-Time Horizon SSE:** Live server-sent events for instant balance updates and transaction feeds.
- **On-Chain Settlement:** All peer-to-peer transfers and bill splits are settled instantly on-chain using Stellar assets (like USDC) while being presented in familiar fiat equivalents.

---

## App Previews & Showcases

Below are placeholder links for showcasing the user interface and interactions. You can drop in your own image assets or screen recordings here:

```text
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                     [APP DEMO GIF]                       │
│             Location: /assets/demo.gif                   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

```text
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                      [DEMO BANNER]                       │
│             Location: /assets/banner.png                 │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

| Home & Balance Streams | Gemini AI OCR Split Bill | PIN Entry & Lockout |
|:---:|:---:|:---:|
| `![Home Preview](./assets/screenshots/home.png)` | `![OCR Preview](./assets/screenshots/split.png)` | `![PIN Preview](./assets/screenshots/pin.png)` |

---

## Core Technical Architecture & Features

### 1. Gemini AI OCR Split Bill Flow
A multi-step smart receipt parser and allocation mechanism:
* **Step 1 (Participant Selection)**: Select friends from your suggested friends list or look up users by their unique username handle.
* **Step 2 (Data Collection)**: Choose between entering items manually or using the AI OCR Camera Scan.
* **Step 3 (Gemini 2.5 Flash OCR Processing)**: Uploading a receipt image reads it as a base64 string on the client and calls our backend API. The backend instructs Gemini 2.5 Flash via structured prompt guidelines to extract:
  - Line items (name, unit price, quantity).
  - Tax and Discount amounts (with fallback to 0.00 if absent).
  - Receipt currency code (e.g., IDR, PHP, USD, SGD).
  - Grand total bill amount.
* **Step 4 (Editable Review & Verification)**: Presents the extracted receipt items in a modular list. Users can add new items, delete incorrect ones, change prices, edit quantities, adjust the currency, and correct the tax/discount fields.
* **Step 5 (Proportional Cost Allocation)**:
  - *Even split*: Total bill is divided equally among participants + yourself.
  - *Itemized split*: Users tap an item and select exactly which participants share that item. 
  - *Proportional Tax/Discount distribution formula*:
    $$Subtotal_{user} = \sum (Price_i \times Qty_i)_{user}$$
    $$Ratio_{user} = \frac{Subtotal_{user}}{Subtotal_{total}}$$
    $$Tax_{user} = Tax_{total} \times Ratio_{user}$$
    $$Discount_{user} = Discount_{total} \times Ratio_{user}$$
    $$Total_{user} = Subtotal_{user} + Tax_{user} - Discount_{user}$$
    This ensures that tax and discounts are distributed fairly and proportionally based on what each person actually ordered.

### 2. Self-Healing Wallet Credential Management
To solve cross-device session problems and local credential corruption:
* If the local `SecureStore` keypair is empty or does not match the registered `stellarPublicKey` on the Firestore user profile (which happens when switching logged-in accounts on a single physical device), the application triggers a self-healing process.
* The client attempts to recover the corresponding private key from the `stellarPrivateKey` backup field stored inside Firestore.
* If a backup is not available, the client automatically generates a new cryptographic keypair, requests testnet funding from Friendbot, registers the public key and private key backup on Firestore, and initializes the USDC trustline. This ensures the user's wallet is always operational and in sync with the session token.

### 3. Five-Strike Security Lockout Scheme
To prevent brute-force attacks on sensitive transaction flows:
* Custom failed PIN entry counters are tracked on the device's storage.
* If the user enters an incorrect PIN on either the login screen or the transaction verification bottom sheet, the UI displays the remaining attempts (e.g., `Incorrect PIN. 4 attempts remaining.`).
* Once the attempts reach 5, the app clears the user's Firestore PIN subcollection, sets `hasPin = false` on their user profile, deletes local keychain keys, alerts the user, and initiates an immediate auto-logout.

### 4. Real-Time Horizon SSE (Server-Sent Events) Payment Listeners
* Instead of running background setInterval polling, the client establishes an active event stream connection to the Stellar Horizon Server-Sent Events payment listener.
* Any incoming or outgoing payments on-chain are intercepted in real-time, instantly updating the user's cached balances and transaction activity feed.

### 5. ViewShot QR Code Card Exports
* Because direct SVG-to-data-URL rendering crashes or outputs corrupted XDR streams on mobile devices running React Native's Hermes JavaScript engine, the application captures vouchers as native UI components.
* It wraps QR receipts and personal address codes in a `ViewShot` container. Tapping Save or Share captures a high-resolution PNG image, saving it directly to the user's photo library or presenting the native sharing tray.

---

## Folder Directory Mapping

- `/` (Root) — The frontend mobile application built with **React Native (Expo Go)**, NativeWind, and Reanimated v3.
- `/backend` — Express.js REST API backend supporting Firestore operations and Gemini AI OCR integrations.
- `/src` — Global store, hooks, configurations, and Stellar services.

---

## Backend Configuration (`/backend`)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install node dependencies:
   ```bash
   npm install
   ```
3. Set up the environment variables:
   ```bash
   cp .env.example .env
   ```
   Modify the `.env` file with these values:
   - `PORT`: Server port (e.g., `5000`).
   - `FIREBASE_SERVICE_ACCOUNT_PATH`: Path to your Firebase service account JSON key (e.g., `./serviceAccountKey.json`).
   - `SMTP_EMAIL` and `SMTP_PASSWORD`: SMTP server credentials for user OTP code mail verification.
   - `GEMINI_API_KEY`: API key for Google Gemini model processing.
4. Add Firebase Service Account Key:
   - Go to your Firebase Console -> Project Settings -> Service Accounts.
   - Click "Generate new private key" to download the JSON credential.
   - Save the file as **`serviceAccountKey.json`** directly inside the `backend/` folder.
5. Run the server in development mode:
   ```bash
   npm run dev
   ```

---

## Mobile Client Setup (Root Directory)

1. Return to the root directory and install packages:
   ```bash
   npm install
   ```
2. Configure the frontend environment:
   ```bash
   cp .env.example .env
   ```
   Fill in your Firebase Web App SDK keys (`EXPO_PUBLIC_FIREBASE_API_KEY` through `_APP_ID`) and the Anchor domain (`EXPO_PUBLIC_ANCHOR_DOMAIN`).
3. Start the bundler:
   - **Web Interface**:
     ```bash
     npm run web
     ```
   - **Native Device (Expo Go)**:
     ```bash
     npx expo start --clear
     ```
     Scan the terminal's QR code using the **Expo Go** application on your physical device to run the app.

---

## Code Quality Verification Commands

Verify that the codebase meets clean compilation standards prior to submission:
- **TypeScript Type Verification**:
  ```bash
  npx tsc --noEmit
  ```
  *(Should return 0 errors)*
- **Expo Configuration Health Check**:
  ```bash
  npx expo-doctor
  ```
  *(Should complete with all checks passing)*


