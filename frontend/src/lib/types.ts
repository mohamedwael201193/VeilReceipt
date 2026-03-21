// Type definitions for VeilReceipt v4 frontend

export type AleoAddress = string;
export type AleoField = string;
export type AleoTransactionId = string;

// Product from backend
export interface Product {
  id: string;
  merchant_id: string;
  merchant_address: AleoAddress;
  name: string;
  description: string;
  price: number;
  price_type: 'credits' | 'usdcx' | 'usad';
  sku: string;
  image_url?: string;
  category?: string;
  in_stock: boolean;
  created_at: string;
}

// Cart item
export interface CartItem {
  product: Product;
  quantity: number;
}

// BuyerReceipt record from chain (decrypted)
export interface BuyerReceiptRecord {
  owner: AleoAddress;
  merchant: AleoAddress;
  total: number;
  cart_commitment: string;
  timestamp: number;
  purchase_commitment: string;
  token_type: number; // 0 = Credits, 1 = USDCx, 2 = USAD
  nonce_seed: string;
  // Wallet metadata
  _plaintext?: string;
  _ciphertext?: string;
  _fromWallet?: boolean;
}

// EscrowReceipt record from chain
export interface EscrowReceiptRecord {
  owner: AleoAddress;
  merchant: AleoAddress;
  total: number;
  cart_commitment: string;
  purchase_commitment: string;
  nonce_seed: string;
  _plaintext?: string;
  _fromWallet?: boolean;
}

// ReturnClaim record from chain
export interface ReturnClaimRecord {
  owner: AleoAddress;
  purchase_commitment: string;
  refund_amount: number;
  return_reason_hash: string;
  nonce_seed: string;
}

// CartItemProof record from chain
export interface CartItemProofRecord {
  owner: AleoAddress;
  item_commitment: string;
  cart_root: string;
  verified: boolean;
  nonce_seed: string;
}

// MerchantLicense record from chain
export interface MerchantLicenseRecord {
  owner: AleoAddress;
  store_commitment: string;
  nonce_seed: string;
  _plaintext?: string;
  _fromWallet?: boolean;
}

// MerchantReceipt record from chain (decrypted) — simpler than BuyerReceipt
export interface MerchantReceiptRecord {
  owner: AleoAddress;
  purchase_commitment: string;
  total: number;
  token_type: number; // 0 = Credits, 1 = USDCx, 2 = USAD
  nonce_seed: string;
  _plaintext?: string;
  _fromWallet?: boolean;
}

// AccessToken record from chain — receipt-gated access proof
export interface AccessTokenRecord {
  owner: AleoAddress;
  merchant: AleoAddress;
  gate_commitment: string;
  token_tier: number;
  nonce_seed: string;
  _plaintext?: string;
  _fromWallet?: boolean;
}

// ReviewToken record from chain — anonymous verified review proof
export interface ReviewTokenRecord {
  owner: AleoAddress;
  product_hash: string;
  rating: number;
  review_commitment: string;
  nonce_seed: string;
  _plaintext?: string;
  _fromWallet?: boolean;
}

// Receipt metadata from backend
export interface ReceiptMeta {
  id: string;
  purchase_commitment: string;
  buyer_address_hash: string;
  merchant_address_hash: string;
  total: number;
  token_type: number;
  cart_commitment: string;
  tx_id: string;
  status: string;
  created_at: string;
}

// Escrow metadata from backend
export interface EscrowMeta {
  id: string;
  purchase_commitment: string;
  buyer_address_hash: string;
  merchant_address_hash: string;
  total: number;
  status: 'active' | 'completed' | 'refunded';
  escrow_tx_id: string;
  resolve_tx_id: string;
  created_block: number;
  created_at: string;
}

// Transaction status
export interface TxStatus {
  status: 'confirmed' | 'pending' | 'failed' | 'not_found';
  blockHeight?: number;
}

// PaymentLink record from chain (decrypted)
export interface PaymentLinkRecord {
  owner: AleoAddress;
  link_hash: string;
  amount: number;
  token_type: number;
  link_type: number; // 0 = one_time, 1 = recurring, 2 = open
  expiry_height: number;
  nonce_seed: string;
  _plaintext?: string;
  _fromWallet?: boolean;
}

// PaymentLink metadata from backend
export interface PaymentLinkMeta {
  id: string;
  merchant_id: string;
  merchant_address: AleoAddress;
  link_hash: string;
  amount: number;
  currency: 'credits' | 'usdcx' | 'usad';
  link_type: 'one_time' | 'recurring' | 'open';
  label: string;
  description: string;
  is_active: boolean;
  total_contributions: number;
  total_collected: number;
  tx_id: string;
  created_at: string;
}

// Public payment link info (for payers)
export interface PaymentLinkPublic {
  id: string;
  merchant_address: AleoAddress;
  link_hash: string;
  amount: number;
  currency: 'credits' | 'usdcx' | 'usad';
  link_type: 'one_time' | 'recurring' | 'open';
  label: string;
  description: string;
  is_active: boolean;
  total_contributions: number;
}

// DPS proving status
export interface ProvingHealth {
  dps_configured: boolean;
  sponsor_configured: boolean;
  program_id: string;
  network: string;
}
