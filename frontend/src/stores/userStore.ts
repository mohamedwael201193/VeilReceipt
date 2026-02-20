// User Store — Authentication and wallet state

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AleoAddress } from '@/lib/types';

interface UserState {
  address: AleoAddress | null;
  token: string | null;
  isMerchant: boolean;
  merchantName: string | null;

  setAddress: (address: AleoAddress | null) => void;
  setToken: (token: string | null) => void;
  setMerchant: (name: string | null) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      address: null,
      token: null,
      isMerchant: false,
      merchantName: null,

      setAddress: (address) => set({ address }),
      setToken: (token) => set({ token }),
      setMerchant: (name) => set({ isMerchant: !!name, merchantName: name }),
      logout: () => set({ address: null, token: null, isMerchant: false, merchantName: null }),
    }),
    { name: 'veilreceipt-user' }
  )
);
