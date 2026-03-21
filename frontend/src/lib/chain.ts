// Aleo Network Configuration for VeilReceipt v8

export type AleoNetwork = 'mainnet' | 'testnet';
export type PaymentPrivacy = 'private' | 'public' | 'escrow';
export type TokenType = 'credits' | 'usdcx' | 'usad';

export const ALEO_CONFIG = {
  programId: import.meta.env.VITE_ALEO_PROGRAM_ID || 'veilreceipt_v8.aleo',
  network: (import.meta.env.VITE_ALEO_NETWORK || 'testnet') as AleoNetwork,
  rpcUrl: import.meta.env.VITE_ALEO_RPC_URL || 'https://api.explorer.provable.com/v1',
  usdcxProgramId: 'test_usdcx_stablecoin.aleo',
  usadProgramId: 'test_usad_stablecoin.aleo',
  creditsProgramId: 'credits.aleo',
};

export function getWalletAdapterNetwork(): string {
  return ALEO_CONFIG.network === 'mainnet' ? 'mainnet' : 'testnet';
}

export function getChainId(): string {
  return ALEO_CONFIG.network === 'mainnet' ? 'mainnet' : 'testnetbeta';
}

// Program transition names — v8
export const TRANSITIONS = {
  purchase_private_credits: 'purchase_private_credits',
  purchase_private_usdcx: 'purchase_private_usdcx',
  purchase_private_usad: 'purchase_private_usad',
  purchase_public_credits: 'purchase_public_credits',
  purchase_escrow_credits: 'purchase_escrow_credits',
  complete_escrow: 'complete_escrow',
  refund_escrow: 'refund_escrow',
  prove_cart_item: 'prove_cart_item',
  prove_purchase_support: 'prove_purchase_support',
  verify_support_token: 'verify_support_token',
  register_merchant: 'register_merchant',
  mint_access_token: 'mint_access_token',
  submit_anonymous_review: 'submit_anonymous_review',
  create_payment_link: 'create_payment_link',
  fulfill_link_credits: 'fulfill_link_credits',
  close_payment_link: 'close_payment_link',
  fulfill_link_escrow_credits: 'fulfill_link_escrow_credits',
} as const;

// Default fee in microcredits (100,000 = 0.1 credit — reasonable for testnet)
export const DEFAULT_FEE = 100_000;

// Escrow return window in blocks (~8 hours at ~10s/block)
export const ESCROW_RETURN_WINDOW = 500;
