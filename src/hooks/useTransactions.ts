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

/** Derive the "10:42 AM" time label and the "Today"/"Yesterday"/date section for a Date. */
const getDateParts = (dateObj: Date) => {
  const time = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let dateSection = "Older";
  if (dateObj.toDateString() === today.toDateString()) {
    dateSection = "Today";
  } else if (dateObj.toDateString() === yesterday.toDateString()) {
    dateSection = "Yesterday";
  } else {
    dateSection = dateObj.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  }

  return { time, dateSection };
};

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
        if (record.type === "payment" || record.type === "path_payment_strict_send" || record.type === "path_payment_strict_receive" || record.type === "create_account") {
          const hasDbRecord = firestoreMap.has(record.transaction_hash);
          if (!hasDbRecord) {
            const otherKey = record.type === "create_account"
              ? (record.funder === publicKey ? record.account : record.funder)
              : (record.from === publicKey ? record.to : record.from);
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
        .filter((r: any) => r.type === "payment" || r.type === "path_payment_strict_send" || r.type === "path_payment_strict_receive" || r.type === "create_account")
        .map((record: any) => {
          const isCreateAccount = record.type === "create_account";
          const isSender = isCreateAccount ? record.funder === publicKey : record.from === publicKey;
          const isReceiver = isCreateAccount ? record.account === publicKey : record.to === publicKey;
          
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
          const { time, dateSection } = getDateParts(dateObj);

          const amountVal = isCreateAccount ? record.starting_balance : record.amount;
          const amountFormatted = parseFloat(amountVal).toFixed(2);
          const prefix = isPositive ? "+" : "-";

          // Invisible-web3: everything is shown as money, never as a crypto
          // asset code. USDC is 1:1 USD; amountPrimary is either USD or converted display currency.
          let amountPrimary = `${prefix} $${amountFormatted}`;

          // Check if we have beautiful P2P names from Firestore
          const dbRecord = firestoreMap.get(record.transaction_hash);
          const otherKey = isSender 
            ? (isCreateAccount ? record.account : record.to) 
            : (isCreateAccount ? record.funder : record.from);
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
              title = "Stellar Deposit";
            } else {
              title = "Stellar Withdrawal";
            }
          }

          // Format extra info: display truncated public key if no resolved handle (following agents rules)
          let extra = record.transaction_hash.substring(0, 8);
          if (!resolvedUser && otherKey) {
            extra = `${otherKey.substring(0, 4)}...${otherKey.substring(otherKey.length - 4)}`;
          }

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

      // 4. Merge in incoming Firestore transfers that have no matching on-chain
      //    payment. Anchor deposits ("Add Money") land here: the feed above is
      //    built purely from Horizon history, so a completed deposit whose funds
      //    the sandbox anchor never settled on-chain would otherwise be invisible.
      //    Restricted to incoming (receiver === current user) because outgoing
      //    transfers (withdrawals, P2P sends) always produce a reliable on-chain
      //    row; deduped by hash so a deposit that DID settle on-chain isn't doubled.
      const renderedHashes = new Set(parsed.map((a) => a.hash));
      const firestoreOnly: Activity[] = firestoreTxs
        .filter((tx) => tx.hash && !renderedHashes.has(tx.hash) && tx.receiverUid === user?.uid)
        .map((tx) => {
          const dateObj = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date();
          const { time, dateSection } = getDateParts(dateObj);

          const title = tx.senderDisplayName || `@${tx.senderUsername}`;

          const usdStr = `+ $${parseFloat(tx.amountUSD).toFixed(2)}`;
          let amountPrimary = usdStr;
          let amountSecondary: string | undefined;
          if (tx.displayCurrency && tx.displayCurrency !== "USD") {
            const noDecimals = tx.displayCurrency === "VND" || tx.displayCurrency === "IDR";
            const formattedLocal = parseFloat(String(tx.displayAmount).replace(/,/g, "")).toLocaleString(undefined, {
              minimumFractionDigits: noDecimals ? 0 : 2,
              maximumFractionDigits: noDecimals ? 0 : 2,
            });
            amountPrimary = `+ ${tx.displayCurrency} ${formattedLocal}`;
            amountSecondary = usdStr;
          }

          return {
            id: tx.hash,
            type: "received",
            title,
            time,
            amountPrimary,
            amountSecondary,
            icon: "arrow-down-left",
            isPositive: true,
            dateSection,
            extra: tx.hash.substring(0, 8),
            hash: tx.hash,
            memo: tx.memo || "",
            destinationAddress: undefined,
            date: dateObj.toISOString(),
          };
        });

      // Merge on-chain + Firestore-only rows, newest first.
      const merged = [...parsed, ...firestoreOnly].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setActivities(merged);
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
    const unsubscribeStellar = streamPayments(publicKey, (payment) => {
      console.log("New blockchain payment detected, refreshing transactions list...");
      fetchTransactions();
    });

    // Subscribing to Firestore notifications as a highly reliable fallback for P2P updates
    let unsubscribeFirestore = () => {};
    if (user?.uid) {
      const { subscribeToNotifications } = require("../services/firebase/notifications");
      unsubscribeFirestore = subscribeToNotifications(user.uid, () => {
        console.log("New Firestore notification detected, refreshing transactions list...");
        fetchTransactions();
      });
    }

    return () => {
      unsubscribeStellar();
      unsubscribeFirestore();
    };
  }, [publicKey, user?.uid, fetchTransactions]);

  return { activities, isLoading, fetchTransactions };
};
