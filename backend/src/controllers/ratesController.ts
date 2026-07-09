import { Request, Response } from "express";

interface CachedRates {
  rates: { [key: string]: number };
  fetchedAt: number;
}

let cache: CachedRates | null = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export const getRates = async (req: Request, res: Response) => {
  const now = Date.now();

  // If cache exists and is fresh, return cached rates
  if (cache && now - cache.fetchedAt < CACHE_DURATION_MS) {
    return res.status(200).json({
      rates: cache.rates,
      cached: true,
      fetchedAt: cache.fetchedAt,
    });
  }

  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!response.ok) {
      throw new Error(`Rates API returned status ${response.status}`);
    }

    const data = await response.json();
    if (!data.rates) {
      throw new Error("Invalid response format from Rates API");
    }

    // Update in-memory cache
    cache = {
      rates: data.rates,
      fetchedAt: now,
    };

    return res.status(200).json({
      rates: data.rates,
      cached: false,
      fetchedAt: now,
    });
  } catch (error: any) {
    console.error("Rates fetch error:", error);

    // Fallback to stale cache if API fails
    if (cache) {
      return res.status(200).json({
        rates: cache.rates,
        cached: true,
        fetchedAt: cache.fetchedAt,
        staleFallback: true,
      });
    }

    // Absolute fallback rates matching target currencies if no cache exists
    const fallbackRates = {
      USD: 1,
      IDR: 16350,
      PHP: 56.2,
      VND: 25450,
      SGD: 1.34,
      MYR: 4.72,
    };

    return res.status(200).json({
      rates: fallbackRates,
      cached: false,
      fallback: true,
      error: error.message || "Failed to fetch rates",
    });
  }
};
