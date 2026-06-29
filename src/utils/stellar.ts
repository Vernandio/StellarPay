import { TransactionBuilder, BASE_FEE, Memo } from "@stellar/stellar-sdk";
import { ACTIVE_NETWORK, APP_MEMO_PREFIX } from "../constants/stellar";
import { loadAccount } from "../services/stellar/client";

// ── TX Builder Helpers ────────────────────────────────────────────────

export const createTxBuilder = async (sourcePublicKey: string) => {
  const account = await loadAccount(sourcePublicKey);
  return new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: ACTIVE_NETWORK.networkPassphrase,
  });
};

export const createAppMemo = (text: string): Memo => {
  const memoText = `${APP_MEMO_PREFIX}${text}`.substring(0, 28);
  return Memo.text(memoText);
};

// Convert stroops to XLM
export const stroopsToXLM = (stroops: string | number): string => {
  const num = typeof stroops === "string" ? parseInt(stroops, 10) : stroops;
  return (num / 10_000_000).toFixed(7);
};

// Convert XLM to stroops
export const xlmToStroops = (xlm: string | number): string => {
  const num = typeof xlm === "string" ? parseFloat(xlm) : xlm;
  return Math.floor(num * 10_000_000).toString();
};
