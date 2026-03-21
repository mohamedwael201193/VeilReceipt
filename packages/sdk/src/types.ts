// VeilReceipt SDK Types

export type AleoAddress = string;
export type AleoField = string;
export type AleoTransactionId = string;

// ═══════════════════════════════════════════
// Payment Sessions
// ═══════════════════════════════════════════

export interface PaymentSession {
  id: string;
  amount: number;
  currency: 'credits' | 'usdcx' | 'usad';
  description: string;
  status: string;
  merchant_address: AleoAddress;
  payment_mode: string | null;
  tx_id: string | null;
  redirect_url: string | null;
  cancel_url: string | null;
  expires_at: string;
}

export interface CompleteSessionParams {
  purchase_commitment: string;
  tx_id: string;
  payment_mode: 'private' | 'public' | 'escrow';
  buyer_address?: string;
}

export interface SessionResult {
  success: boolean;
  session_id: string;
  redirect_url: string | null;
}

// ═══════════════════════════════════════════
// Payment Links
// ═══════════════════════════════════════════

export interface PaymentLink {
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

export interface CreatePaymentLinkParams {
  link_hash: string;
  amount: number;
  currency: 'credits' | 'usdcx' | 'usad';
  link_type: 'one_time' | 'recurring' | 'open';
  label: string;
  description: string;
  tx_id: string;
}

export interface FulfillLinkParams {
  link_id: string;
  purchase_commitment: string;
  buyer_address_hash: string;
  amount: number;
  tx_id: string;
  payment_mode: 'private' | 'escrow';
}

// ═══════════════════════════════════════════
// Products
// ═══════════════════════════════════════════

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

export interface CreateProductParams {
  name: string;
  description: string;
  price: number;
  price_type: 'credits' | 'usdcx' | 'usad';
  sku: string;
  imageUrl?: string;
  category?: string;
}

// ═══════════════════════════════════════════
// Receipts & Escrow
// ═══════════════════════════════════════════

export interface Receipt {
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

export interface Escrow {
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

export interface StoreReceiptParams {
  txId: string;
  onChainTxId?: string;
  merchantAddress: string;
  buyerAddress: string;
  total: number;
  tokenType?: 'credits' | 'usdcx' | 'usad';
  purchaseType?: 'private' | 'public' | 'escrow';
  status?: 'confirmed' | 'escrowed';
  cartCommitment?: string;
  timestamp?: number;
  blockHeight?: number;
  items?: { sku: string; quantity: number; price: number }[];
}

// ═══════════════════════════════════════════
// Verification
// ═══════════════════════════════════════════

export interface VerificationResult {
  commitment: string;
  on_chain_verified: boolean;
  receipt: {
    total: number;
    token_type: number;
    status: string;
    tx_id: string;
  } | null;
}

// ═══════════════════════════════════════════
// API Keys & Webhooks
// ═══════════════════════════════════════════

export interface ApiKey {
  id: string;
  prefix: string;
  label: string;
  permissions: string[];
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  failure_count: number;
  created_at: string;
}

// ═══════════════════════════════════════════
// Delegated Proving
// ═══════════════════════════════════════════

export interface ProvingHealth {
  dps_configured: boolean;
  sponsor_configured: boolean;
  program_id: string;
  network: string;
}

export interface DelegateProofParams {
  transition: string;
  inputs: string[];
  fee_record?: string;
}

// ═══════════════════════════════════════════
// Transaction Status
// ═══════════════════════════════════════════

export interface TxStatus {
  txId: string;
  status: 'confirmed' | 'pending' | 'failed' | 'not_found';
  blockHeight?: number;
}

// ═══════════════════════════════════════════
// Client Options
// ═══════════════════════════════════════════

export interface VeilReceiptConfig {
  /** Base URL of the VeilReceipt backend API */
  baseUrl: string;
  /** API key for authentication (from merchant dashboard) */
  apiKey?: string;
  /** JWT token for session-based auth */
  token?: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
}
