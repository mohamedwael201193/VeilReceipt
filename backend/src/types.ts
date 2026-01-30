// Type definitions for VeilReceipt backend

export type AleoAddress = `aleo1${string}`;
export type AleoField = `${string}field`;
export type AleoTransactionId = `at1${string}`;

// Merchant stored in JSON
export interface Merchant {
  id: string;
  walletAddress: AleoAddress;
  businessName: string;
  createdAt: string;
}

// Product stored in JSON
export interface Product {
  id: string;
  merchantId: string;
  merchantAddress: AleoAddress;
  name: string;
  description: string;
  price: number; // in microcredits
  sku: string;
  imageUrl?: string;
  category?: string;
  inStock: boolean;
  createdAt: string;
  updatedAt: string;
}

// Receipt metadata (not the actual receipt - that's on chain)
export interface ReceiptMeta {
  id: string;
  txId: AleoTransactionId;
  merchantAddress: AleoAddress;
  buyerAddress: AleoAddress;
  cartCommitment: AleoField;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
}

// Return request metadata
export interface ReturnRequest {
  id: string;
  txId: AleoTransactionId;
  nullifier: AleoField;
  originalReceiptTxId: AleoTransactionId;
  buyerAddress: AleoAddress;
  merchantAddress: AleoAddress;
  reason: string; // plaintext reason (hash stored on-chain)
  status: 'pending' | 'processed' | 'rejected';
  refundAmount: number;
  createdAt: string;
  processedAt?: string;
}

// Loyalty claim metadata
export interface LoyaltyClaim {
  id: string;
  txId: AleoTransactionId;
  nullifier: AleoField;
  buyerAddress: AleoAddress;
  tier: number;
  createdAt: string;
}

// Auth nonce for wallet signature verification
export interface AuthNonce {
  nonce: string;
  address: AleoAddress;
  createdAt: number;
  expiresAt: number;
}

// JWT payload
export interface JWTPayload {
  address: AleoAddress;
  role: 'merchant' | 'buyer';
  iat: number;
  exp: number;
}

// API request/response types
export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  sku: string;
  imageUrl?: string;
  category?: string;
}

export interface RecordTxEventRequest {
  txId: AleoTransactionId;
  type: 'purchase' | 'return' | 'loyalty';
  merchantAddress: AleoAddress;
  buyerAddress: AleoAddress;
  cartCommitment?: AleoField;
  totalAmount?: number;
  itemCount?: number;
  nullifier?: AleoField;
  tier?: number;
  reason?: string;
}

// Database structure (JSON files)
export interface Database {
  merchants: Merchant[];
  products: Product[];
  receiptMetas: ReceiptMeta[];
  returnRequests: ReturnRequest[];
  loyaltyClaims: LoyaltyClaim[];
  authNonces: AuthNonce[];
}
