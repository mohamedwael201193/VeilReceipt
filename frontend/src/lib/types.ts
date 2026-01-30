// Type definitions for VeilReceipt frontend

export type AleoAddress = `aleo1${string}`;
export type AleoField = `${string}field`;
export type AleoTransactionId = `at1${string}`;
export type Microcredits = bigint;

// Product from backend
export interface Product {
  id: string;
  merchantId: string;
  merchantAddress: AleoAddress;
  name: string;
  description: string;
  price: number; // microcredits
  sku: string;
  imageUrl?: string;
  category?: string;
  inStock: boolean;
  createdAt: string;
  updatedAt: string;
}

// Cart item
export interface CartItem {
  product: Product;
  quantity: number;
}

// Receipt record from chain (decrypted by wallet)
export interface ReceiptRecord {
  owner: AleoAddress;
  merchant: AleoAddress;
  total: bigint;
  cart_commitment: AleoField;
  timestamp: bigint;
  nonce_seed: AleoField;
  _nonce?: string; // Aleo record nonce
  _raw?: any; // Raw record data
  _plaintext?: string | null; // Record plaintext for contract calls
  _ciphertext?: string | null; // Record ciphertext
  _fromWallet?: boolean; // True if from wallet (can use for contract calls)
  // Backend fields
  txId?: string;
  onChainTxId?: string;
  blockHeight?: number;
  items?: any[];
  status?: string;
}

// Return claim record
export interface ReturnClaimRecord {
  owner: AleoAddress;
  original_receipt_hash: AleoField;
  return_reason_hash: AleoField;
  timestamp: bigint;
  refund_amount: bigint;
}

// Loyalty stamp record
export interface LoyaltyStampRecord {
  owner: AleoAddress;
  tier: number;
  earned_at: bigint;
  stamp_id: AleoField;
}

// Merchant from backend
export interface Merchant {
  id: string;
  walletAddress: AleoAddress;
  businessName: string;
  createdAt: string;
}

// Merchant stats
export interface MerchantStats {
  totalSales: number;
  totalRefunds: number;
  netSales: number;
  transactionCount: number;
  returnCount: number;
  productCount: number;
  onChainSalesTotal: number;
  address: AleoAddress;
}

// Receipt metadata from backend
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

// Return request from backend
export interface ReturnRequest {
  id: string;
  txId: AleoTransactionId;
  nullifier: AleoField;
  originalReceiptTxId: AleoTransactionId;
  buyerAddress: AleoAddress;
  merchantAddress: AleoAddress;
  reason: string;
  status: 'pending' | 'processed' | 'rejected';
  refundAmount: number;
  createdAt: string;
  processedAt?: string;
}

// Loyalty claim from backend
export interface LoyaltyClaim {
  id: string;
  txId: AleoTransactionId;
  nullifier: AleoField;
  buyerAddress: AleoAddress;
  tier: number;
  createdAt: string;
}

// Auth state
export interface AuthState {
  token: string | null;
  address: AleoAddress | null;
  role: 'merchant' | 'buyer' | null;
  isAuthenticated: boolean;
}

// Transaction status
export type TransactionStatus = 'idle' | 'signing' | 'pending' | 'confirmed' | 'failed';

// Loyalty tiers
export const LOYALTY_TIERS = {
  1: { name: 'Bronze', color: '#CD7F32', minSpend: 0 },
  2: { name: 'Silver', color: '#C0C0C0', minSpend: 1000000 },
  3: { name: 'Gold', color: '#FFD700', minSpend: 5000000 },
  4: { name: 'Platinum', color: '#E5E4E2', minSpend: 10000000 },
} as const;

// Return reasons
export const RETURN_REASONS = [
  { id: 'defective', label: 'Defective product' },
  { id: 'wrong_item', label: 'Wrong item received' },
  { id: 'not_as_described', label: 'Not as described' },
  { id: 'changed_mind', label: 'Changed my mind' },
  { id: 'other', label: 'Other' },
] as const;
