// Live Transaction Status Store — drives the global transaction toast UI

import { create } from 'zustand';

export type TxPhase = 'signing' | 'proving' | 'broadcasting' | 'confirming' | 'confirmed' | 'failed';

export interface ActiveTx {
  id: string;
  label: string;
  phase: TxPhase;
  txId?: string;
  startedAt: number;
}

interface TxStatusState {
  active: ActiveTx | null;
  start: (label: string) => void;
  setPhase: (phase: TxPhase, txId?: string) => void;
  clear: () => void;
}

export const useTxStatusStore = create<TxStatusState>()((set) => ({
  active: null,
  start: (label) => set({
    active: { id: crypto.randomUUID(), label, phase: 'signing', startedAt: Date.now() },
  }),
  setPhase: (phase, txId) => set((state) => ({
    active: state.active ? { ...state.active, phase, ...(txId ? { txId } : {}) } : null,
  })),
  clear: () => set({ active: null }),
}));
