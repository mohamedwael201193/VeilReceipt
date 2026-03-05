// Cart Store — Shopping cart state management

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem, AleoAddress } from '@/lib/types';
import { TokenType } from '@/lib/chain';

interface CartState {
  items: CartItem[];
  merchantAddress: AleoAddress | null;
  tokenType: TokenType;

  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setTokenType: (type: TokenType) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      merchantAddress: null,
      tokenType: 'credits',

      addItem: (product) => set((state) => {
        const tokenForProduct = product.price_type === 'usdcx' ? 'usdcx' : 'credits';
        if (state.merchantAddress && state.merchantAddress !== product.merchant_address) {
          return { items: [{ product, quantity: 1 }], merchantAddress: product.merchant_address, tokenType: tokenForProduct };
        }
        const idx = state.items.findIndex(i => i.product.id === product.id);
        if (idx >= 0) {
          const newItems = [...state.items];
          newItems[idx] = { ...newItems[idx], quantity: newItems[idx].quantity + 1 };
          return { items: newItems };
        }
        // Auto-set token type to match first item's price_type
        const newTokenType = state.items.length === 0 ? tokenForProduct : state.tokenType;
        return { items: [...state.items, { product, quantity: 1 }], merchantAddress: product.merchant_address, tokenType: newTokenType };
      }),

      removeItem: (productId) => set((state) => {
        const newItems = state.items.filter(i => i.product.id !== productId);
        return { items: newItems, merchantAddress: newItems.length > 0 ? state.merchantAddress : null };
      }),

      updateQuantity: (productId, quantity) => set((state) => {
        if (quantity <= 0) return { items: state.items.filter(i => i.product.id !== productId) };
        return { items: state.items.map(i => i.product.id === productId ? { ...i, quantity } : i) };
      }),

      setTokenType: (type) => set({ tokenType: type }),
      clearCart: () => set({ items: [], merchantAddress: null }),

      getTotal: () => get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
      getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'veilreceipt-cart' }
  )
);
