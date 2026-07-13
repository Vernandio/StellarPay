import { useEffect, useCallback } from "react";
import { useWalletStore } from "../store/walletStore";
import { useAuthStore } from "../store/authStore";
import { getXLMBalance, getUSDCBalance, streamPayments } from "../services/stellar/client";
import { getWallet } from "../services/firebase/firestore";
import { doc, updateDoc } from "@firebase/firestore";
import { db } from "../services/firebase/config";

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
    } else {
      setPublicKey(null);
    }
  }, [profile?.stellarPublicKey]);

  // Sync display currency preference from DB, default to USD if not set
  useEffect(() => {
    if (profile?.displayCurrencyCode) {
      setDisplayCurrencyCode(profile.displayCurrencyCode);
    } else {
      setDisplayCurrencyCode("USD");
    }
  }, [profile?.displayCurrencyCode]);

  // Wrapped setter to update store and persist to Firestore
  const setDisplayCurrency = useCallback(async (code: string) => {
    setDisplayCurrencyCode(code);
    if (user?.uid) {
      try {
        await updateDoc(doc(db, "users", user.uid), {
          displayCurrencyCode: code,
        });
      } catch (err) {
        console.warn("Failed to save currency preference to Firestore:", err);
      }
    }
  }, [user?.uid]);

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

  // Realtime balance sync
  useEffect(() => {
    if (!publicKey) return;
    const unsubscribeStellar = streamPayments(publicKey, (payment) => {
      console.log("New blockchain payment detected, refreshing balance...");
      refreshBalances();
    });

    // Subscribing to Firestore notifications for reliable cross-device real-time balance sync
    let unsubscribeFirestore = () => {};
    if (user?.uid) {
      const { subscribeToNotifications } = require("../services/firebase/notifications");
      unsubscribeFirestore = subscribeToNotifications(user.uid, () => {
        console.log("New Firestore notification detected, refreshing balance...");
        refreshBalances();
      });
    }

    return () => {
      unsubscribeStellar();
      unsubscribeFirestore();
    };
  }, [publicKey, user?.uid, refreshBalances]);

  return { 
    publicKey, xlmBalance, usdcBalance, isLoadingBalance, 
    displayCurrencyCode, setDisplayCurrencyCode: setDisplayCurrency, refreshBalances 
  };
};
