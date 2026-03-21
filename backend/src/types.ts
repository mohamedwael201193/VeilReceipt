// Type definitions for VeilReceipt v4 backend

import { z } from 'zod';

// ========== Aleo Primitives ==========
export type AleoAddress = string;
export type AleoField = string;
export type AleoTransactionId = string;

// ========== Database Models ==========

export interface Merchant {
  id: string;
  address_hash: string; // SHA-256 of wallet address (privacy)
  name: string;
  category: string;
  created_at: string;
}

export interface Product {
  id: string;
  merchant_id: string;
  merchant_address: AleoAddress;
  name: string;
  description: string;
  price: number; // microcredits
  price_type: 'credits' | 'usdcx' | 'usad'; // credits = Aleo Credits, usdcx = USDCx Stablecoin, usad = USAD Stablecoin
  sku: string;
  image_url: string;
  category: string;
  in_stock: boolean;
  created_at: string;
}

export interface ReceiptMeta {
  id: string;
  purchase_commitment: string;
  buyer_address_hash: string;
  merchant_address_hash: string;
  total: number;
  token_type: number; // 0 = Credits, 1 = USDCx, 2 = USAD
  cart_commitment: string;
  tx_id: string;
  status: 'confirmed' | 'escrowed' | 'refunded' | 'completed';
  purchase_type?: 'private' | 'public' | 'escrow'; // how payment was made
  created_at: string;
}

export interface EscrowRecord {
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

export interface LoyaltyRecord {
  id: string;
  address_hash: string;
  purchase_commitment: string;
  score: number;
  total_spent: number;
  tx_id: string;
  created_at: string;
}

export interface AuthNonce {
  nonce: string;
  address: AleoAddress;
  created_at: number;
  expires_at: number;
  used: boolean;
}

export interface PendingTransaction {
  id: string;
  tx_id: string;
  address_hash: string;
  type: 'purchase' | 'escrow' | 'complete' | 'refund' | 'loyalty' | 'loyalty_merge';
  status: 'pending' | 'confirmed' | 'failed';
  metadata: Record<string, any>;
  created_at: string;
  confirmed_at: string | null;
}

// ========== JWT ==========
export interface JWTPayload {
  address: AleoAddress;
  role: 'merchant' | 'buyer';
  iat: number;
  exp: number;
}

// ========== Integration API Models ==========

export interface MerchantApiKey {
  id: string;
  merchant_id: string;
  api_key_hash: string;       // SHA-256 of the actual key (we never store raw)
  api_key_prefix: string;     // First 8 chars for identification (e.g. "veil_pk_")
  label: string;              // Human-readable label
  permissions: string[];      // ['payments', 'webhooks', 'products', 'receipts']
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

export interface WebhookEndpoint {
  id: string;
  merchant_id: string;
  url: string;
  secret_hash: string;        // SHA-256 of webhook signing secret
  events: string[];            // ['payment.confirmed', 'escrow.created', 'escrow.completed', 'refund.processed']
  is_active: boolean;
  failure_count: number;
  last_triggered_at: string | null;
  created_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event: string;
  payload: Record<string, any>;
  status: 'pending' | 'delivered' | 'failed';
  response_code: number | null;
  attempts: number;
  next_retry_at: string | null;
  created_at: string;
}

export interface PaymentSession {
  id: string;
  merchant_id: string;
  merchant_address: string;
  amount: number;
  currency: 'credits' | 'usdcx' | 'usad';
  description: string;
  metadata: Record<string, any>;   // Merchant-provided metadata (order ID, etc.)
  status: 'pending' | 'completed' | 'expired' | 'cancelled';
  purchase_commitment: string | null;
  tx_id: string | null;
  payment_mode: 'private' | 'public' | 'escrow' | null;
  redirect_url: string | null;
  cancel_url: string | null;
  expires_at: string;
  created_at: string;
}

export interface PaymentLink {
  id: string;
  merchant_id: string;
  merchant_address: string;
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

// ========== JSON Database Structure ==========
export interface JsonDatabase {
  merchants: Merchant[];
  products: Product[];
  receipts: ReceiptMeta[];
  escrows: EscrowRecord[];
  loyalty: LoyaltyRecord[];
  auth_nonces: AuthNonce[];
  pending_txs: PendingTransaction[];
  api_keys: MerchantApiKey[];
  webhooks: WebhookEndpoint[];
  webhook_deliveries: WebhookDelivery[];
  payment_sessions: PaymentSession[];
  payment_links: PaymentLink[];
}

// ========== Zod Schemas ==========

export const CreateReceiptSchema = z.object({
  purchase_commitment: z.string(),
  buyer_address_hash: z.string(),
  merchant_address_hash: z.string(),
  total: z.number(),
  token_type: z.number().min(0).max(2),
  cart_commitment: z.string(),
  tx_id: z.string(),
  status: z.enum(['confirmed', 'escrowed']).default('confirmed'),
  purchase_type: z.enum(['private', 'public', 'escrow']).optional(),
});

export const CreateEscrowSchema = z.object({
  purchase_commitment: z.string(),
  buyer_address_hash: z.string(),
  merchant_address_hash: z.string(),
  total: z.number(),
  escrow_tx_id: z.string(),
  created_block: z.number().optional().default(0),
});

export const ResolveEscrowSchema = z.object({
  purchase_commitment: z.string(),
  resolve_tx_id: z.string(),
  status: z.enum(['completed', 'refunded']),
});

export const CreateLoyaltySchema = z.object({
  address_hash: z.string(),
  purchase_commitment: z.string(),
  score: z.number().default(1),
  total_spent: z.number().default(0),
  tx_id: z.string(),
});

export const CreatePendingTxSchema = z.object({
  tx_id: z.string(),
  address_hash: z.string(),
  type: z.enum(['purchase', 'escrow', 'complete', 'refund', 'loyalty', 'loyalty_merge']),
  metadata: z.record(z.any()).optional().default({}),
});

export const CreateProductSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  price: z.number().positive(),
  price_type: z.enum(['credits', 'usdcx', 'usad']).default('credits'),
  sku: z.string(),
  image_url: z.string().optional().default(''),
  category: z.string().optional().default('general'),
});

// ========== Integration API Schemas ==========

export const CreateApiKeySchema = z.object({
  label: z.string().min(1).max(100),
  permissions: z.array(z.enum(['payments', 'webhooks', 'products', 'receipts'])).min(1),
});

export const CreateWebhookSchema = z.object({
  url: z.string().url().max(500),
  events: z.array(z.enum([
    'payment.confirmed', 'payment.failed',
    'escrow.created', 'escrow.completed', 'refund.processed',
  ])).min(1),
});

export const CreatePaymentSessionSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(['credits', 'usdcx', 'usad']).default('credits'),
  description: z.string().max(500).default(''),
  metadata: z.record(z.any()).optional().default({}),
  redirect_url: z.string().url().max(500).optional(),
  cancel_url: z.string().url().max(500).optional(),
});

export const CreatePaymentLinkSchema = z.object({
  link_hash: z.string(),
  amount: z.number().min(0),
  currency: z.enum(['credits', 'usdcx', 'usad']).default('credits'),
  link_type: z.enum(['one_time', 'recurring', 'open']),
  label: z.string().min(1).max(200),
  description: z.string().max(500).default(''),
  tx_id: z.string(),
});

export const FulfillPaymentLinkSchema = z.object({
  link_id: z.string(),
  purchase_commitment: z.string(),
  buyer_address_hash: z.string(),
  amount: z.number().positive(),
  tx_id: z.string(),
  payment_mode: z.enum(['private', 'escrow']),
});
