import { create } from "zustand";
import { TransactionCache } from "../services/firebase/firestore";

interface WalletState {
  publicKey: string | null;
  xlmBalance: string;
  usdcBalance: string;
  transactions: TransactionCache[];
  isLoadingBalance: boolean;
  isLoadingTx: boolean;
  setPublicKey: (key: string | null) => void;
  setBalances: (xlm: string, usdc: string) => void;
  setTransactions: (txs: TransactionCache[]) => void;
  setLoadingBalance: (v: boolean) => void;
  setLoadingTx: (v: boolean) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  publicKey: null,
  xlmBalance: "0",
  usdcBalance: "0",
  transactions: [],
  isLoadingBalance: false,
  isLoadingTx: false,
  setPublicKey: (publicKey) => set({ publicKey }),
  setBalances: (xlmBalance, usdcBalance) => set({ xlmBalance, usdcBalance }),
  setTransactions: (transactions) => set({ transactions }),
  setLoadingBalance: (isLoadingBalance) => set({ isLoadingBalance }),
  setLoadingTx: (isLoadingTx) => set({ isLoadingTx }),
}));
