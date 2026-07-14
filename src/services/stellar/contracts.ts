// ── Soroban Contract Invocation Helpers ───────────────────────────────
// Provides TypeScript wrappers for calling the on-chain Split Bill
// Escrow smart contract from the React Native frontend.
//
// WHY raw fetch instead of server.sendTransaction():
//   Same Hermes engine issues as in payments.ts — the SDK's internal
//   submission pipeline corrupts Uint8Array → base64 and drops
//   URLSearchParams bodies.
// ──────────────────────────────────────────────────────────────────────

import {
  Contract,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  Address,
  xdr,
  rpc,
} from "@stellar/stellar-sdk";
import { Buffer } from "buffer";
import { loadKeypairFromSecureStore } from "./wallet";
import { loadAccount } from "./client";
import { ACTIVE_NETWORK, BASE_FEE } from "../../constants/stellar";
import { SPLIT_BILL_CONTRACT_ID, USDC_TOKEN_CONTRACT_ID } from "../../constants/contracts";

// Soroban RPC endpoint (testnet)
const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org:443";

/**
 * Simulate a transaction via raw fetch.
 *
 * WHY not rpc.Server.simulateTransaction()/getAccount(): under Hermes the
 * SDK's request pipeline corrupts the base64-encoded XDR it sends (same
 * issue as payments.ts) — getAccount() then reports existing accounts as
 * "Account not found". Accounts are loaded from Horizon (plain GET) and
 * simulation goes through fetch with Buffer-built base64.
 *
 * @returns the raw simulation response, consumable by rpc.assembleTransaction
 */
const simulateSorobanTx = async (tx: any): Promise<any> => {
  const xdrBase64 = Buffer.from(tx.toEnvelope().toXDR()).toString("base64");

  const response = await fetch(SOROBAN_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "simulateTransaction",
      params: { transaction: xdrBase64 },
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`Simulation RPC error: ${JSON.stringify(data.error)}`);
  }
  if (data.result.error) {
    throw new Error(`Simulation failed: ${data.result.error}`);
  }

  return data.result;
};

/**
 * Extract the Soroban host-function return value from a transaction's
 * result meta XDR.
 *
 * WHY meta and not resultXdr: InvokeHostFunctionResult.success() only
 * carries the SHA-256 *hash* of the return value — the actual ScVal
 * lives in TransactionMeta.sorobanMeta().returnValue().
 */
const parseReturnValue = (resultMetaXdr: string): xdr.ScVal | null => {
  try {
    const meta = xdr.TransactionMeta.fromXDR(resultMetaXdr, "base64");
    switch (meta.switch()) {
      case 3:
        return meta.v3().sorobanMeta()?.returnValue() ?? null;
      case 4:
        // Protocol 23+ meta format
        return (meta as any).v4().sorobanMeta()?.returnValue() ?? null;
      default:
        return null;
    }
  } catch (err) {
    console.warn("Could not parse Soroban return value from meta XDR:", err);
    return null;
  }
};

/**
 * Submit a signed Soroban transaction via raw fetch to bypass Hermes issues.
 */
const submitSorobanTx = async (
  signedTx: any
): Promise<{ hash: string; returnValue: xdr.ScVal | null }> => {
  const xdrBase64 = Buffer.from(signedTx.toEnvelope().toXDR()).toString("base64");

  const response = await fetch(SOROBAN_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "sendTransaction",
      params: { transaction: xdrBase64 },
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`Soroban RPC error: ${JSON.stringify(data.error)}`);
  }

  if (data.result.status === "ERROR") {
    throw new Error(
      `Transaction rejected by network: ${data.result.errorResultXdr || JSON.stringify(data.result)}`
    );
  }

  // Poll for transaction status until confirmed
  const txHash = data.result.hash;
  let status = data.result.status;
  let returnValue: xdr.ScVal | null = null;

  // If not immediately confirmed, poll (max ~60s)
  let attempts = 0;
  while (status === "PENDING" || status === "NOT_FOUND" || status === "TRY_AGAIN_LATER") {
    if (++attempts > 30) {
      throw new Error(`Transaction confirmation timed out (hash: ${txHash})`);
    }
    await new Promise((r) => setTimeout(r, 2000));

    const pollResp = await fetch(SOROBAN_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: { hash: txHash },
      }),
    });

    const pollData = await pollResp.json();
    status = pollData.result.status;

    if (status === "SUCCESS") {
      if (pollData.result.resultMetaXdr) {
        returnValue = parseReturnValue(pollData.result.resultMetaXdr);
      }
      break;
    } else if (status === "FAILED") {
      throw new Error(
        `Soroban transaction failed: ${JSON.stringify(pollData.result)}`
      );
    }
  }

  return { hash: txHash, returnValue };
};

