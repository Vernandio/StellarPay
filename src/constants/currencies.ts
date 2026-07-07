// ── Supported Currencies ──────────────────────────────────────────────
// Target currencies for StellarPay hackathon (SEA region focus)
// Rates here are fallback defaults — live rates come from exchangeRates.ts
// ──────────────────────────────────────────────────────────────────────

export interface Currency {
  symbol: string;
  code: string;
  name: string;
  flag: string;
  /** Decimal places for display formatting */
  decimals: number;
}

export const CURRENCIES: Currency[] = [
  { symbol: "$",  code: "USD", name: "US Dollar",         flag: "🇺🇸", decimals: 2 },
  { symbol: "Rp", code: "IDR", name: "Indonesian Rupiah", flag: "🇮🇩", decimals: 0 },
  { symbol: "₱",  code: "PHP", name: "Philippine Peso",   flag: "🇵🇭", decimals: 2 },
  { symbol: "₫",  code: "VND", name: "Vietnamese Dong",   flag: "🇻🇳", decimals: 0 },
  { symbol: "S$", code: "SGD", name: "Singapore Dollar",  flag: "🇸🇬", decimals: 2 },
  { symbol: "RM", code: "MYR", name: "Malaysian Ringgit", flag: "🇲🇾", decimals: 2 },
];

/** Get currency config by code */
export const getCurrencyByCode = (code: string): Currency =>
  CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];
