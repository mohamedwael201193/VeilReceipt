// Pending Transaction Store — Tracks on-chain transaction lifecycle

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PendingTx {
  txId: string;
  type: string;
  status: 'pending' | 'confirmed' | 'failed';
  data?: Record<string, any>;
  createdAt: number;
  confirmedAt?: number;
}

interface PendingTxState {
  transactions: PendingTx[];
  addTransaction: (tx: { txId: string; type: string; data?: Record<string, any> }) => void;
  confirmTransaction: (txId: string) => void;
  failTransaction: (txId: string) => void;
  updateTransactionId: (oldId: string, newId: string) => void;
  clearOld: () => void;
  clearCompleted: () => void;
  getPending: () => PendingTx[];
}

export const usePendingTxStore = create<PendingTxState>()(
  persist(
    (set, get) => ({
      transactions: [],

      addTransaction: (tx) => set((state) => ({
        transactions: [{
          ...tx,
          status: 'pending' as const,
          createdAt: Date.now(),
        }, ...state.transactions].slice(0, 50),
      })),

      confirmTransaction: (txId) => set((state) => ({
        transactions: state.transactions.map(tx =>
          tx.txId === txId ? { ...tx, status: 'confirmed' as const, confirmedAt: Date.now() } : tx
        ),
      })),

      failTransaction: (txId) => set((state) => ({
        transactions: state.transactions.map(tx =>
          tx.txId === txId ? { ...tx, status: 'failed' as const } : tx
        ),
      })),

      // Replace a temporary Shield ID with the real on-chain at1... ID (keeps status + data)
      updateTransactionId: (oldId, newId) => set((state) => ({
        transactions: state.transactions.map(tx =>
          tx.txId === oldId ? { ...tx, txId: newId } : tx
        ),
      })),

      clearOld: () => set((state) => ({
        transactions: state.transactions.filter(
          tx => Date.now() - tx.createdAt < 24 * 60 * 60 * 1000
        ),
      })),

      // clearCompleted removes confirmed/failed AND orphan shield_ entries (temp IDs with no at1 counterpart)
      clearCompleted: () => set((state) => ({
        transactions: state.transactions.filter(tx => tx.status === 'pending'),
      })),

      getPending: () => get().transactions.filter(tx => tx.status === 'pending'),
    }),
    { name: 'veilreceipt-pending-txs' }
  )
);