// ── Public API ───────────────────────────────────────────────────────

/**
 * Creates a new on-chain split bill escrow session.
 *
 * @param uid          - Firebase user ID for loading keypair from SecureStore
 * @param publicKey    - Organizer's Stellar public key
 * @param participants - Array of participant Stellar public keys
 * @param amounts      - Array of amounts each participant owes (in stroops / smallest unit)
 * @param deadlineSec  - Unix timestamp in seconds when the bill expires
 * @returns bill ID and transaction hash
 */
export const createOnChainBill = async (
  uid: string,
  publicKey: string,
  participants: string[],
  amounts: number[],
  deadlineSec: number
): Promise<{ billId: number; txHash: string }> => {
  if (!SPLIT_BILL_CONTRACT_ID) {
    throw new Error(
      "SPLIT_BILL_CONTRACT_ID is not configured. Deploy the contract first."
    );
  }

  const keypair = await loadKeypairFromSecureStore(uid);
  if (!keypair) throw new Error("Stellar keypair not found in SecureStore");

  const contract = new Contract(SPLIT_BILL_CONTRACT_ID);

  // Build Soroban-compatible ScVal arguments
  const scOrganizer = nativeToScVal(Address.fromString(publicKey), {
    type: "address",
  });
  const scToken = nativeToScVal(
    Address.fromString(USDC_TOKEN_CONTRACT_ID),
    { type: "address" }
  );
  const scParticipants = xdr.ScVal.scvVec(
    participants.map((p) =>
      nativeToScVal(Address.fromString(p), { type: "address" })
    )
  );
  const scAmounts = xdr.ScVal.scvVec(
    amounts.map((a) => nativeToScVal(a, { type: "i128" }))
  );
  const scDeadline = nativeToScVal(deadlineSec, { type: "u64" });

  // Fetch the source account from Horizon for sequence number
  const sourceAccount = await loadAccount(publicKey);

  // Build the contract invocation transaction
  let tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: ACTIVE_NETWORK.networkPassphrase,
  })
    .addOperation(
      contract.call(
        "create_bill",
        scOrganizer,
        scToken,
        scParticipants,
        scAmounts,
        scDeadline
      )
    )
    .setTimeout(30)
    .build();

  // Simulate to get the correct resource footprint and fees
  const rawSim = await simulateSorobanTx(tx);

  // Assemble the transaction with the simulation results
  const assembledTx = rpc.assembleTransaction(tx, rawSim).build();

  // Sign
  assembledTx.sign(keypair);

  // Submit
  const { hash, returnValue } = await submitSorobanTx(assembledTx);

  // Parse the returned bill_id — prefer the on-chain return value, fall
  // back to the simulation's retval (same counter read pre-submission).
  let billId = 0;
  try {
    const parsedSim: any = rpc.parseRawSimulation(rawSim);
    const scVal = returnValue ?? parsedSim.result?.retval ?? null;
    if (scVal) {
      const nativeVal = scValToNative(scVal);
      billId = Number(nativeVal || 0);
      console.log("Parsed on-chain bill ID:", billId);
    }
  } catch (parseErr) {
    console.warn("Could not parse bill ID from return value:", parseErr);
  }

  if (!billId) {
    throw new Error(
      `Bill was created on-chain (tx ${hash}) but the bill ID could not be determined.`
    );
  }

  return { billId, txHash: hash };
};

