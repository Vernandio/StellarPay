import { Keypair, TransactionBuilder, Asset, BASE_FEE, Memo, Operation } from "@stellar/stellar-sdk";
import { Buffer } from "buffer";
import { getHorizonServer, loadAccount } from "./client";
import { loadKeypairFromSecureStore } from "./wallet";
import { ACTIVE_NETWORK, USDC_ASSET } from "../../constants/stellar";

export interface AnchorConfig {
  transferServer: string | null;
  webAuthEndpoint: string | null;
}

export interface InteractiveResponse {
  type: string;
  url: string;
  id: string;
}

export interface AnchorTransaction {
  id: string;
  status: string;
  amount_in?: string;
  amount_out?: string;
  withdraw_anchor_account?: string;
  withdraw_memo?: string;
  withdraw_memo_type?: "text" | "id" | "hash";
  more_info_url?: string;
  stellar_transaction_id?: string;
}

/**
 * Fetches and parses configuration from the Anchor's stellar.toml.
 */
export const fetchStellarToml = async (domain: string): Promise<AnchorConfig> => {
  const resp = await fetch(`https://${domain}/.well-known/stellar.toml`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch stellar.toml from ${domain}: ${resp.statusText}`);
  }
  const text = await resp.text();

  // Parse values via regex matches
  const transferServerMatch = text.match(/TRANSFER_SERVER_SEP0024\s*=\s*"(.*?)"/);
  const webAuthEndpointMatch = text.match(/WEB_AUTH_ENDPOINT\s*=\s*"(.*?)"/);

  return {
    transferServer: transferServerMatch ? transferServerMatch[1] : null,
    webAuthEndpoint: webAuthEndpointMatch ? webAuthEndpointMatch[1] : null,
  };
};

import * as ExpoCrypto from "expo-crypto";

// ──────────────────────────────────────────────────────────────────────
// SHA-256 helper using expo-crypto (works identically on iOS + Web)
// ──────────────────────────────────────────────────────────────────────
async function sha256(data: Uint8Array): Promise<Buffer> {
  const result = await ExpoCrypto.digest(
    ExpoCrypto.CryptoDigestAlgorithm.SHA256,
    new Uint8Array(data) // defensive copy to avoid shared-ArrayBuffer issues
  );
  return Buffer.from(result);
}

/**
 * Performs SEP-10 authentication with the Anchor to retrieve a JWT session token.
 *
 * Uses manual binary XDR signing to avoid the deserialization → re-serialization
 * round-trip that corrupts the server's signature on Hermes/iOS. The transaction
 * hash is computed directly from the original raw bytes, and the client signature
 * is injected into the raw binary without touching the inner transaction body.
 */
export const authenticateSEP10 = async (
  uid: string,
  publicKey: string,
  webAuthEndpoint: string
): Promise<string> => {
  // ── Step 1: Load keypair ────────────────────────────────────────────
  const keypair = await loadKeypairFromSecureStore(uid);
  if (!keypair) {
    throw new Error("Stellar keypair not found in SecureStore");
  }
  const activePublicKey = keypair.publicKey();

  // ── Step 2: Fetch challenge XDR from the Anchor ─────────────────────
  const challengeUrl = `${webAuthEndpoint}?account=${activePublicKey}`;
  const challengeResp = await fetch(challengeUrl);
  if (!challengeResp.ok) {
    throw new Error(`Failed to fetch challenge transaction: ${challengeResp.statusText}`);
  }
  const challengeData = await challengeResp.json();
  const networkPassphrase =
    challengeData.network_passphrase || ACTIVE_NETWORK.networkPassphrase;

  // ── Step 3: Decode the original XDR to raw bytes ────────────────────
  const xdrBytes = Buffer.from(challengeData.transaction, "base64");

  // ── Step 4: Locate the signature array in the raw envelope ──────────
  //
  // V1 envelope layout (XDR):
  //   [4 bytes : EnvelopeType discriminant = 2 (ENVELOPE_TYPE_TX)]
  //   [variable: Transaction struct body]
  //   [4 bytes : signature count N]
  //   [N × 72  : DecoratedSignature structs (hint:4 + len:4 + sig:64)]
  //
  // For a SEP-10 challenge the server adds exactly 1 signature → 76 bytes.
  const SIG_SIZE = 72; // 4 (hint) + 4 (length u32) + 64 (ed25519 sig)
  const sigCountOffset = xdrBytes.length - 4 - SIG_SIZE; // for 1 server sig
  const sigCount = xdrBytes.readUInt32BE(sigCountOffset);

  if (sigCount !== 1) {
    // Fallback for a non-standard challenge with >1 server sigs
    // Recalculate the offset dynamically
    const dynamicOffset = xdrBytes.length - 4 - sigCount * SIG_SIZE;
    if (dynamicOffset < 4 || xdrBytes.readUInt32BE(dynamicOffset) !== sigCount) {
      throw new Error(
        `Cannot parse challenge envelope: unexpected signature layout (count=${sigCount})`
      );
    }
    // Continue with dynamicOffset below (but for SEP-10 this branch is never hit)
  }

  const actualSigCountOffset =
    sigCount === 1
      ? sigCountOffset
      : xdrBytes.length - 4 - sigCount * SIG_SIZE;

  // ── Step 5: Extract the Transaction body bytes from the ORIGINAL XDR ─
  const txBodyBytes = xdrBytes.slice(4, actualSigCountOffset);

  // ── Step 6: Compute the transaction hash from ORIGINAL bytes ────────
  //
  // signatureBase = SHA256(networkPassphrase) ‖ envelopeType(4) ‖ txBody
  // txHash        = SHA256(signatureBase)
  const networkIdHash = await sha256(Buffer.from(networkPassphrase));

  const envelopeTypeBuf = Buffer.alloc(4);
  envelopeTypeBuf.writeUInt32BE(2, 0); // ENVELOPE_TYPE_TX = 2

  const signatureBase = Buffer.concat([
    networkIdHash,    // 32 bytes
    envelopeTypeBuf,  //  4 bytes
    txBodyBytes,      // variable
  ]);

  const txHash = await sha256(signatureBase);

  // ── Step 7: Sign the hash with the user's keypair ───────────────────
  const signature = Buffer.from(keypair.sign(txHash));
  const hint = Buffer.from(keypair.signatureHint());

  // ── Step 8: Build the new XDR with the client signature appended ────
  //
  // Original:  [...txBody...][count=N][serverSig₁]...[serverSigₙ]
  // New:       [...txBody...][count=N+1][serverSig₁]...[serverSigₙ][clientSig]
  const newXdr = Buffer.alloc(xdrBytes.length + SIG_SIZE);
  xdrBytes.copy(newXdr);                                       // copy everything
  newXdr.writeUInt32BE(sigCount + 1, actualSigCountOffset);    // increment count

  const appendAt = xdrBytes.length;
  hint.copy(newXdr, appendAt);                  // hint:      4 bytes
  newXdr.writeUInt32BE(64, appendAt + 4);       // sig length: 4 bytes (= 64)
  signature.copy(newXdr, appendAt + 8);         // sig data:  64 bytes

  const signedXdr = newXdr.toString("base64");

  // ── Step 9: Submit the signed challenge back to the Anchor ──────────
  const authResp = await fetch(webAuthEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transaction: signedXdr }),
  });

  if (!authResp.ok) {
    const errorText = await authResp.text();
    throw new Error(`SEP-10 authentication rejected: ${errorText}`);
  }

  const authData = await authResp.json();
  return authData.token;
};

/**
 * Initiates an interactive deposit (onramp) transaction.
 */
export const initiateInteractiveDeposit = async (
  transferServer: string,
  token: string,
  publicKey: string,
  assetCode = USDC_ASSET.code
): Promise<InteractiveResponse> => {
  const resp = await fetch(`${transferServer}/transactions/deposit/interactive`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      asset_code: assetCode,
      account: publicKey,
    }),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Failed to initiate interactive deposit: ${errorText}`);
  }

  return resp.json();
};

