// Type definitions for VeilReceipt v3 backend

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
  price_type: 'credits' | 'usdcx'; // credits = Aleo Credits, usdcx = USDCx Stablecoin
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
  token_type: number; // 0 = Credits, 1 = USDCx
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

// ========== JSON Database Structure ==========
export interface JsonDatabase {
  merchants: Merchant[];
  products: Product[];
  receipts: ReceiptMeta[];
  escrows: EscrowRecord[];
  loyalty: LoyaltyRecord[];
  auth_nonces: AuthNonce[];
  pending_txs: PendingTransaction[];
}

// ========== Zod Schemas ==========

export const CreateReceiptSchema = z.object({
  purchase_commitment: z.string(),
  buyer_address_hash: z.string(),
  merchant_address_hash: z.string(),
  total: z.number(),
  token_type: z.number().min(0).max(1),
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
  price_type: z.enum(['credits', 'usdcx']).default('credits'),
  sku: z.string(),
  image_url: z.string().optional().default(''),
  category: z.string().optional().default('general'),
});
