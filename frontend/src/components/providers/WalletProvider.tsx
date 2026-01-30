// Wallet Provider Wrapper
// Configures Aleo wallet adapters for VeilReceipt (Leo + Shield)

import { FC, ReactNode, useMemo } from 'react';
import { AleoWalletProvider, useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { WalletDecryptPermission } from '@provablehq/aleo-wallet-standard';
import { ALEO_CONFIG, getWalletAdapterNetwork } from '@/lib/aleo';

// Import wallet adapter styles
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';

interface WalletProviderWrapperProps {
  children: ReactNode;
}

export const WalletProviderWrapper: FC<WalletProviderWrapperProps> = ({ children }) => {
  // Initialize wallet adapters - Leo and Shield
  // Configure with program permissions for record access
  // IMPORTANT: Include credits.aleo for private payment support!
  const wallets = useMemo(() => {
    return [
      new LeoWalletAdapter({
        appName: 'VeilReceipt',
        programIdPermissions: {
          testnet: [ALEO_CONFIG.programId, 'credits.aleo'],
          mainnet: [ALEO_CONFIG.programId, 'credits.aleo'],
        },
      }),
      new ShieldWalletAdapter({
        appName: 'VeilReceipt',
      }),
    ];
  }, []);

  // Get the network to use (testnet for now)
  const network = getWalletAdapterNetwork();

  return (
    <AleoWalletProvider 
      wallets={wallets} 
      network={network as any}
      autoConnect={true}
      programs={[ALEO_CONFIG.programId, 'credits.aleo']}
      decryptPermission={WalletDecryptPermission.OnChainHistory}
    >
      <WalletModalProvider>
        {children}
      </WalletModalProvider>
    </AleoWalletProvider>
  );
};

// Re-export useWallet for convenience
export { useWallet };
