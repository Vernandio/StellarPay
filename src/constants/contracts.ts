// ── Soroban Contract IDs ──────────────────────────────────────────────
// Store deployed contract addresses here after running `soroban contract deploy`
// These are Stellar contract IDs (start with 'C')
// ──────────────────────────────────────────────────────────────────────

/**
 * Split Bill Escrow Manager contract.
 *
 * Deploy with:
 *   soroban contract deploy \
 *     --wasm contracts/split_bill/target/wasm32-unknown-unknown/release/split_bill.wasm \
 *     --source dev_deployer --network testnet
 *
 * Then paste the resulting contract ID here.
 */
import { Asset } from "@stellar/stellar-sdk";
import { ACTIVE_NETWORK, USDC_ASSET } from "./stellar";

const getAssetContractId = () => {
  try {
    const asset = new Asset(USDC_ASSET.code, USDC_ASSET.issuer);
    return asset.contractId(ACTIVE_NETWORK.networkPassphrase);
  } catch (err) {
    // Fallback default Circle USDC on testnet
    return "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
  }
};

export const SPLIT_BILL_CONTRACT_ID =
  process.env.EXPO_PUBLIC_SPLIT_BILL_CONTRACT_ID || "CB5VWPNDBJUK2FB62WN56VPGIKZURCUE3LIIZWEQXKM7BRERSQ42CZGC";

export const USDC_TOKEN_CONTRACT_ID =
  process.env.EXPO_PUBLIC_USDC_TOKEN_CONTRACT_ID || getAssetContractId();
