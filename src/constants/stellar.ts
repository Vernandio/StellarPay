// Network configuration
export const STELLAR_NETWORK = {
  TESTNET: {
    networkPassphrase: "Test SDF Network ; September 2015",
    horizonUrl: "https://horizon-testnet.stellar.org",
    friendbotUrl: "https://friendbot.stellar.org",
  },
  MAINNET: {
    networkPassphrase: "Public Global Stellar Network ; September 2015",
    horizonUrl: "https://horizon.stellar.org",
    friendbotUrl: null,
  },
} as const;

// Always use testnet during hackathon
export const ACTIVE_NETWORK = STELLAR_NETWORK.TESTNET;

// USDC on Stellar testnet (Circle issuer)
export const USDC_ASSET = {
  code: "USDC",
  issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
} as const;

// Minimum XLM balance to keep in account (Stellar requires this)
export const MIN_XLM_RESERVE = "2"; // 2 XLM minimum

// Base fee for transactions (in stroops, 100 stroops = 0.00001 XLM)
export const BASE_FEE = "100";

// Default memo prefix for StellarPay transactions
export const APP_MEMO_PREFIX = "SP:";
