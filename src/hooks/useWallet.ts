import { useEffect, useCallback } from "react";
import { useWalletStore } from "../store/walletStore";
import { useAuthStore } from "../store/authStore";
import { getXLMBalance, getUSDCBalance } from "../services/stellar/client";
import { getWallet } from "../services/firebase/firestore";

export const useWallet = () => {
  const { 
    publicKey, xlmBalance, usdcBalance, isLoadingBalance, 
    displayCurrencyCode, setPublicKey, setBalances, setLoadingBalance, setDisplayCurrencyCode 
  } = useWalletStore();
  const { user, profile } = useAuthStore();

  // Load wallet public key from profile
  useEffect(() => {
    if (profile?.stellarPublicKey) {
      setPublicKey(profile.stellarPublicKey);
    }
  }, [profile]);

  // Refresh balances from Horizon
  const refreshBalances = useCallback(async () => {
    if (!publicKey) return;
    setLoadingBalance(true);
    try {
      const [xlm, usdc] = await Promise.all([
        getXLMBalance(publicKey),
        getUSDCBalance(publicKey),
      ]);
      setBalances(xlm, usdc);
    } catch (error) {
      console.error("Failed to refresh balances:", error);
    } finally {
      setLoadingBalance(false);
    }
  }, [publicKey]);

  // Auto-refresh on mount and when publicKey changes
  useEffect(() => {
    refreshBalances();
  }, [refreshBalances]);

  return { 
    publicKey, xlmBalance, usdcBalance, isLoadingBalance, 
    displayCurrencyCode, setDisplayCurrencyCode, refreshBalances 
  };
};
