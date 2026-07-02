import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { asyncStorage } from "../lib/storage";

export interface CartItem {
  productId: number;
  variantId: number | null;
  slug: string;
  name: string;
  price: number;
  qty: number;
  image: string | null;
  sku: string | null;
  bonusBuyQty?: number | null;
  bonusFreeQty?: number | null;
  expiryDate?: string | null;
}

/** Free units earned on a line via its bulk bonus (buy N get M extra free). */
export function bonusFreeUnits(item: Pick<CartItem, "qty" | "bonusBuyQty" | "bonusFreeQty">): number {
  if (!item.bonusBuyQty || !item.bonusFreeQty || item.bonusBuyQty <= 0) return 0;
  return Math.floor(item.qty / item.bonusBuyQty) * item.bonusFreeQty;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty"> & { qty?: number }) => void;
  removeItem: (productId: number, variantId: number | null) => void;
  updateQty: (productId: number, variantId: number | null, qty: number) => void;
  clearCart: () => void;
  total: () => number;
  count: () => number;
  freeTotal: () => number;
}

const sameLine = (i: CartItem, productId: number, variantId: number | null) =>
  i.productId === productId && i.variantId === variantId;

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const { productId, variantId = null, qty = 1 } = item;
        set((s) => {
          const idx = s.items.findIndex((i) => sameLine(i, productId, variantId));
          if (idx >= 0) {
            const items = [...s.items];
            items[idx] = { ...items[idx], qty: items[idx].qty + qty };
            return { items };
          }
          return { items: [...s.items, { ...item, variantId, qty }] };
        });
      },

      removeItem: (productId, variantId) =>
        set((s) => ({ items: s.items.filter((i) => !sameLine(i, productId, variantId)) })),

      updateQty: (productId, variantId, qty) =>
        set((s) => ({
          items:
            qty <= 0
              ? s.items.filter((i) => !sameLine(i, productId, variantId))
              : s.items.map((i) => (sameLine(i, productId, variantId) ? { ...i, qty } : i)),
        })),

      clearCart: () => set({ items: [] }),
      total: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
      count: () => get().items.reduce((sum, i) => sum + i.qty, 0),
      freeTotal: () => get().items.reduce((sum, i) => sum + bonusFreeUnits(i), 0),
    }),
    {
      name: "vma-cart",
      storage: createJSONStorage(() => asyncStorage),
      partialize: (s) => ({ items: s.items }),
    }
  )
);
