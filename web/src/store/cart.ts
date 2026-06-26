import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: number;
  variantId: number | null;
  slug: string;
  name: string;
  price: number;
  qty: number;
  image: string | null;
  sku: string | null;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: Omit<CartItem, "qty"> & { qty?: number }) => void;
  removeItem: (productId: number, variantId: number | null) => void;
  updateQty: (productId: number, variantId: number | null, qty: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  total: () => number;
  count: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item) => {
        const { productId, variantId, qty = 1 } = item;
        set((s) => {
          const idx = s.items.findIndex(
            (i) => i.productId === productId && i.variantId === variantId
          );
          if (idx >= 0) {
            const items = [...s.items];
            items[idx] = { ...items[idx], qty: items[idx].qty + qty };
            return { items, isOpen: true };
          }
          return { items: [...s.items, { ...item, qty }], isOpen: true };
        });
      },

      removeItem: (productId, variantId) =>
        set((s) => ({
          items: s.items.filter(
            (i) => !(i.productId === productId && i.variantId === variantId)
          ),
        })),

      updateQty: (productId, variantId, qty) =>
        set((s) => ({
          items:
            qty <= 0
              ? s.items.filter(
                  (i) => !(i.productId === productId && i.variantId === variantId)
                )
              : s.items.map((i) =>
                  i.productId === productId && i.variantId === variantId
                    ? { ...i, qty }
                    : i
                ),
        })),

      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      total: () =>
        get().items.reduce((sum, i) => sum + i.price * i.qty, 0),

      count: () => get().items.reduce((sum, i) => sum + i.qty, 0),
    }),
    { name: "vma-cart", partialize: (s) => ({ items: s.items }) }
  )
);
