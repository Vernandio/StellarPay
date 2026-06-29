import { Asset } from "@stellar/stellar-sdk";
import { USDC_ASSET } from "../../constants/stellar";

// ── Asset helpers ─────────────────────────────────────────────────────

export const getUSDCAsset = (): Asset =>
  new Asset(USDC_ASSET.code, USDC_ASSET.issuer);

export const getXLMAsset = (): Asset =>
  Asset.native();

export const SUPPORTED_ASSETS = {
  XLM: {
    code: "XLM",
    name: "Stellar Lumens",
    icon: "star",
    decimals: 7,
    getAsset: getXLMAsset,
  },
  USDC: {
    code: "USDC",
    name: "USD Coin",
    icon: "dollar-sign",
    decimals: 2,
    getAsset: getUSDCAsset,
  },
} as const;

export type SupportedAssetCode = keyof typeof SUPPORTED_ASSETS;
