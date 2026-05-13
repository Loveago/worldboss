import { create } from "zustand";
import { persist } from "zustand/middleware";

type CartItem = {
  productId: string;
  name: string;
  price: number;
  qty: number;
  variant?: string | null;
};

type CartState = {
  items: CartItem[];
  add: (item: CartItem) => void;
  setQty: (productId: string, qty: number, variant?: string | null) => void;
  remove: (productId: string, variant?: string | null) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === item.productId && (i.variant ?? null) === (item.variant ?? null)
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId && (i.variant ?? null) === (item.variant ?? null)
                  ? { ...i, qty: i.qty + item.qty }
                  : i
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      setQty: (productId, qty, variant) =>
        set((state) => {
          if (qty <= 0) {
            return {
              items: state.items.filter(
                (i) => !(i.productId === productId && (i.variant ?? null) === (variant ?? null))
              ),
            };
          }
          return {
            items: state.items.map((i) =>
              i.productId === productId && (i.variant ?? null) === (variant ?? null) ? { ...i, qty } : i
            ),
          };
        }),
      remove: (productId, variant) =>
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && (i.variant ?? null) === (variant ?? null))
          ),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "boss-market-cart",
    }
  )
);
