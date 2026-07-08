import { useState, useEffect, useCallback } from "react";
import { getPaymentHistory } from "../services/stellar/client";
import { useWalletStore } from "../store/walletStore";
import { useAuthStore } from "../store/authStore";
import { getRecentTransactions, TransactionRecord } from "../services/firebase/transactions";
import { USDC_ASSET } from "../constants/stellar";

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

          const assetCode = record.asset_type === "native" ? "XLM" : record.asset_code;
          const amountFormatted = parseFloat(record.amount).toFixed(2);
          
          const prefix = isPositive ? "+" : "-";
          const amountPrimary = `${prefix} ${amountFormatted} ${assetCode}`;

          // Check if we have beautiful P2P names from Firestore
          const dbRecord = firestoreMap.get(record.transaction_hash);
          let title = "";
          let amountSecondary: string | undefined;

          if (dbRecord) {
            if (isSender && !isReceiver) {
              title = dbRecord.receiverDisplayName || `@${dbRecord.receiverUsername}`;
            } else if (isReceiver && !isSender) {
              title = dbRecord.senderDisplayName || `@${dbRecord.senderUsername}`;
            } else {
              title = "Swap";
            }

            // Display localized currency conversions if not USD
            if (dbRecord.displayCurrency && dbRecord.displayCurrency !== "USD") {
              const formattedLocal = parseFloat(dbRecord.displayAmount).toLocaleString(undefined, {
                minimumFractionDigits: dbRecord.displayCurrency === "VND" || dbRecord.displayCurrency === "IDR" ? 0 : 2,
                maximumFractionDigits: dbRecord.displayCurrency === "VND" || dbRecord.displayCurrency === "IDR" ? 0 : 2,
              });
              amountSecondary = `${prefix} ${dbRecord.displayCurrency} ${formattedLocal}`;
            } else {
              amountSecondary = `${prefix} $${parseFloat(dbRecord.amountUSD).toFixed(2)}`;
            }
          } else {
            // Fallback for anchor deposits/withdrawals and direct Horizon transfers
            if (isSender && isReceiver) {
              title = "Swap Asset";
            } else if (isReceiver) {
              // Check if from anchor/issuer
              if (record.from === USDC_ASSET.issuer) {
                title = "Funds Deposited";
              } else {
                title = `From ${record.from.substring(0, 4)}...${record.from.substring(52)}`;
              }
            } else {
              if (record.to === USDC_ASSET.issuer) {
                title = "Funds Withdrawn";
              } else {
                title = `To ${record.to.substring(0, 4)}...${record.to.substring(52)}`;
              }
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
            memo: dbRecord?.memo,
            destinationAddress: isSender ? record.to : undefined,
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

  return { activities, isLoading, fetchTransactions };
};
