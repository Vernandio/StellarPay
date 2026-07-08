import {
  TransactionBuilder, Operation, Asset, BASE_FEE, Memo,
} from "@stellar/stellar-sdk";
import { loadAccount } from "./client";
import { ACTIVE_NETWORK, USDC_ASSET, APP_MEMO_PREFIX } from "../../constants/stellar";
import {
  loadKeypairFromSecureStore,
  setupUSDCTrustline,
  checkUSDCTrustlineExists,
} from "./wallet";
import { Buffer } from "buffer";

// ── Helpers ───────────────────────────────────────────────────────────

const getAsset = (assetCode: "XLM" | "USDC") =>
  assetCode === "XLM"
    ? Asset.native()
    : new Asset(USDC_ASSET.code, USDC_ASSET.issuer);

/**
 * Submit a signed Stellar transaction to Horizon via raw fetch.
 *
 * WHY: The Stellar JS SDK's `server.submitTransaction(tx)` internally calls
 *      `tx.toEnvelope().toXDR().toString("base64")`.
 *      In React Native (Hermes), `toXDR()` returns a Uint8Array — NOT a Node
 *      Buffer — so `.toString("base64")` silently falls back to the default
 *      Uint8Array.toString(), producing comma-separated byte values like
 *      "0,0,0,2,14,120,...".  Horizon rejects this with "Transaction Malformed".
 *
 *      Additionally, `feaxios` (the SDK's internal HTTP client) passes a
 *      URLSearchParams body to React Native's fetch, which silently drops it.
 *
 *      By manually wrapping the raw bytes in `Buffer.from()` and submitting
 *      via `fetch` with a plain string body, we bypass both issues.
 */
const submitTxToHorizon = async (tx: any): Promise<string> => {
  // Get raw XDR bytes (Uint8Array) and convert to real base64 via Buffer polyfill
  const xdrBytes: Uint8Array = tx.toEnvelope().toXDR();
  const xdrBase64 = Buffer.from(xdrBytes).toString("base64");

  console.log("XDR_B64:", xdrBase64.substring(0, 80) + "...");

  const horizonUrl = ACTIVE_NETWORK.horizonUrl;
  const response = await fetch(`${horizonUrl}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `tx=${encodeURIComponent(xdrBase64)}`,
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("HORIZON ERR:", JSON.stringify(data));
    const opCodes: string[] = data?.extras?.result_codes?.operations ?? [];
    let friendly: string | null = null;
    if (opCodes.includes("op_underfunded")) {
      friendly = "Insufficient balance to send this amount. Deposit funds and try again.";
    } else if (opCodes.includes("op_src_no_trust")) {
      friendly = "Your wallet isn't set up for USD yet. Please try again.";
    } else if (opCodes.includes("op_no_trust")) {
      friendly = "The recipient's wallet can't receive USD yet. Ask them to open StellarPay once, then retry.";
    } else if (opCodes.includes("op_no_destination")) {
      friendly = "The recipient's wallet doesn't exist on the network yet.";
    }
    throw new Error(
      friendly ??
        (data?.extras?.result_codes
          ? `Stellar tx failed: ${JSON.stringify(data.extras.result_codes)}`
          : data?.detail || `Horizon returned ${response.status}`)
    );
  }

  console.log("TX SUCCESS:", data.hash);
  return data.hash;
};

// ── Send payment (P2P) ────────────────────────────────────────────────

export const sendPayment = async ({
  senderUid,
  senderPublicKey,
  destinationAddress,
  amount,
  asset = "USDC",
  memo,
  destinationUid,
}: {
  senderUid: string;
  senderPublicKey: string;
  destinationAddress: string;
  amount: string;
  asset?: "XLM" | "USDC";
  memo?: string;
  destinationUid?: string;
}): Promise<string> => {
  const keypair = await loadKeypairFromSecureStore(senderUid);
  if (!keypair) throw new Error("Wallet keypair not found");

  // Preflight: an account can only hold/send the asset with a trustline, but
  // createWallet doesn't establish one — repair on the fly instead of letting
  // Horizon reject with op_src_no_trust / op_no_trust. Must happen before
  // loadAccount below, since the trustline tx bumps the sequence number.
  if (asset === "USDC") {
    if (!(await checkUSDCTrustlineExists(senderPublicKey))) {
      console.log(`Sender missing ${USDC_ASSET.code} trustline — creating it`);
      await setupUSDCTrustline(senderUid, senderPublicKey);
    }
    if (!(await checkUSDCTrustlineExists(destinationAddress))) {
      // Sandbox-only convenience: wallet keys are backed up to Firestore for
      // cross-device testing, so we can establish the recipient's trustline
      // on their behalf too.
      if (!destinationUid) {
        throw new Error(
          "The recipient's wallet can't receive USD yet. Ask them to open StellarPay once, then retry."
        );
      }
      console.log(`Recipient missing ${USDC_ASSET.code} trustline — creating it`);
      await setupUSDCTrustline(destinationUid, destinationAddress);
    }
  }

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

  console.log("SENDING:", { senderUid, senderPublicKey, destinationAddress, amount, asset });
  const tx = txBuilder.setTimeout(30).build();
  tx.sign(keypair);

  return submitTxToHorizon(tx);
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

  return submitTxToHorizon(tx);
};

// ── Query available paths before sending ─────────────────────────────

export const findPaymentPaths = async (
  sourcePublicKey: string,
  destAddress: string,
  destAsset: "XLM" | "USDC",
  destAmount: string
) => {
  const response = await fetch(
    `${ACTIVE_NETWORK.horizonUrl}/paths/strict-receive?source_account=${sourcePublicKey}&destination_asset_type=${destAsset === "XLM" ? "native" : "credit_alphanum4"}&destination_asset_code=${destAsset === "XLM" ? "" : USDC_ASSET.code}&destination_asset_issuer=${destAsset === "XLM" ? "" : USDC_ASSET.issuer}&destination_amount=${destAmount}`
  );
  return response.json();
};