/**
 * Pays a participant's share into the on-chain escrow.
 *
 * @param uid         - Firebase user ID for loading keypair
 * @param publicKey   - Participant's Stellar public key
 * @param billId      - The on-chain bill ID
 * @returns transaction hash
 */
export const payOnChainShare = async (
  uid: string,
  publicKey: string,
  billId: number
): Promise<string> => {
  if (!SPLIT_BILL_CONTRACT_ID) {
    throw new Error(
      "SPLIT_BILL_CONTRACT_ID is not configured. Deploy the contract first."
    );
  }

  const keypair = await loadKeypairFromSecureStore(uid);
  if (!keypair) throw new Error("Stellar keypair not found in SecureStore");

  const contract = new Contract(SPLIT_BILL_CONTRACT_ID);

  const scBillId = nativeToScVal(billId, { type: "u64" });
  const scParticipant = nativeToScVal(Address.fromString(publicKey), {
    type: "address",
  });

  const sourceAccount = await loadAccount(publicKey);

  let tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: ACTIVE_NETWORK.networkPassphrase,
  })
    .addOperation(contract.call("pay_share", scBillId, scParticipant))
    .setTimeout(30)
    .build();

  const rawSim = await simulateSorobanTx(tx);
  const assembledTx = rpc.assembleTransaction(tx, rawSim).build();
  assembledTx.sign(keypair);

  const { hash } = await submitSorobanTx(assembledTx);
  return hash;
};

/**
 * Allows the organizer to claim all collected funds from a completed bill.
 *
 * @param uid       - Firebase user ID for loading keypair
 * @param publicKey - Organizer's Stellar public key
 * @param billId    - The on-chain bill ID
 * @returns transaction hash
 */
export const claimOnChainFunds = async (
  uid: string,
  publicKey: string,
  billId: number
): Promise<string> => {
  if (!SPLIT_BILL_CONTRACT_ID) {
    throw new Error("SPLIT_BILL_CONTRACT_ID is not configured.");
  }

  const keypair = await loadKeypairFromSecureStore(uid);
  if (!keypair) throw new Error("Stellar keypair not found in SecureStore");

  const contract = new Contract(SPLIT_BILL_CONTRACT_ID);

  const scBillId = nativeToScVal(billId, { type: "u64" });

  const sourceAccount = await loadAccount(publicKey);

  let tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: ACTIVE_NETWORK.networkPassphrase,
  })
    .addOperation(contract.call("claim_funds", scBillId))
    .setTimeout(30)
    .build();

  const rawSim = await simulateSorobanTx(tx);
  const assembledTx = rpc.assembleTransaction(tx, rawSim).build();
  assembledTx.sign(keypair);

  const { hash } = await submitSorobanTx(assembledTx);
  return hash;
};

/**
 * Allows a participant to refund their share from an expired bill.
 *
 * @param uid         - Firebase user ID for loading keypair
 * @param publicKey   - Participant's Stellar public key
 * @param billId      - The on-chain bill ID
 * @returns transaction hash
 */
export const refundOnChainShare = async (
  uid: string,
  publicKey: string,
  billId: number
): Promise<string> => {
  if (!SPLIT_BILL_CONTRACT_ID) {
    throw new Error("SPLIT_BILL_CONTRACT_ID is not configured.");
  }

  const keypair = await loadKeypairFromSecureStore(uid);
  if (!keypair) throw new Error("Stellar keypair not found in SecureStore");

  const contract = new Contract(SPLIT_BILL_CONTRACT_ID);

  const scBillId = nativeToScVal(billId, { type: "u64" });
  const scParticipant = nativeToScVal(Address.fromString(publicKey), {
    type: "address",
  });

  const sourceAccount = await loadAccount(publicKey);

  let tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: ACTIVE_NETWORK.networkPassphrase,
  })
    .addOperation(contract.call("refund", scBillId, scParticipant))
    .setTimeout(30)
    .build();

  const rawSim = await simulateSorobanTx(tx);
  const assembledTx = rpc.assembleTransaction(tx, rawSim).build();
  assembledTx.sign(keypair);

  const { hash } = await submitSorobanTx(assembledTx);
  return hash;
};
