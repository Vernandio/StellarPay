import { useState, useEffect, useCallback } from "react";
import { getPaymentHistory } from "../services/stellar/client";
import { useWalletStore } from "../store/walletStore";
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
}

export const useTransactions = () => {
  const { publicKey } = useWalletStore();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTransactions = useCallback(async () => {
    if (!publicKey) return;
    setIsLoading(true);
    try {
      const response = await getPaymentHistory(publicKey, 50);
      const records = response.records;

      const parsed: Activity[] = records
        .filter((r: any) => r.type === "payment" || r.type === "path_payment_strict_send" || r.type === "path_payment_strict_receive")
        .map((record: any) => {
          const isSender = record.from === publicKey;
          const isReceiver = record.to === publicKey;
          
          let type: ActivityType = "sent";
          let isPositive = false;
          let title = "Sent payment";
          let icon = "arrow-up-right";
          
          if (isSender && isReceiver) {
            type = "swap";
            isPositive = true;
            title = "Swap";
            icon = "refresh-cw";
          } else if (isReceiver) {
            type = "received";
            isPositive = true;
            title = "Received payment";
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

          // Basic extra info for demo if needed
          let extra = record.transaction_hash.substring(0, 8);

          return {
            id: record.id,
            type,
            title: isSender && !isReceiver ? `To ${record.to.substring(0, 4)}...${record.to.substring(52)}` : isReceiver && !isSender ? `From ${record.from.substring(0, 4)}...${record.from.substring(52)}` : "Swap",
            time,
            amountPrimary,
            icon,
            isPositive,
            dateSection,
            extra,
          };
        });

      setActivities(parsed);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return { activities, isLoading, fetchTransactions };
};
