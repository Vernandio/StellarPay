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
