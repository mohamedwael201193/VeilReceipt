// Purchase History Store — Persistent local record of completed purchases
// Keyed by wallet address for multi-account support

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PurchaseRecord {
  txId: string;
  merchantAddress: string;
  total: number;
  tokenType: 'credits' | 'usdcx';
  privacy: 'private' | 'public' | 'escrow';
  cartCommitment: string;
  timestamp: number;
  confirmedAt: number;
  items?: { sku: string; name: string; quantity: number; priceMicro: number }[];
  status: 'confirmed' | 'refunded';
}

interface PurchaseState {
  // address -> PurchaseRecord[]
  purchases: Record<string, PurchaseRecord[]>;
  addPurchase: (address: string, purchase: PurchaseRecord) => void;
  getPurchases: (address: string) => PurchaseRecord[];
  markRefunded: (address: string, txId: string) => void;
  clearPurchases: (address: string) => void;
}

export const usePurchaseStore = create<PurchaseState>()(
  persist(
    (set, get) => ({
      purchases: {},

      addPurchase: (address, purchase) => set((state) => {
        const existing = state.purchases[address] || [];
        // Deduplicate by txId
        if (existing.some(p => p.txId === purchase.txId)) return state;
        return {
          purchases: {
            ...state.purchases,
            [address]: [purchase, ...existing].slice(0, 200),
          },
        };
      }),

      getPurchases: (address) => get().purchases[address] || [],

      markRefunded: (address, txId) => set((state) => {
        const existing = state.purchases[address] || [];
        return {
          purchases: {
            ...state.purchases,
            [address]: existing.map(p =>
              p.txId === txId ? { ...p, status: 'refunded' as const } : p
            ),
          },
        };
      }),

      clearPurchases: (address) => set((state) => {
        const { [address]: _, ...rest } = state.purchases;
        return { purchases: rest };
      }),
    }),
    {
      name: 'veil-purchases',
    }
  )
);
