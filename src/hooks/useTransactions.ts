import { useState, useEffect, useCallback } from "react";
import { getPaymentHistory, streamPayments } from "../services/stellar/client";
import { useWalletStore } from "../store/walletStore";
import { useAuthStore } from "../store/authStore";
import { getRecentTransactions, TransactionRecord } from "../services/firebase/transactions";
import { USDC_ASSET } from "../constants/stellar";
import { getUserByPublicKey, UserProfile } from "../services/firebase/firestore";

export type ActivityType = "sent" | "received" | "swap";

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  time: string;
  amountPrimary: string;
  amountSecondary?: string;
  icon: any;
  isPositive: boolean;
  dateSection: string;
  extra?: string;
  hash?: string;
  memo?: string;
  destinationAddress?: string;
  date: string;
}

export const useTransactions = () => {
  const { publicKey } = useWalletStore();
  const { user } = useAuthStore();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTransactions = useCallback(async () => {
    if (!publicKey) return;
    setIsLoading(true);
    try {
      // 1. Load blockchain history
      const response = await getPaymentHistory(publicKey, 50);
      const records = response.records;

      // 2. Load Firestore P2P transaction mappings for display names
      let firestoreTxs: TransactionRecord[] = [];
      if (user?.uid) {
        try {
          firestoreTxs = await getRecentTransactions(user.uid);
        } catch (fErr) {
          console.warn("Failed to load transactions from Firestore in hook:", fErr);
        }
      }

      // Map tx hash to firestore records
      const firestoreMap = new Map<string, TransactionRecord>();
      firestoreTxs.forEach((tx) => {
        if (tx.hash) firestoreMap.set(tx.hash, tx);
      });

      // 3. Identify unique public keys to resolve dynamically from Firestore (for blockchain-only transactions)
      const keysToResolve = new Set<string>();
      records.forEach((record: any) => {
        if (record.type === "payment" || record.type === "path_payment_strict_send" || record.type === "path_payment_strict_receive") {
          const hasDbRecord = firestoreMap.has(record.transaction_hash);
          if (!hasDbRecord) {
            const otherKey = record.from === publicKey ? record.to : record.from;
            if (otherKey && otherKey !== publicKey && otherKey !== USDC_ASSET.issuer) {
              keysToResolve.add(otherKey);
            }
          }
        }
      });

      // Fetch user profiles for all unique keys in parallel
      const resolvedUsersMap = new Map<string, UserProfile>();
      if (keysToResolve.size > 0) {
        await Promise.all(
          Array.from(keysToResolve).map(async (key) => {
            try {
              const profile = await getUserByPublicKey(key);
              if (profile) {
                resolvedUsersMap.set(key, profile);
              }
            } catch (e) {
              console.warn(`Failed to resolve profile for key ${key}:`, e);
            }
          })
        );
      }

      const parsed: Activity[] = records
        .filter((r: any) => r.type === "payment" || r.type === "path_payment_strict_send" || r.type === "path_payment_strict_receive")
        .map((record: any) => {
          const isSender = record.from === publicKey;
          const isReceiver = record.to === publicKey;
          
          let type: ActivityType = "sent";
          let isPositive = false;
          let icon = "arrow-up-right";
          
          if (isSender && isReceiver) {
            type = "swap";
            isPositive = true;
            icon = "refresh-cw";
          } else if (isReceiver) {
            type = "received";
            isPositive = true;
            icon = "arrow-down-left";
          }

          const dateObj = new Date(record.created_at);
          const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          
          let dateSection = "Older";
          if (dateObj.toDateString() === today.toDateString()) {
            dateSection = "Today";
          } else if (dateObj.toDateString() === yesterday.toDateString()) {
            dateSection = "Yesterday";
          } else {
            dateSection = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
          }

          const amountFormatted = parseFloat(record.amount).toFixed(2);
          const prefix = isPositive ? "+" : "-";

          // Invisible-web3: everything is shown as money, never as a crypto
          // asset code. USDC is 1:1 USD; amountPrimary is either USD or converted display currency.
          let amountPrimary = `${prefix} $${amountFormatted}`;

          // Check if we have beautiful P2P names from Firestore
          const dbRecord = firestoreMap.get(record.transaction_hash);
          const otherKey = isSender ? record.to : record.from;
          const resolvedUser = resolvedUsersMap.get(otherKey);

          let title = "";
          let amountSecondary: string | undefined;

          if (dbRecord) {
            if (isSender && !isReceiver) {
              title = dbRecord.receiverDisplayName || `@${dbRecord.receiverUsername}`;
            } else if (isReceiver && !isSender) {
              title = dbRecord.senderDisplayName || `@${dbRecord.senderUsername}`;
            } else {
              title = "Exchange";
            }

            const usdStr = `${prefix} $${parseFloat(dbRecord.amountUSD).toFixed(2)}`;
            // Display localized currency conversions if not USD
            if (dbRecord.displayCurrency && dbRecord.displayCurrency !== "USD") {
              const formattedLocal = parseFloat(String(dbRecord.displayAmount).replace(/,/g, '')).toLocaleString(undefined, {
                minimumFractionDigits: dbRecord.displayCurrency === "VND" || dbRecord.displayCurrency === "IDR" ? 0 : 2,
                maximumFractionDigits: dbRecord.displayCurrency === "VND" || dbRecord.displayCurrency === "IDR" ? 0 : 2,
              });
              amountPrimary = `${prefix} ${dbRecord.displayCurrency} ${formattedLocal}`;
              amountSecondary = usdStr;
            } else {
              amountPrimary = usdStr;
            }
          } else if (resolvedUser) {
            // Dynamically resolved user from public key!
            title = resolvedUser.displayName || `@${resolvedUser.username}`;
          } else {
            // Fallback for anchor deposits/withdrawals and direct transfers
            if (isSender && isReceiver) {
              title = "Exchange";
            } else if (isReceiver) {
              title = record.from === USDC_ASSET.issuer ? "Money Added" : "Received";
            } else {
              title = record.to === USDC_ASSET.issuer ? "Money Withdrawn" : "Sent";
            }
          }

          let extra = record.transaction_hash.substring(0, 8);

          return {
            id: record.id,
            type,
            title,
            time,
            amountPrimary,
            amountSecondary,
            icon,
            isPositive,
            dateSection,
            extra,
            hash: record.transaction_hash,
            memo: dbRecord ? dbRecord.memo : "",
            destinationAddress: isSender ? record.to : undefined,
            date: record.created_at,
          };
        });

      setActivities(parsed);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, user?.uid]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Realtime transactions sync
  useEffect(() => {
    if (!publicKey) return;
    const unsubscribe = streamPayments(publicKey, (payment) => {
      console.log("New blockchain payment detected, refreshing transactions list...");
      fetchTransactions();
    });
    return () => {
      unsubscribe();
    };
  }, [publicKey, fetchTransactions]);

  return { activities, isLoading, fetchTransactions };
};
