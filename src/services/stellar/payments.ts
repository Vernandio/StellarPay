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
