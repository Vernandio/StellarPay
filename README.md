# StellarPay 🚀

StellarPay adalah aplikasi fintech dompet digital hibrida (Web2.5) berbasis blockchain Stellar. Aplikasi ini menyembunyikan semua kerumitan Web3 (seperti gas fees, trustlines, dan wallet addresses panjang) bagi pengguna biasa, menyajikan antarmuka super bersih bernilai dolar (USD) seperti Cash App / Venmo, namun berjalan sepenuhnya secara on-chain di latar belakang memanfaatkan protokol Stellar SEP-10 & SEP-24.

---

## Struktur Folder Project
*   `/` (Root): Aplikasi Mobile & Web berbasis **React Native Expo Go**.
*   `/backend`: API Server Backend berbasis **Node.js Express** & **Firebase Admin SDK**.

---

## 1. Setup & Konfigurasi Backend

Masuk ke folder backend untuk memulai setup:
```bash
cd backend
```

### A. Install Dependencies
Instal semua package yang diperlukan untuk server backend:
```bash
npm install
```

### B. Konfigurasi File Environment (`.env`)
Buat file `.env` baru di dalam folder `backend/` dengan menyalin file template:
```bash
cp .env.example .env
```
Buka file `.env` tersebut dan isi variabel yang diperlukan:
*   `PORT`: Port default untuk server (default: `5000`).
*   `FIREBASE_SERVICE_ACCOUNT_PATH`: Jalur file kredensial admin firebase (default: `./serviceAccountKey.json`).
*   `STELLAR_NETWORK`: Atur ke `TESTNET` untuk uji coba sandbox.
*   `SMTP_EMAIL` & `SMTP_PASSWORD`: Data autentikasi email SMTP Anda untuk pengiriman email otomatis.

### C. Salin Kredensial Firebase Admin (`serviceAccountKey.json`)
Untuk menghubungkan server backend dengan Firebase Firestore dan Authentication:
1.  Buka **Firebase Console** -> Pilih Project Anda -> Klik ikon Gigi (Project Settings) -> Buka tab **Service Accounts**.
2.  Klik tombol **Generate new private key** untuk mengunduh berkas kunci privat JSON.
3.  Ubah nama berkas yang diunduh tersebut menjadi **`serviceAccountKey.json`**.
4.  Salin/pindahkan file `serviceAccountKey.json` tersebut ke dalam folder **`backend/`**.

### D. Jalankan Server Backend
*   **Mode Development** (dengan auto-reload):
    ```bash
    npm run dev
    ```
*   **Mode Produksi**:
    ```bash
    npm run build
    npm start
    ```

---

## 2. Setup & Konfigurasi Frontend (Root)

Kembali ke direktori root proyek untuk mengonfigurasi aplikasi React Native:
```bash
cd ..
```

### A. Install Dependencies
Instal semua package frontend yang dibutuhkan:
```bash
npm install
```

### B. Konfigurasi File Environment (`.env`)
Buat file `.env` baru di direktori root dengan menyalin file template:
```bash
cp .env.example .env
```
Buka file `.env` tersebut dan isi kredensial Firebase web Anda, konfigurasi SMTP, dan domain Anchor Stellar:
*   `EXPO_PUBLIC_FIREBASE_API_KEY` s.d `_APP_ID`: Salin kredensial web SDK Anda dari Firebase Console.
*   `EXPO_PUBLIC_ANCHOR_DOMAIN`: Atur ke **`testanchor.stellar.org`** untuk menggunakan sandbox pengujian resmi Stellar.

---

## 3. Menjalankan Aplikasi Frontend

### 🌐 Menjalankan Versi Web (Web View)
Untuk menguji dan menganalisis lalu lintas jaringan (*network logs*) di browser laptop dengan mudah, jalankan aplikasi sebagai website:
```bash
npm run web
```
Aplikasi akan langsung terbuka di browser Anda (biasanya pada alamat `http://localhost:8081`).

### 📱 Menjalankan Versi Mobile (Expo Go)
Untuk menguji aplikasi secara native di HP fisik (iOS/Android) atau simulator:
```bash
npx expo start
```
*   **Penting**: Jika Anda melakukan perubahan kode mendasar atau memodifikasi file polyfill di `index.js`, jalankan dengan flag `--clear` untuk membersihkan cache bundler:
    ```bash
    npx expo start --clear
    ```
*   Scan QR Code yang muncul di terminal Anda menggunakan aplikasi **Expo Go** (diunduh dari App Store / Play Store) untuk membuka aplikasi secara instan.

---

## 4. Perintah Verifikasi & Validasi Kode

Sebelum menyerahkan proyek Anda ke juri, jalankan alat verifikasi ini untuk memastikan tidak ada kesalahan:

*   **Pemeriksaan Tipe TypeScript**:
    ```bash
    npx tsc --noEmit
    ```
    *Pastikan output kosong (0 errors).*

*   **Pemeriksaan Kesehatan Konfigurasi Expo**:
    ```bash
    npx expo-doctor
    ```
    *Pastikan semua checklist (18/18 checks) lolos.*
