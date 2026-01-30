// Aleo Network Configuration

// Network type for wallet adapter
export type AleoNetwork = 'mainnet' | 'testnet';

// Payment privacy levels
export type PaymentPrivacy = 'public' | 'private' | 'demo';

export const ALEO_CONFIG = {
  programId: import.meta.env.VITE_ALEO_PROGRAM_ID || 'veilreceipt_v2.aleo',
  network: (import.meta.env.VITE_ALEO_NETWORK || 'testnet') as AleoNetwork,
  rpcUrl: import.meta.env.VITE_ALEO_RPC_URL || 'https://api.explorer.provable.com/v1',
  // Enable real payments - V2 supports real credits transfer!
  enableRealPayments: import.meta.env.VITE_ENABLE_REAL_PAYMENTS === 'true',
  // Default payment privacy level: 'private' for maximum privacy, 'public' for visible, 'demo' for no payment
  defaultPaymentPrivacy: (import.meta.env.VITE_PAYMENT_PRIVACY || 'private') as PaymentPrivacy,
  // Deployment info
  deploymentTx: 'at1d4nj46almxfpplvckk5pc6uecdgqp20g3pg4sfp6ahm9tnuluc8q2xst5h',
  deploymentBlock: 14100173,
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
  // NEW: Purchase with real PUBLIC credits transfer
  purchase_public: {
    name: 'purchase_public',
    inputs: ['address', 'u64', 'field', 'u64'], // merchant, total, cart_commitment, timestamp
    description: 'Purchase with public credits transfer (visible on-chain)',
  },
  // NEW: Purchase with PRIVATE credits transfer (maximum privacy)
  purchase_private: {
    name: 'purchase_private',
    inputs: ['credits.aleo/credits', 'address', 'u64', 'field', 'u64'], // payment record, merchant, total, cart_commitment, timestamp
    description: 'Purchase with private credits transfer (hidden on-chain)',
  },
  // Legacy: No real payment (demo mode)
  purchase: {
    name: 'purchase',
    inputs: ['address', 'u64', 'field', 'u64'], // merchant, total, cart_commitment, timestamp
    description: 'Demo purchase - creates receipt without payment',
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
