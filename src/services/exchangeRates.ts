// ── Exchange Rate Service ─────────────────────────────────────────────
// Fetches real-time USD conversion rates from open.er-api.com
// Supports: USD, IDR, PHP, VND, SGD, MYR
// ──────────────────────────────────────────────────────────────────────
import { API_BASE } from "./api/client";

export interface ExchangeRates {
  USD: number;
  IDR: number;
  PHP: number;
  VND: number;
  SGD: number;
  MYR: number;
}

/** Currencies we actively support in the app */
export const SUPPORTED_CURRENCY_CODES: (keyof ExchangeRates)[] = [
  "USD", "IDR", "PHP", "VND", "SGD", "MYR",
];

/** Local fallback rates (approximate) used when API is unreachable */
const FALLBACK_RATES: ExchangeRates = {
  USD: 1,
  IDR: 16350,
  PHP: 56.2,
  VND: 25450,
  SGD: 1.34,
  MYR: 4.72,
};

let cachedRates: ExchangeRates = { ...FALLBACK_RATES };
let lastFetchedAt: number = 0;

/** Cache duration: 5 minutes */
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Fetch latest exchange rates from open.er-api.com.
 * Results are cached for 5 minutes to minimize network calls.
 * Falls back to hardcoded rates if the API is unreachable.
 */
export const fetchExchangeRates = async (): Promise<ExchangeRates> => {
  const now = Date.now();

  // Return cached rates if still fresh
  if (now - lastFetchedAt < CACHE_TTL_MS && lastFetchedAt > 0) {
    return cachedRates;
  }

  try {
    const response = await fetch(`${API_BASE}/api/rates`);
    const data = await response.json();

    if (data.rates) {
      const newRates: ExchangeRates = {
        USD: 1,
        IDR: data.rates.IDR ?? FALLBACK_RATES.IDR,
        PHP: data.rates.PHP ?? FALLBACK_RATES.PHP,
        VND: data.rates.VND ?? FALLBACK_RATES.VND,
        SGD: data.rates.SGD ?? FALLBACK_RATES.SGD,
        MYR: data.rates.MYR ?? FALLBACK_RATES.MYR,
      };

      cachedRates = newRates;
      lastFetchedAt = now;
      return newRates;
    }

    // API returned but with unexpected shape
    console.warn("Exchange rate backend API returned unexpected shape:", data);
    return cachedRates;
  } catch (error) {
    console.warn("Failed to fetch exchange rates from backend, using cached/fallback:", error);
    return cachedRates;
  }
};

/**
 * Convert a USD amount to the target currency.
 * Returns the converted amount as a formatted string.
 */
export const convertUSDTo = (
  usdAmount: number,
  targetCurrency: keyof ExchangeRates,
  rates: ExchangeRates
): string => {
  if (targetCurrency === "USD") return usdAmount.toFixed(2);

  const rate = rates[targetCurrency];
  const converted = usdAmount * rate;

  // Use Intl.NumberFormat for proper locale formatting
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: targetCurrency === "VND" || targetCurrency === "IDR" ? 0 : 2,
    maximumFractionDigits: targetCurrency === "VND" || targetCurrency === "IDR" ? 0 : 2,
  }).format(converted);
};

/**
 * Convert a local currency amount back to USD.
 * Returns the USD equivalent as a string with 7 decimal places (Stellar precision).
 */
export const convertToUSD = (
  localAmount: number,
  sourceCurrency: keyof ExchangeRates,
  rates: ExchangeRates
): string => {
  if (sourceCurrency === "USD") return localAmount.toFixed(7);

  const rate = rates[sourceCurrency];
  return (localAmount / rate).toFixed(7);
};

/**
 * Format rate display text.
 * Example: "1 USD = 16,350 IDR"
 */
export const formatRateDisplay = (
  targetCurrency: keyof ExchangeRates,
  rates: ExchangeRates
): string => {
  if (targetCurrency === "USD") return "";

  const rate = rates[targetCurrency];
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: rate < 10 ? 4 : rate < 100 ? 2 : 0,
    maximumFractionDigits: rate < 10 ? 4 : rate < 100 ? 2 : 0,
  }).format(rate);

  return `1 USD = ${formatted} ${targetCurrency}`;
};
