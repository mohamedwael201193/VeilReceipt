// Wallet Provider — Leo + Shield wallet adapters for VeilReceipt v3

import { FC, ReactNode, useMemo } from 'react';
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';
import { Network } from '@provablehq/aleo-types';
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';
import { ALEO_CONFIG } from '@/lib/chain';

const PROGRAM_PERMISSIONS = [
  ALEO_CONFIG.programId,
  ALEO_CONFIG.creditsProgramId,
  ALEO_CONFIG.usdcxProgramId,
];

const NETWORK: Network = ALEO_CONFIG.network === 'mainnet' ? Network.MAINNET : Network.TESTNET;

export const WalletProviderWrapper: FC<{ children: ReactNode }> = ({ children }) => {
  const wallets = useMemo(() => [
    new LeoWalletAdapter({ appName: 'VeilReceipt' }),
    new ShieldWalletAdapter({ appName: 'VeilReceipt' }),
  ], []);

  return (
    <AleoWalletProvider
      wallets={wallets}
      decryptPermission={DecryptPermission.AutoDecrypt}
      network={NETWORK}
      programs={PROGRAM_PERMISSIONS}
      autoConnect
    >
      <WalletModalProvider>
        {children}
      </WalletModalProvider>
    </AleoWalletProvider>
  );
};

export default WalletProviderWrapper;
