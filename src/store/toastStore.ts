import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
  show: (message: string, type?: ToastType) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  message: "",
  type: "info",
  show: (message, type = "info") => {
    set({ visible: true, message, type });
    // Auto hide after 3.5 seconds
    const timer = setTimeout(() => {
      set({ visible: false });
    }, 3500);
  },
  hide: () => set({ visible: false }),
}));

export const showToast = (message: string, type: ToastType = "info") => {
  useToastStore.getState().show(message, type);
};
