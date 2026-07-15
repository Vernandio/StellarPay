# StellarPay: Invisible Web3 Wallet

> [!IMPORTANT]
> **📢 Note to Judges:** For the best UI & UX experience, please download and install the **Android Application (.APK)** provided below, as the application interface and hardware features (like NFC and Camera) perform best natively.
> 
> **Demo Account:** You can log in using the username **johndoe** and PIN **123456**.

### 🌐 Production Deployments & Links
- **Production Web Application Client**: [https://stellar-pay-three.vercel.app/](https://stellar-pay-three.vercel.app/)
- **Android Application (.APK)**: [https://drive.google.com/file/d/1GvvLtOEf-mZe90iUtNgMokE5LvEgJSaV/view?usp=sharing](https://drive.google.com/file/d/1GvvLtOEf-mZe90iUtNgMokE5LvEgJSaV/view?usp=sharing)

- **Production Backend API**: [https://stellar-pay-backend-kappa.vercel.app/](https://stellar-pay-backend-kappa.vercel.app/)
- **Stellar.toml Configuration**: [https://stellar-pay-backend-kappa.vercel.app/.well-known/stellar.toml](https://stellar-pay-backend-kappa.vercel.app/.well-known/stellar.toml)

- **Pitchdeck**: [https://canva.link/re5geves38x0bgk](https://canva.link/re5geves38x0bgk)
- **Demo Video**: [https://www.youtube.com/watch?v=37CC4Je8MYw](https://www.youtube.com/watch?v=37CC4Je8MYw)


> [!NOTE]
> **⚠️ MoneyGram Integration Note:** We are currently awaiting domain whitelist approval from the MoneyGram team. During this pending state, the application is temporarily configured to use the default Stellar Testnet SEP-24 Anchor for demonstrating deposit and withdrawal features. It will be switched over to MoneyGram's API endpoint once approved.

---

## 💡 The Concept: Fast, Easy, & Invisible Web3

StellarPay is a hybrid Web2.5 digital wallet designed to bridge the gap between Web2 payment convenience (like Cash App, Venmo, or Revolut) and Web3 blockchain utility. 

Blockchain complexities—such as public keys, secret keys, gas/network fees, trustlines, and base64-encoded XDR transactions—are **completely hidden** from the user. The app presents balances and transactions entirely in fiat equivalents (USD/IDR/VND), while settling transactions on-chain in the background in seconds.

### ⛽ The "Gas-less" UX & XLM Reserve Concept
To achieve a frictionless onboarding experience, StellarPay abstracts Stellar's native network reserve requirements:
- **Auto-Provisioned Reserves:** When a user registers, the developer/faucet automatically seeds their newly generated Stellar wallet with **2 XLM** in the background.
- **Lifetime Network Fee Coverage:** Since Stellar network transactions cost a fraction of a cent (typically 0.00001 XLM per transaction), this **2 XLM** reserve covers thousands of transactions, effectively making the wallet "gas-less" and free-to-use for the end-user.
- **Fast-Transfer Settlement:** By utilizing the Stellar blockchain, payments settle globally within **3 to 5 seconds** (the ledger closure time), bypassing traditional banking delays and high cross-border fees.

---

## 🚀 Core Features & Showcase

Here is a showcase of the key features of StellarPay, complete with previews of our mobile client:

### 1. 💸 Send Money Instantly (Username, NFC & QR)
Send funds to anyone in seconds. You can type their unique handle, scan their QR code, or use **NFC (Tap to Pay)** for proximity payments—instantly transferring tokens behind the scenes.

| Send via Username | NFC Tap to Pay |
|:---:|:---:|
| ![Send money](https://res.cloudinary.com/dr09lvoly/image/upload/v1784063003/send_kklq1d.gif) | ![NFC Pay](https://res.cloudinary.com/dr09lvoly/image/upload/v1784062875/tap_nry6fy.gif) |

### 2. 📲 Request Money (Username & QR)
Request payments from friends easily. Users can generate request codes or request money directly via usernames. The recipient receives a real-time push notification and can pay the request with a single tap.

| Request via Username | Request via QR Code |
|:---:|:---:|
| ![Request by username](https://res.cloudinary.com/dr09lvoly/image/upload/v1784062876/req_qlrpnz.gif) | ![Request by input nominal + QR](https://res.cloudinary.com/dr09lvoly/image/upload/v1784063003/reqqr_cuqko2.gif) |

### 3. 🧾 On-Chain Split Bill & Escrow
An AI-powered smart receipt parser and allocation mechanism:
- **AI OCR Camera Scan**: Uploading a receipt image calls our backend and uses **Gemini 2.5 Flash** to extract line items, prices, tax, discounts, and currency.
- **Proportional Cost Allocation**: Users can allocate items to specific friends, and the app automatically distributes tax/discounts proportionally.
- **On-Chain Escrow Contract**: Uses a custom **Soroban Smart Contract** to hold funds in escrow. Organizer claims funds once everyone has paid; participants can claim a refund if the deadline expires.

<p align="center">
  <img src="https://res.cloudinary.com/dr09lvoly/image/upload/v1784063004/splitbill_d6likg.gif" alt="Splitbill Escrow Flow" width="320"/>
</p>

### 🌏 4. Southeast Asian Merchant Payments (QRIS / QRPH / VietQR)
StellarPay bridges local fiat payment systems by allowing users to pay national QR codes (**QRIS** in Indonesia, **QRPH** in Philippines, **VietQR** in Vietnam) directly using their Stellar wallet balance.
- **Merchant Partnership Concept:** In production, this is achieved through partnership with payment processors/vendors, enabling seamless cross-border retail payments without the user needing a local bank account.

| Indonesia (QRIS) | Philippines (QRPH) | Vietnam (VietQR) |
|:---:|:---:|:---:|
| ![QRIS](https://res.cloudinary.com/dr09lvoly/image/upload/v1784062876/qris_a4yt27.gif) | ![QRPH](https://res.cloudinary.com/dr09lvoly/image/upload/v1784062876/qrph_ypgxzs.gif) | ![Viet QR](https://res.cloudinary.com/dr09lvoly/image/upload/v1784062876/qrviet_qopiqs.gif) |

### ⚡ 5. Real-Time Horizon SSE Payment Listeners
Instead of polling the server, the client establishes an active event stream connection to the Stellar Horizon Server-Sent Events (SSE) payment listener. Any incoming or outgoing payments on-chain are intercepted in real-time to update balances and activity streams.

---

## 🛠️ Smart Contracts Overview

StellarPay leverages the power of Stellar's **Soroban Smart Contracts** to manage secure, on-chain split bills and token operations. Below are the smart contracts integrated into the application:

### 1. Split Bill Escrow Manager Contract
- **Contract ID**: `CB5VWPNDBJUK2FB62WN56VPGIKZURCUE3LIIZWEQXKM7BRERSQ42CZGC`
- **Source Code**: Located in [`contracts/split_bill/src/lib.rs`](file:///E:/CodeRepository/StellarPay/contracts/split_bill/src/lib.rs)
- **Key Features**:
  - **`create_bill`**: Deploys a new split bill escrow session on-chain. It auto-increments and returns a unique `bill_id` (e.g. `1`, `2`, `3`...) while recording organizer details, the target payment amount, participant addresses, individual owe amounts, and the deadline.
  - **`pay_share`**: Allows designated participants to transfer their specific split portion directly into the escrow contract. Once the final participant pays, the contract automatically marks the bill status as `Completed`.
  - **`claim_funds`**: Enables the organizer to withdraw the total accumulated funds to their personal wallet once all participants have settled their shares (status is `Completed`).
  - **`refund`**: Allows participants to withdraw their paid shares back to their wallets if the bill's deadline has passed and the bill remains unpaid (status is `Expired`).

### 2. SRT Token Contract (Sandbox USDC)
- **Contract ID**: `CBZVLMD5DBKIFSVU23WAVMJD25IRUBWCVAXGURPUPMB2CUNFBQN742UV` (Testnet)
- **Key Features**:
  - Serves as the primary payment token for testnet sandbox transactions (mapping to the classic asset code `SRT`).
  - Implements the standard Soroban Token interface (similar to ERC-20) supporting checks (`balance`), transfers (`transfer`), and allowances (`approve`).

### 3. Circle USDC Token Contract (Official Testnet USDC)
- **Contract ID**: `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`
- **Key Features**:
  - Official Testnet USDC contract deployed by Circle.
  - Used when executing deposits/withdrawals via the MoneyGram Anchor integration.

---

## 🏗️ Core Technical Architecture

### 1. Self-Healing Wallet Credential Management
To solve cross-device session problems and local credential corruption:
- If the local `SecureStore` keypair is empty or does not match the registered `stellarPublicKey` on the Firestore user profile, the client recovers the private key from the `stellarPrivateKey` backup stored inside Firestore.
- If a backup is not available, the client automatically generates a new cryptographic keypair, requests testnet funding, registers the keypair on Firestore, and initializes the USDC trustline in the background.

### 2. Five-Strike Security Lockout Scheme
To prevent brute-force attacks on sensitive transaction flows:
- If the user enters an incorrect PIN on either the login screen or the transaction verification bottom sheet, the UI displays the remaining attempts.
- Once attempts reach 5, the app clears the user's Firestore PIN subcollection, sets `hasPin = false` on their user profile, deletes local keychain keys, and initiates an immediate auto-logout.

### 3. ViewShot QR Code Card Exports
- Captures QR codes and transaction receipts as high-resolution PNG images natively on mobile (using `ViewShot` container) to bypass browser compatibility issues under Hermes engine.

---

## 🗂️ Folder Directory Mapping

- `/` (Root) — The frontend mobile application built with **React Native (Expo Go)**, NativeWind, and Reanimated v3.
- `/backend` — Express.js REST API backend supporting Firestore operations and Gemini AI OCR integrations.
- `/src` — Global store, hooks, configurations, and Stellar services.
- `/contracts` — Rust Soroban smart contracts code and compiled `.wasm` bytecode.

---

## ⚙️ Development Setup

### Backend Configuration (`/backend`)
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
   - Save the file as **`serviceAccountKey.json`** directly inside the `backend/` folder.
5. Run the server in development mode:
   ```bash
   npm run dev
   ```

### Mobile Client Setup (Root Directory)
1. Return to the root directory and install packages:
   ```bash
   npm install
   ```
2. Configure the frontend environment:
   ```bash
   cp .env.example .env
   ```
   Fill in your Firebase Web App SDK keys and the Anchor domain.
3. Start the bundler:
   - **Native Device (Expo Go)**:
     ```bash
     npx expo start --clear
     ```
     Scan the terminal's QR code using the **Expo Go** application on your physical device to run the app.

---

## 👥 Hackathon Team Members

- **Vernandio Rivaldo**
- **Jason**
- **Natha Buddhi Pratama Chandra**.
