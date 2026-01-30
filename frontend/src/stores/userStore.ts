// User Store - Authentication and wallet state

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AleoAddress } from '@/lib/types';

interface UserState {
  // Wallet state
  address: AleoAddress | null;
  connected: boolean;
  
  // Auth state
  token: string | null;
  role: 'merchant' | 'buyer' | null;
  
  // Balances
  publicBalance: bigint;
  privateBalance: bigint;
  
  // Actions
  setAccount: (address: AleoAddress | null, connected: boolean) => void;
  setAuth: (token: string | null, role: 'merchant' | 'buyer' | null) => void;
  updateBalances: (publicBalance: bigint, privateBalance: bigint) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      address: null,
      connected: false,
      token: null,
      role: null,
      publicBalance: BigInt(0),
      privateBalance: BigInt(0),

      setAccount: (address, connected) => set({ address, connected }),
      
      setAuth: (token, role) => set({ token, role }),
      
      updateBalances: (publicBalance, privateBalance) => set({ publicBalance, privateBalance }),
      
      clearUser: () => set({
        address: null,
        connected: false,
        token: null,
        role: null,
        publicBalance: BigInt(0),
        privateBalance: BigInt(0),
      }),
    }),
    {
      name: 'veilreceipt-user',
      partialize: (state) => ({
        token: state.token,
        role: state.role,
      }),
    }
  )
);
