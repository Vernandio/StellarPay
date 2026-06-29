// ─────────────────────────────────────────────────────────────────────
// Soroban Smart Contract Client — Sprint 2 stretch goal
//
// Soroban is Stellar's smart contract platform (Rust contracts).
// For StellarPay MVP, all features use native Stellar operations.
// This file is scaffolded for Sprint 2 if conditional escrow is added.
//
// Relevant docs:
// - https://developers.stellar.org/docs/smart-contracts
// - https://developers.stellar.org/docs/build/guides/soroban-rpc
// ─────────────────────────────────────────────────────────────────────

import { rpc, Contract, TransactionBuilder, BASE_FEE } from "@stellar/stellar-sdk";
import { ACTIVE_NETWORK } from "../../constants/stellar";

const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";

export const getSorobanServer = () =>
  new rpc.Server(SOROBAN_RPC_URL, { allowHttp: false });

// Placeholder for deployed escrow contract ID (set when contract is deployed)
export const ESCROW_CONTRACT_ID = ""; // TODO: Deploy contract and set ID in Sprint 2
