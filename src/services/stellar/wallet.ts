import { Keypair, TransactionBuilder, Operation, Networks, Asset, BASE_FEE } from "@stellar/stellar-sdk";
import * as Crypto from "expo-crypto";
import { Buffer } from "buffer";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getHorizonServer, loadAccount, getAccountBalances } from "./client";
import { ACTIVE_NETWORK, USDC_ASSET, APP_MEMO_PREFIX } from "../../constants/stellar";

const KEYPAIR_STORE_KEY = (uid: string) => `stellarpay_keypair_${uid}`;

// ──────────────────────────────────────────────────────────────────────
// IMPORTANT: createKeypair() from the SDK crashes in React Native.
// We use expo-crypto to generate the random bytes instead.
// ──────────────────────────────────────────────────────────────────────
export const generateKeypair = async (): Promise<Keypair> => {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  // Use Array.from to prevent Hermes Uint8Array-to-Buffer sharing bugs
  return Keypair.fromRawEd25519Seed(Buffer.from(Array.from(randomBytes)));
};

export const storeKeypairSecurely = async (uid: string, keypair: Keypair) => {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(KEYPAIR_STORE_KEY(uid), keypair.secret());
  } else {
    await SecureStore.setItemAsync(
      KEYPAIR_STORE_KEY(uid),
      keypair.secret(),
      { requireAuthentication: false } // Set true to require biometrics on access
    );
  }
};

export const loadKeypairFromSecureStore = async (uid: string): Promise<Keypair | null> => {
  let secret = Platform.OS === "web"
    ? await AsyncStorage.getItem(KEYPAIR_STORE_KEY(uid))
    : await SecureStore.getItemAsync(KEYPAIR_STORE_KEY(uid));

  if (!secret) {
    // Try to restore from Firestore backup (cross-device sandbox developer experience)
    try {
      const { db } = require("../firebase/config");
      const { getDoc, doc } = require("firebase/firestore");
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data && data.stellarPrivateKey) {
          const restoredSecret: string = data.stellarPrivateKey;
          secret = restoredSecret;
          // Store it locally so we don't have to fetch it next time
          if (Platform.OS === "web") {
            await AsyncStorage.setItem(KEYPAIR_STORE_KEY(uid), restoredSecret);
          } else {
            await SecureStore.setItemAsync(KEYPAIR_STORE_KEY(uid), restoredSecret, {
              requireAuthentication: false,
            });
          }
          console.log("Stellar keypair restored successfully from Firestore backup.");
        }
      }
    } catch (err) {
      console.warn("Failed to restore Stellar keypair from Firestore:", err);
    }
  }

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

  // Backup the private key to Firestore for cross-device sandbox testing
  try {
    const { db } = require("../firebase/config");
    const { updateDoc, doc } = require("firebase/firestore");
    await updateDoc(doc(db, "users", uid), {
      stellarPrivateKey: keypair.secret(),
    });
    console.log("Stellar private key backed up to Firestore.");
  } catch (err) {
    console.warn("Failed to backup private key to Firestore:", err);
  }

  return keypair.publicKey();
};

const submitTxToHorizon = async (tx: any): Promise<string> => {
  const xdrBytes: Uint8Array = tx.toEnvelope().toXDR();
  const xdrBase64 = Buffer.from(xdrBytes).toString("base64");

  const response = await fetch(`${ACTIVE_NETWORK.horizonUrl}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `tx=${encodeURIComponent(xdrBase64)}`,
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Horizon Trustline Submission Failed:", JSON.stringify(data));
    throw new Error(data?.detail || "Horizon transaction submission failed");
  }
  return data.hash;
};

export const setupUSDCTrustline = async (uid: string, publicKey: string): Promise<string> => {
  const keypair = await loadKeypairFromSecureStore(uid);
  if (!keypair) throw new Error("Keypair not found in secure store");

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
  const hash = await submitTxToHorizon(tx);
  return hash;
};

export const checkUSDCTrustlineExists = async (publicKey: string): Promise<boolean> => {
  try {
    const balances = await getAccountBalances(publicKey);
    return balances.some(
      (b) =>
        b.asset_type === "credit_alphanum4" &&
        (b as any).asset_code === USDC_ASSET.code &&
        (b as any).asset_issuer === USDC_ASSET.issuer
    );
  } catch (err) {
    // If account doesn't exist on-chain or fails to load, return false
    return false;
  }
};
