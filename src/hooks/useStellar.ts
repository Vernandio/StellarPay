import { useState, useCallback } from "react";
import { useAuthStore } from "../store/authStore";
import { useWalletStore } from "../store/walletStore";
import { sendPayment, sendPathPayment, findPaymentPaths } from "../services/stellar/payments";
import { createWallet, setupUSDCTrustline } from "../services/stellar/wallet";
import { updateUserProfile, createWalletCache } from "../services/firebase/firestore";

export const useStellar = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, profile, setProfile } = useAuthStore();
  const { publicKey } = useWalletStore();

  const initializeWallet = useCallback(async () => {
    if (!user) throw new Error("User not authenticated");
    setIsProcessing(true);
    setError(null);
    try {
      const newPublicKey = await createWallet(user.uid);
      
      // Update Firestore user profile with new public key
      await updateUserProfile(user.uid, { stellarPublicKey: newPublicKey });
      
      // Initialize Firestore wallet balance cache
      await createWalletCache(user.uid, newPublicKey);
      
      // Update local authStore state to trigger reactive UI updates
      if (profile) {
        setProfile({ ...profile, stellarPublicKey: newPublicKey });
      }
      
      return newPublicKey;
    } catch (err: any) {
      setError(err.message || "Failed to create wallet");
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [user, profile, setProfile]);

  const send = useCallback(async (
    destinationAddress: string,
    amount: string,
    asset: "XLM" | "USDC" = "USDC",
    memo?: string
  ) => {
    if (!user || !publicKey) throw new Error("Wallet not initialized");
    setIsProcessing(true);
    setError(null);
    try {
      const hash = await sendPayment({
        senderUid: user.uid,
        senderPublicKey: publicKey,
        destinationAddress,
        amount,
        asset,
        memo,
      });
      return hash;
    } catch (err: any) {
      console.error("STELLAR ERR", err.response?.data?.extras?.result_codes || err); setError(err.message || "Payment failed");
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [user, publicKey]);

  const setupTrustline = useCallback(async () => {
    if (!user || !publicKey) throw new Error("Wallet not initialized");
    setIsProcessing(true);
    setError(null);
    try {
      const hash = await setupUSDCTrustline(user.uid, publicKey);
      return hash;
    } catch (err: any) {
      setError(err.message || "Failed to setup trustline");
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [user, publicKey]);

  return { isProcessing, error, initializeWallet, send, setupTrustline };
};
