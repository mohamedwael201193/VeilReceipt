// Cart Store - Shopping cart state management

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem, AleoAddress } from '@/lib/types';

interface CartState {
  items: CartItem[];
  merchantAddress: AleoAddress | null;
  
  // Actions
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  
  // Computed
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      merchantAddress: null,

      addItem: (product) => set((state) => {
        // Check if adding from different merchant
        if (state.merchantAddress && state.merchantAddress !== product.merchantAddress) {
          // Clear cart when switching merchants
          return {
            items: [{ product, quantity: 1 }],
            merchantAddress: product.merchantAddress,
          };
        }

        // Check if item already in cart
        const existingIndex = state.items.findIndex(
          (item) => item.product.id === product.id
        );

        if (existingIndex >= 0) {
          // Increment quantity
          const newItems = [...state.items];
          newItems[existingIndex] = {
            ...newItems[existingIndex],
            quantity: newItems[existingIndex].quantity + 1,
          };
          return { items: newItems };
        }

        // Add new item
        return {
          items: [...state.items, { product, quantity: 1 }],
          merchantAddress: product.merchantAddress,
        };
      }),

      removeItem: (productId) => set((state) => {
        const newItems = state.items.filter((item) => item.product.id !== productId);
        return {
          items: newItems,
          merchantAddress: newItems.length > 0 ? state.merchantAddress : null,
        };
      }),

      updateQuantity: (productId, quantity) => set((state) => {
        if (quantity <= 0) {
          return {
            items: state.items.filter((item) => item.product.id !== productId),
          };
        }

        return {
          items: state.items.map((item) =>
            item.product.id === productId ? { ...item, quantity } : item
          ),
        };
      }),

      clearCart: () => set({ items: [], merchantAddress: null }),

      getTotal: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      },

      getItemCount: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'veilreceipt-cart',
    }
  )
);
