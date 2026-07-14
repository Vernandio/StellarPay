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
import { ACTIVE_NETWORK, BASE_FEE } from "../../constants/stellar";
import { SPLIT_BILL_CONTRACT_ID, USDC_TOKEN_CONTRACT_ID } from "../../constants/contracts";

// Soroban RPC endpoint (testnet)
const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org:443";

/**
 * Get a SorobanRpc.Server instance for preparing/simulating transactions.
 */
const getRpcServer = () => new rpc.Server(SOROBAN_RPC_URL);

/**
 * Submit a signed Soroban transaction via raw fetch to bypass Hermes issues.
 */
const submitSorobanTx = async (
  signedTx: any
): Promise<{ hash: string; resultXdr: string }> => {
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

  // Poll for transaction status until confirmed
  const txHash = data.result.hash;
  let status = data.result.status;
  let resultXdr = "";

  // If not immediately confirmed, poll
  while (status === "PENDING" || status === "NOT_FOUND") {
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
      resultXdr = pollData.result.resultXdr || "";
      break;
    } else if (status === "FAILED") {
      throw new Error(
        `Soroban transaction failed: ${JSON.stringify(pollData.result)}`
      );
    }
  }

  return { hash: txHash, resultXdr };
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

  const server = getRpcServer();
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
  const sourceAccount = await server.getAccount(publicKey);

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
  const simResult = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(
      `Simulation failed: ${(simResult as any).error || "unknown error"}`
    );
  }

  // Assemble the transaction with the simulation results
  const assembledTx = rpc.assembleTransaction(tx, simResult).build();

  // Sign
  assembledTx.sign(keypair);

  // Submit
  const { hash, resultXdr } = await submitSorobanTx(assembledTx);

  // Parse the returned bill_id from the result XDR
  let billId = 0;
  try {
    if (resultXdr) {
      const result = xdr.TransactionResult.fromXDR(resultXdr, "base64");
      const opResults = result.result().results();
      if (opResults && opResults.length > 0) {
        const tr = opResults[0].tr();
        if (tr) {
          const invokeHostFnResult = tr.invokeHostFunctionResult();
          if (invokeHostFnResult) {
            const successBuffer = invokeHostFnResult.success();
            if (successBuffer) {
              const scVal = xdr.ScVal.fromXDR(successBuffer);
              const nativeVal = scValToNative(scVal);
              billId = typeof nativeVal === "bigint" ? Number(nativeVal) : Number(nativeVal || 0);
              console.log("Parsed bill ID from transaction result:", billId);
            }
          }
        }
      }
    }
  } catch (parseErr) {
    console.warn("Could not parse bill ID from result XDR:", parseErr);
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

  const server = getRpcServer();
  const contract = new Contract(SPLIT_BILL_CONTRACT_ID);

  const scBillId = nativeToScVal(billId, { type: "u64" });
  const scParticipant = nativeToScVal(Address.fromString(publicKey), {
    type: "address",
  });

  const sourceAccount = await server.getAccount(publicKey);

  let tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: ACTIVE_NETWORK.networkPassphrase,
  })
    .addOperation(contract.call("pay_share", scBillId, scParticipant))
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(
      `Simulation failed: ${(simResult as any).error || "unknown error"}`
    );
  }

  const assembledTx = rpc.assembleTransaction(tx, simResult).build();
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

  const server = getRpcServer();
  const contract = new Contract(SPLIT_BILL_CONTRACT_ID);

  const scBillId = nativeToScVal(billId, { type: "u64" });

  const sourceAccount = await server.getAccount(publicKey);

  let tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: ACTIVE_NETWORK.networkPassphrase,
  })
    .addOperation(contract.call("claim_funds", scBillId))
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(
      `Simulation failed: ${(simResult as any).error || "unknown error"}`
    );
  }

  const assembledTx = rpc.assembleTransaction(tx, simResult).build();
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

  const server = getRpcServer();
  const contract = new Contract(SPLIT_BILL_CONTRACT_ID);

  const scBillId = nativeToScVal(billId, { type: "u64" });
  const scParticipant = nativeToScVal(Address.fromString(publicKey), {
    type: "address",
  });

  const sourceAccount = await server.getAccount(publicKey);

  let tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: ACTIVE_NETWORK.networkPassphrase,
  })
    .addOperation(contract.call("refund", scBillId, scParticipant))
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(
      `Simulation failed: ${(simResult as any).error || "unknown error"}`
    );
  }

  const assembledTx = rpc.assembleTransaction(tx, simResult).build();
  assembledTx.sign(keypair);

  const { hash } = await submitSorobanTx(assembledTx);
  return hash;
};
