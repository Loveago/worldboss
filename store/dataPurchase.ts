import { create } from "zustand";

export type DataPurchase = {
  network: "mtn" | "telecel" | "airteltigo" | null;
  bundleId: string | null;
  phone: string;
};

type DataState = {
  form: DataPurchase;
  setNetwork: (network: DataPurchase["network"]) => void;
  setBundle: (bundleId: string | null) => void;
  setPhone: (phone: string) => void;
};

export const useDataPurchaseStore = create<DataState>((set) => ({
  form: { network: null, bundleId: null, phone: "" },
  setNetwork: (network) => set((state) => ({ form: { ...state.form, network } })),
  setBundle: (bundleId) => set((state) => ({ form: { ...state.form, bundleId } })),
  setPhone: (phone) => set((state) => ({ form: { ...state.form, phone } })),
}));
