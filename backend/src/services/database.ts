// JSON File Database Service
// Simple file-based persistence for MVP (no Postgres this wave)

import fs from 'fs';
import path from 'path';
import { Database, Merchant, Product, ReceiptMeta, ReturnRequest, LoyaltyClaim, AuthNonce } from '../types';

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Initialize empty database structure
const emptyDb: Database = {
  merchants: [],
  products: [],
  receiptMetas: [],
  returnRequests: [],
  loyaltyClaims: [],
  authNonces: []
};

// Ensure data directory and file exist
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(emptyDb, null, 2));
  }
}

// Read entire database
function readDb(): Database {
  ensureDataDir();
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data) as Database;
  } catch (error) {
    console.error('Error reading database, returning empty:', error);
    return { ...emptyDb };
  }
}

// Write entire database
function writeDb(db: Database): void {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ============ Merchants ============

export function getMerchants(): Merchant[] {
  return readDb().merchants;
}

export function getMerchantByAddress(address: string): Merchant | undefined {
  return readDb().merchants.find(m => m.walletAddress === address);
}

export function getMerchantById(id: string): Merchant | undefined {
  return readDb().merchants.find(m => m.id === id);
}

export function createMerchant(merchant: Merchant): Merchant {
  const db = readDb();
  db.merchants.push(merchant);
  writeDb(db);
  return merchant;
}

export function updateMerchant(id: string, updates: Partial<Merchant>): Merchant | undefined {
  const db = readDb();
  const index = db.merchants.findIndex(m => m.id === id);
  if (index === -1) return undefined;
  db.merchants[index] = { ...db.merchants[index], ...updates };
  writeDb(db);
  return db.merchants[index];
}

// ============ Products ============

export function getProducts(): Product[] {
  return readDb().products;
}

export function getProductsByMerchant(merchantId: string): Product[] {
  return readDb().products.filter(p => p.merchantId === merchantId);
}

export function getProductsByMerchantAddress(address: string): Product[] {
  return readDb().products.filter(p => p.merchantAddress === address);
}

export function getProductById(id: string): Product | undefined {
  return readDb().products.find(p => p.id === id);
}

export function getProductBySku(sku: string): Product | undefined {
  return readDb().products.find(p => p.sku === sku);
}

export function createProduct(product: Product): Product {
  const db = readDb();
  db.products.push(product);
  writeDb(db);
  return product;
}

export function updateProduct(id: string, updates: Partial<Product>): Product | undefined {
  const db = readDb();
  const index = db.products.findIndex(p => p.id === id);
  if (index === -1) return undefined;
  db.products[index] = { ...db.products[index], ...updates, updatedAt: new Date().toISOString() };
  writeDb(db);
  return db.products[index];
}

export function deleteProduct(id: string): boolean {
  const db = readDb();
  const index = db.products.findIndex(p => p.id === id);
  if (index === -1) return false;
  db.products.splice(index, 1);
  writeDb(db);
  return true;
}

// ============ Receipt Metadata ============

export function getReceiptMetas(): ReceiptMeta[] {
  return readDb().receiptMetas;
}

export function getReceiptMetasByBuyer(address: string): ReceiptMeta[] {
  return readDb().receiptMetas.filter(r => r.buyerAddress === address);
}

export function getReceiptMetasByMerchant(address: string): ReceiptMeta[] {
  return readDb().receiptMetas.filter(r => r.merchantAddress === address);
}

export function getReceiptMetaByTxId(txId: string): ReceiptMeta | undefined {
  return readDb().receiptMetas.find(r => r.txId === txId);
}

export function createReceiptMeta(meta: ReceiptMeta): ReceiptMeta {
  const db = readDb();
  db.receiptMetas.push(meta);
  writeDb(db);
  return meta;
}

// ============ Return Requests ============

export function getReturnRequests(): ReturnRequest[] {
  return readDb().returnRequests;
}

export function getReturnRequestsByBuyer(address: string): ReturnRequest[] {
  return readDb().returnRequests.filter(r => r.buyerAddress === address);
}

export function getReturnRequestsByMerchant(address: string): ReturnRequest[] {
  return readDb().returnRequests.filter(r => r.merchantAddress === address);
}

export function getReturnRequestByNullifier(nullifier: string): ReturnRequest | undefined {
  return readDb().returnRequests.find(r => r.nullifier === nullifier);
}

export function getReturnRequestByTxId(txId: string): ReturnRequest | undefined {
  return readDb().returnRequests.find(r => r.txId === txId);
}

export function createReturnRequest(request: ReturnRequest): ReturnRequest {
  const db = readDb();
  db.returnRequests.push(request);
  writeDb(db);
  return request;
}

export function updateReturnRequest(id: string, updates: Partial<ReturnRequest>): ReturnRequest | undefined {
  const db = readDb();
  const index = db.returnRequests.findIndex(r => r.id === id);
  if (index === -1) return undefined;
  db.returnRequests[index] = { ...db.returnRequests[index], ...updates };
  writeDb(db);
  return db.returnRequests[index];
}

// ============ Loyalty Claims ============

export function getLoyaltyClaims(): LoyaltyClaim[] {
  return readDb().loyaltyClaims;
}

export function getLoyaltyClaimsByBuyer(address: string): LoyaltyClaim[] {
  return readDb().loyaltyClaims.filter(l => l.buyerAddress === address);
}

export function getLoyaltyClaimByNullifier(nullifier: string): LoyaltyClaim | undefined {
  return readDb().loyaltyClaims.find(l => l.nullifier === nullifier);
}

export function createLoyaltyClaim(claim: LoyaltyClaim): LoyaltyClaim {
  const db = readDb();
  db.loyaltyClaims.push(claim);
  writeDb(db);
  return claim;
}

// ============ Auth Nonces ============

export function getAuthNonce(address: string): AuthNonce | undefined {
  const db = readDb();
  // Clean up expired nonces while we're at it
  const now = Date.now();
  db.authNonces = db.authNonces.filter(n => n.expiresAt > now);
  writeDb(db);
  return db.authNonces.find(n => n.address === address);
}

export function createAuthNonce(nonce: AuthNonce): AuthNonce {
  const db = readDb();
  // Remove any existing nonce for this address
  db.authNonces = db.authNonces.filter(n => n.address !== nonce.address);
  db.authNonces.push(nonce);
  writeDb(db);
  return nonce;
}

export function deleteAuthNonce(address: string): boolean {
  const db = readDb();
  const index = db.authNonces.findIndex(n => n.address === address);
  if (index === -1) return false;
  db.authNonces.splice(index, 1);
  writeDb(db);
  return true;
}

// ============ Stats ============

export function getMerchantStats(merchantAddress: string) {
  const db = readDb();
  const receipts = db.receiptMetas.filter(r => r.merchantAddress === merchantAddress);
  const returns = db.returnRequests.filter(r => r.merchantAddress === merchantAddress);
  const products = db.products.filter(p => p.merchantAddress === merchantAddress);

  const totalSales = receipts.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalRefunds = returns
    .filter(r => r.status === 'processed')
    .reduce((sum, r) => sum + r.refundAmount, 0);

  return {
    totalSales,
    totalRefunds,
    netSales: totalSales - totalRefunds,
    transactionCount: receipts.length,
    returnCount: returns.length,
    productCount: products.length
  };
}

// Initialize database on module load
ensureDataDir();
console.log('📦 JSON Database initialized at:', DB_FILE);
