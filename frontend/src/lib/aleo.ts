// Aleo Network Configuration

// Network type for wallet adapter
export type AleoNetwork = 'mainnet' | 'testnet';

export const ALEO_CONFIG = {
  programId: import.meta.env.VITE_ALEO_PROGRAM_ID || 'veilreceipt_v1.aleo',
  network: (import.meta.env.VITE_ALEO_NETWORK || 'testnet') as AleoNetwork,
  rpcUrl: import.meta.env.VITE_ALEO_RPC_URL || 'https://api.explorer.provable.com/v1',
};

/**
 * Get wallet adapter network string from config
 */
export function getWalletAdapterNetwork(): string {
  switch (ALEO_CONFIG.network) {
    case 'mainnet':
      return 'mainnet';
    case 'testnet':
    default:
      return 'testnet';
  }
}

/**
 * Get chain ID for transaction requests
 */
export function getChainId(): string {
  switch (ALEO_CONFIG.network) {
    case 'mainnet':
      return 'mainnet';
    case 'testnet':
    default:
      return 'testnetbeta';
  }
}

/**
 * Program functions with their expected inputs
 */
export const PROGRAM_FUNCTIONS = {
  purchase: {
    name: 'purchase',
    inputs: ['address', 'u64', 'field', 'u64'], // merchant, total, cart_commitment, timestamp
  },
  open_return: {
    name: 'open_return',
    inputs: ['Receipt', 'field'], // receipt record, return_reason_hash
  },
  claim_loyalty: {
    name: 'claim_loyalty',
    inputs: ['Receipt', 'u8'], // receipt record, tier
  },
  prove_purchase_for_support: {
    name: 'prove_purchase_for_support',
    inputs: ['Receipt', 'field', 'field'], // receipt record, product_hash, salt
  },
  verify_support_token: {
    name: 'verify_support_token',
    inputs: ['address', 'u64', 'field', 'u64', 'field', 'field'], // merchant, total, product_hash, timestamp, salt, claimed_token
  },
} as const;

/**
 * Default transaction fee (in microcredits)
 * 1 credit = 1,000,000 microcredits
 */
export const DEFAULT_FEE = 1_000_000; // 1 credit