/**
 * Initiates an interactive withdrawal (offramp) transaction.
 */
export const initiateInteractiveWithdraw = async (
  transferServer: string,
  token: string,
  publicKey: string,
  assetCode = USDC_ASSET.code
): Promise<InteractiveResponse> => {
  const resp = await fetch(`${transferServer}/transactions/withdraw/interactive`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      asset_code: assetCode,
      account: publicKey,
    }),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Failed to initiate interactive withdrawal: ${errorText}`);
  }

  return resp.json();
};

/**
 * Polls the current status of an Anchor transaction.
 */
export const pollTransactionStatus = async (
  transferServer: string,
  token: string,
  transactionId: string
): Promise<AnchorTransaction> => {
  const resp = await fetch(`${transferServer}/transaction?id=${transactionId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!resp.ok) {
    throw new Error(`Failed to query transaction status: ${resp.statusText}`);
  }

  const data = await resp.json();
  return data.transaction;
};

/**
 * Submits the required withdrawal payment transaction to the Anchor on-chain.
 */
export const sendWithdrawalPayment = async ({
  uid,
  publicKey,
  destinationAddress,
  amount,
  assetCode = "USDC",
  memoValue,
  memoType = "text",
}: {
  uid: string;
  publicKey: string;
  destinationAddress: string;
  amount: string;
  assetCode?: string;
  memoValue: string;
  memoType?: "text" | "id" | "hash";
}): Promise<string> => {
  const keypair = await loadKeypairFromSecureStore(uid);
  if (!keypair) {
    throw new Error("Stellar keypair not found in SecureStore");
  }

  const server = getHorizonServer();
  const account = await loadAccount(publicKey);

  const targetAsset =
    assetCode === "XLM"
      ? Asset.native()
      : new Asset(USDC_ASSET.code, USDC_ASSET.issuer);

  const txBuilder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: ACTIVE_NETWORK.networkPassphrase,
  }).addOperation(
    Operation.payment({
      destination: destinationAddress,
      asset: targetAsset,
      amount,
    })
  );

  // Add the memo exactly as specified by the Anchor
  if (memoValue) {
    if (memoType === "id") {
      txBuilder.addMemo(Memo.id(memoValue));
    } else if (memoType === "hash") {
      txBuilder.addMemo(Memo.hash(memoValue));
    } else {
      txBuilder.addMemo(Memo.text(memoValue));
    }
  }

  const tx = txBuilder.setTimeout(30).build();
  tx.sign(keypair);

  // Serialize envelope directly to base64 using Buffer (which is 100% correct in Hermes)
  const envelopeXdr = Buffer.from(tx.toEnvelope().toXDR()).toString("base64");
  console.log("Submitting transaction to Horizon...", envelopeXdr);

  try {
    const submitResp = await fetch(`${ACTIVE_NETWORK.horizonUrl}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `tx=${encodeURIComponent(envelopeXdr)}`,
    });

    const submitData = await submitResp.json();
    
    if (!submitResp.ok) {
      console.error("Horizon Submission Failed Details:", JSON.stringify(submitData));
      throw new Error(submitData.detail || "Transaction submission failed");
    }

    return submitData.hash;
  } catch (err: any) {
    console.error("Failed to submit transaction to Horizon:", err);
    throw err;
  }
};
