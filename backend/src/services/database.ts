// Database Service — PostgreSQL (production) / JSON file (local development)
// Automatically selects based on DATABASE_URL environment variable.

import { Pool, PoolClient } from 'pg';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import {
  JsonDatabase, Merchant, Product, ReceiptMeta, EscrowRecord,
  LoyaltyRecord, AuthNonce, PendingTransaction,
  MerchantApiKey, WebhookEndpoint, WebhookDelivery, PaymentSession, PaymentLink
} from '../types';

// ========== Configuration ==========
const DATABASE_URL = process.env.DATABASE_URL;
const IS_POSTGRES = !!DATABASE_URL;
const DB_PATH = path.join(__dirname, '..', 'data', 'database.json');

// ========== PostgreSQL Pool ==========
let pool: Pool | null = null;
if (IS_POSTGRES) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
  });
  console.log('📦 Database: PostgreSQL');
} else {
  console.log('📦 Database: JSON file (local dev)');
}

// ========== SHA-256 Helper ==========
export function hashAddress(address: string): string {
  return crypto.createHash('sha256').update(address).digest('hex');
}

// ========== PostgreSQL Init ==========
export async function initDatabase(): Promise<void> {
  if (!IS_POSTGRES || !pool) {
    // JSON mode — ensure file exists
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(DB_PATH)) {
      const empty: JsonDatabase = {
        merchants: [], products: [], receipts: [], escrows: [],
        loyalty: [], auth_nonces: [], pending_txs: [],
        api_keys: [], webhooks: [], webhook_deliveries: [], payment_sessions: [], payment_links: []
      };
      fs.writeFileSync(DB_PATH, JSON.stringify(empty, null, 2));
    }
    return;
  }

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS merchants (
        id TEXT PRIMARY KEY,
        address_hash TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        merchant_id TEXT NOT NULL,
        merchant_address TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        price BIGINT NOT NULL,
        price_type TEXT DEFAULT 'credits',
        sku TEXT DEFAULT '',
        image_url TEXT DEFAULT '',
        category TEXT DEFAULT 'general',
        in_stock BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      -- Migration: add price_type if missing
      ALTER TABLE products ADD COLUMN IF NOT EXISTS price_type TEXT DEFAULT 'credits';
      CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        purchase_commitment TEXT UNIQUE NOT NULL,
        buyer_address_hash TEXT NOT NULL,
        merchant_address_hash TEXT NOT NULL,
        total BIGINT NOT NULL,
        token_type SMALLINT DEFAULT 0,
        cart_commitment TEXT DEFAULT '',
        tx_id TEXT DEFAULT '',
        status TEXT DEFAULT 'confirmed',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS escrows (
        id TEXT PRIMARY KEY,
        purchase_commitment TEXT UNIQUE NOT NULL,
        buyer_address_hash TEXT NOT NULL,
        merchant_address_hash TEXT NOT NULL,
        total BIGINT NOT NULL,
        status TEXT DEFAULT 'active',
        escrow_tx_id TEXT DEFAULT '',
        resolve_tx_id TEXT DEFAULT '',
        created_block BIGINT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS loyalty (
        id TEXT PRIMARY KEY,
        address_hash TEXT NOT NULL,
        purchase_commitment TEXT NOT NULL,
        score BIGINT DEFAULT 1,
        total_spent BIGINT DEFAULT 0,
        tx_id TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS auth_nonces (
        nonce TEXT PRIMARY KEY,
        address TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL,
        used BOOLEAN DEFAULT FALSE
      );
      CREATE TABLE IF NOT EXISTS pending_txs (
        id TEXT PRIMARY KEY,
        tx_id TEXT UNIQUE NOT NULL,
        address_hash TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        confirmed_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_receipts_buyer ON receipts(buyer_address_hash);
      CREATE INDEX IF NOT EXISTS idx_receipts_merchant ON receipts(merchant_address_hash);
      CREATE INDEX IF NOT EXISTS idx_escrows_buyer ON escrows(buyer_address_hash);
      CREATE INDEX IF NOT EXISTS idx_pending_txs_status ON pending_txs(status);

      -- Integration API tables
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        merchant_id TEXT NOT NULL,
        api_key_hash TEXT UNIQUE NOT NULL,
        api_key_prefix TEXT NOT NULL,
        label TEXT NOT NULL DEFAULT '',
        permissions JSONB DEFAULT '["payments"]',
        is_active BOOLEAN DEFAULT TRUE,
        last_used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS webhooks (
        id TEXT PRIMARY KEY,
        merchant_id TEXT NOT NULL,
        url TEXT NOT NULL,
        secret_hash TEXT NOT NULL,
        events JSONB DEFAULT '["payment.confirmed"]',
        is_active BOOLEAN DEFAULT TRUE,
        failure_count INT DEFAULT 0,
        last_triggered_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS webhook_deliveries (
        id TEXT PRIMARY KEY,
        webhook_id TEXT NOT NULL,
        event TEXT NOT NULL,
        payload JSONB DEFAULT '{}',
        status TEXT DEFAULT 'pending',
        response_code INT,
        attempts INT DEFAULT 0,
        next_retry_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS payment_sessions (
        id TEXT PRIMARY KEY,
        merchant_id TEXT NOT NULL,
        merchant_address TEXT NOT NULL,
        amount BIGINT NOT NULL,
        currency TEXT DEFAULT 'credits',
        description TEXT DEFAULT '',
        metadata JSONB DEFAULT '{}',
        status TEXT DEFAULT 'pending',
        purchase_commitment TEXT,
        tx_id TEXT,
        payment_mode TEXT,
        redirect_url TEXT,
        cancel_url TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_api_keys_merchant ON api_keys(merchant_id);
      CREATE INDEX IF NOT EXISTS idx_webhooks_merchant ON webhooks(merchant_id);
      CREATE INDEX IF NOT EXISTS idx_payment_sessions_merchant ON payment_sessions(merchant_id);
      CREATE INDEX IF NOT EXISTS idx_payment_sessions_status ON payment_sessions(status);

      CREATE TABLE IF NOT EXISTS payment_links (
        id TEXT PRIMARY KEY,
        merchant_id TEXT NOT NULL,
        merchant_address TEXT NOT NULL,
        link_hash TEXT UNIQUE NOT NULL,
        amount BIGINT NOT NULL DEFAULT 0,
        currency TEXT DEFAULT 'credits',
        link_type TEXT NOT NULL DEFAULT 'one_time',
        label TEXT NOT NULL DEFAULT '',
        description TEXT DEFAULT '',
        is_active BOOLEAN DEFAULT TRUE,
        total_contributions INT DEFAULT 0,
        total_collected BIGINT DEFAULT 0,
        tx_id TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_payment_links_merchant ON payment_links(merchant_id);
      CREATE INDEX IF NOT EXISTS idx_payment_links_hash ON payment_links(link_hash);
    `);
    console.log('✅ PostgreSQL tables initialized');
  } finally {
    client.release();
  }
}

// ========== JSON Helpers ==========
function readJson(): JsonDatabase {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return { merchants: [], products: [], receipts: [], escrows: [], loyalty: [], auth_nonces: [], pending_txs: [], api_keys: [], webhooks: [], webhook_deliveries: [], payment_sessions: [], payment_links: [] };
  }
}

function writeJson(db: JsonDatabase): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ========== Products ==========
export async function getProducts(merchantAddress?: string): Promise<Product[]> {
  if (IS_POSTGRES && pool) {
    const query = merchantAddress
      ? 'SELECT * FROM products WHERE merchant_address = $1 ORDER BY created_at DESC'
      : 'SELECT * FROM products ORDER BY created_at DESC';
    const values = merchantAddress ? [merchantAddress] : [];
    const res = await pool.query(query, values);
    return res.rows;
  }
  const db = readJson();
  return merchantAddress
    ? db.products.filter(p => p.merchant_address === merchantAddress)
    : db.products;
}

export async function getProductById(id: string): Promise<Product | null> {
  if (IS_POSTGRES && pool) {
    const res = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    return res.rows[0] || null;
  }
  const db = readJson();
  return db.products.find(p => p.id === id) || null;
}

export async function createProduct(product: Omit<Product, 'id' | 'created_at'>): Promise<Product> {
  const id = uuid();
  const created_at = new Date().toISOString();
  const full: Product = { id, created_at, ...product } as Product;
  if (IS_POSTGRES && pool) {
    await pool.query(
      `INSERT INTO products (id, merchant_id, merchant_address, name, description, price, price_type, sku, image_url, category, in_stock, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [id, product.merchant_id, product.merchant_address, product.name, product.description,
       product.price, product.price_type || 'credits', product.sku, product.image_url, product.category, product.in_stock, created_at]
    );
    return full;
  }
  const db = readJson();
  db.products.push(full);
  writeJson(db);
  return full;
}

// ========== Receipts ==========
export async function createReceipt(receipt: Omit<ReceiptMeta, 'id' | 'created_at'>): Promise<ReceiptMeta> {
  const id = uuid();
  const created_at = new Date().toISOString();
  const full: ReceiptMeta = { id, created_at, ...receipt } as ReceiptMeta;
  if (IS_POSTGRES && pool) {
    await pool.query(
      `INSERT INTO receipts (id, purchase_commitment, buyer_address_hash, merchant_address_hash, total, token_type, cart_commitment, tx_id, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, receipt.purchase_commitment, receipt.buyer_address_hash, receipt.merchant_address_hash,
       receipt.total, receipt.token_type, receipt.cart_commitment, receipt.tx_id, receipt.status, created_at]
    );
    return full;
  }
  const db = readJson();
  db.receipts.push(full);
  writeJson(db);
  return full;
}

export async function getReceiptsByBuyer(buyerHash: string): Promise<ReceiptMeta[]> {
  if (IS_POSTGRES && pool) {
    const res = await pool.query(
      'SELECT * FROM receipts WHERE buyer_address_hash = $1 ORDER BY created_at DESC', [buyerHash]
    );
    return res.rows;
  }
  return readJson().receipts.filter(r => r.buyer_address_hash === buyerHash);
}

export async function getReceiptByCommitment(commitment: string): Promise<ReceiptMeta | null> {
  if (IS_POSTGRES && pool) {
    const res = await pool.query('SELECT * FROM receipts WHERE purchase_commitment = $1', [commitment]);
    return res.rows[0] || null;
  }
  return readJson().receipts.find(r => r.purchase_commitment === commitment) || null;
}

export async function getReceiptsByMerchant(merchantHash: string): Promise<ReceiptMeta[]> {
  if (IS_POSTGRES && pool) {
    const res = await pool.query(
      'SELECT * FROM receipts WHERE merchant_address_hash = $1 ORDER BY created_at DESC', [merchantHash]
    );
    return res.rows;
  }
  return readJson().receipts.filter(r => r.merchant_address_hash === merchantHash);
}

// ========== Escrows ==========
export async function createEscrow(escrow: Omit<EscrowRecord, 'id' | 'created_at' | 'status' | 'resolve_tx_id'>): Promise<EscrowRecord> {
  const id = uuid();
  const created_at = new Date().toISOString();
  const full: EscrowRecord = { id, created_at, status: 'active', resolve_tx_id: '', ...escrow } as EscrowRecord;
  if (IS_POSTGRES && pool) {
    await pool.query(
      `INSERT INTO escrows (id, purchase_commitment, buyer_address_hash, merchant_address_hash, total, status, escrow_tx_id, created_block, created_at)
       VALUES ($1,$2,$3,$4,$5,'active',$6,$7,$8)`,
      [id, escrow.purchase_commitment, escrow.buyer_address_hash, escrow.merchant_address_hash,
       escrow.total, escrow.escrow_tx_id, escrow.created_block, created_at]
    );
    return full;
  }
  const db = readJson();
  db.escrows.push(full);
  writeJson(db);
  return full;
}

export async function resolveEscrow(commitment: string, status: 'completed' | 'refunded', resolveTxId: string): Promise<void> {
  if (IS_POSTGRES && pool) {
    await pool.query(
      'UPDATE escrows SET status = $1, resolve_tx_id = $2 WHERE purchase_commitment = $3',
      [status, resolveTxId, commitment]
    );
    return;
  }
  const db = readJson();
  const e = db.escrows.find(x => x.purchase_commitment === commitment);
  if (e) { e.status = status; e.resolve_tx_id = resolveTxId; }
  writeJson(db);
}

export async function getEscrowByCommitment(commitment: string): Promise<EscrowRecord | null> {
  if (IS_POSTGRES && pool) {
    const res = await pool.query('SELECT * FROM escrows WHERE purchase_commitment = $1', [commitment]);
    return res.rows[0] || null;
  }
  return readJson().escrows.find(e => e.purchase_commitment === commitment) || null;
}

export async function getEscrowsByBuyer(buyerHash: string): Promise<EscrowRecord[]> {
  if (IS_POSTGRES && pool) {
    const res = await pool.query(
      'SELECT * FROM escrows WHERE buyer_address_hash = $1 ORDER BY created_at DESC', [buyerHash]
    );
    return res.rows;
  }
  return readJson().escrows.filter(e => e.buyer_address_hash === buyerHash);
}

// ========== Loyalty ==========
export async function createLoyalty(loyalty: Omit<LoyaltyRecord, 'id' | 'created_at'>): Promise<LoyaltyRecord> {
  const id = uuid();
  const created_at = new Date().toISOString();
  const full: LoyaltyRecord = { id, created_at, ...loyalty } as LoyaltyRecord;
  if (IS_POSTGRES && pool) {
    await pool.query(
      `INSERT INTO loyalty (id, address_hash, purchase_commitment, score, total_spent, tx_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, loyalty.address_hash, loyalty.purchase_commitment, loyalty.score, loyalty.total_spent, loyalty.tx_id, created_at]
    );
    return full;
  }
  const db = readJson();
  db.loyalty.push(full);
  writeJson(db);
  return full;
}

export async function getLoyaltyByAddress(addressHash: string): Promise<LoyaltyRecord[]> {
  if (IS_POSTGRES && pool) {
    const res = await pool.query(
      'SELECT * FROM loyalty WHERE address_hash = $1 ORDER BY created_at DESC', [addressHash]
    );
    return res.rows;
  }
  return readJson().loyalty.filter(l => l.address_hash === addressHash);
}

// ========== Auth Nonces ==========
export async function createAuthNonce(address: string): Promise<string> {
  const nonce = uuid();
  const now = Date.now();
  const expiresAt = now + 5 * 60 * 1000; // 5 minutes
  if (IS_POSTGRES && pool) {
    await pool.query(
      'INSERT INTO auth_nonces (nonce, address, created_at, expires_at) VALUES ($1,$2,$3,$4)',
      [nonce, address, now, expiresAt]
    );
    return nonce;
  }
  const db = readJson();
  db.auth_nonces.push({ nonce, address, created_at: now, expires_at: expiresAt, used: false });
  writeJson(db);
  return nonce;
}

export async function verifyAndConsumeNonce(nonce: string): Promise<{ address: string } | null> {
  const now = Date.now();
  if (IS_POSTGRES && pool) {
    const res = await pool.query(
      'SELECT * FROM auth_nonces WHERE nonce = $1 AND used = FALSE AND expires_at > $2',
      [nonce, now]
    );
    if (res.rows.length === 0) return null;
    await pool.query('UPDATE auth_nonces SET used = TRUE WHERE nonce = $1', [nonce]);
    return { address: res.rows[0].address };
  }
  const db = readJson();
  const entry = db.auth_nonces.find(n => n.nonce === nonce && !n.used && n.expires_at > now);
  if (!entry) return null;
  entry.used = true;
  writeJson(db);
  return { address: entry.address };
}

// ========== Pending Transactions ==========
export async function createPendingTx(tx: Omit<PendingTransaction, 'id' | 'created_at' | 'confirmed_at' | 'status'>): Promise<PendingTransaction> {
  const id = uuid();
  const created_at = new Date().toISOString();
  const full: PendingTransaction = { id, created_at, status: 'pending', confirmed_at: null, ...tx } as PendingTransaction;
  if (IS_POSTGRES && pool) {
    await pool.query(
      `INSERT INTO pending_txs (id, tx_id, address_hash, type, status, metadata, created_at)
       VALUES ($1,$2,$3,$4,'pending',$5,$6)`,
      [id, tx.tx_id, tx.address_hash, tx.type, JSON.stringify(tx.metadata), created_at]
    );
    return full;
  }
  const db = readJson();
  db.pending_txs.push(full);
  writeJson(db);
  return full;
}

export async function confirmPendingTx(txId: string): Promise<void> {
  const now = new Date().toISOString();
  if (IS_POSTGRES && pool) {
    await pool.query(
      'UPDATE pending_txs SET status = $1, confirmed_at = $2 WHERE tx_id = $3',
      ['confirmed', now, txId]
    );
    return;
  }
  const db = readJson();
  const tx = db.pending_txs.find(t => t.tx_id === txId);
  if (tx) { tx.status = 'confirmed'; tx.confirmed_at = now; }
  writeJson(db);
}

export async function getPendingTxsByAddress(addressHash: string): Promise<PendingTransaction[]> {
  if (IS_POSTGRES && pool) {
    const res = await pool.query(
      'SELECT * FROM pending_txs WHERE address_hash = $1 ORDER BY created_at DESC LIMIT 50',
      [addressHash]
    );
    return res.rows;
  }
  return readJson().pending_txs.filter(t => t.address_hash === addressHash);
}

// ========== Merchants ==========
export async function getOrCreateMerchant(address: string, name: string, category = 'general'): Promise<Merchant> {
  const addressHash = hashAddress(address);
  if (IS_POSTGRES && pool) {
    const existing = await pool.query('SELECT * FROM merchants WHERE address_hash = $1', [addressHash]);
    if (existing.rows.length > 0) return existing.rows[0];
    const id = uuid();
    const created_at = new Date().toISOString();
    await pool.query(
      'INSERT INTO merchants (id, address_hash, name, category, created_at) VALUES ($1,$2,$3,$4,$5)',
      [id, addressHash, name, category, created_at]
    );
    return { id, address_hash: addressHash, name, category, created_at };
  }
  const db = readJson();
  let m = db.merchants.find(x => x.address_hash === addressHash);
  if (!m) {
    m = { id: uuid(), address_hash: addressHash, name, category, created_at: new Date().toISOString() };
    db.merchants.push(m);
    writeJson(db);
  }
  return m;
}

export async function getMerchantById(id: string): Promise<Merchant | null> {
  if (IS_POSTGRES && pool) {
    const res = await pool.query('SELECT * FROM merchants WHERE id = $1', [id]);
    return res.rows[0] || null;
  }
  return readJson().merchants.find(m => m.id === id) || null;
}

export async function getMerchantByAddressHash(addressHash: string): Promise<Merchant | null> {
  if (IS_POSTGRES && pool) {
    const res = await pool.query('SELECT * FROM merchants WHERE address_hash = $1', [addressHash]);
    return res.rows[0] || null;
  }
  return readJson().merchants.find(m => m.address_hash === addressHash) || null;
}

// ========== API Keys ==========
export async function createApiKey(data: Omit<MerchantApiKey, 'id' | 'created_at' | 'is_active' | 'last_used_at'>): Promise<MerchantApiKey> {
  const id = uuid();
  const created_at = new Date().toISOString();
  const full: MerchantApiKey = { id, created_at, is_active: true, last_used_at: null, ...data };
  if (IS_POSTGRES && pool) {
    await pool.query(
      `INSERT INTO api_keys (id, merchant_id, api_key_hash, api_key_prefix, label, permissions, is_active, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7)`,
      [id, data.merchant_id, data.api_key_hash, data.api_key_prefix, data.label, JSON.stringify(data.permissions), created_at]
    );
    return full;
  }
  const db = readJson();
  db.api_keys.push(full);
  writeJson(db);
  return full;
}

export async function getApiKeysByMerchant(merchantId: string): Promise<MerchantApiKey[]> {
  if (IS_POSTGRES && pool) {
    const res = await pool.query('SELECT * FROM api_keys WHERE merchant_id = $1 ORDER BY created_at DESC', [merchantId]);
    return res.rows;
  }
  return readJson().api_keys.filter(k => k.merchant_id === merchantId);
}

export async function getApiKeyByHash(keyHash: string): Promise<MerchantApiKey | null> {
  if (IS_POSTGRES && pool) {
    const res = await pool.query('SELECT * FROM api_keys WHERE api_key_hash = $1 AND is_active = TRUE', [keyHash]);
    return res.rows[0] || null;
  }
  return readJson().api_keys.find(k => k.api_key_hash === keyHash && k.is_active) || null;
}

export async function revokeApiKey(id: string, merchantId: string): Promise<boolean> {
  if (IS_POSTGRES && pool) {
    const res = await pool.query('UPDATE api_keys SET is_active = FALSE WHERE id = $1 AND merchant_id = $2', [id, merchantId]);
    return (res.rowCount ?? 0) > 0;
  }
  const db = readJson();
  const key = db.api_keys.find(k => k.id === id && k.merchant_id === merchantId);
  if (!key) return false;
  key.is_active = false;
  writeJson(db);
  return true;
}

export async function touchApiKeyUsage(keyHash: string): Promise<void> {
  const now = new Date().toISOString();
  if (IS_POSTGRES && pool) {
    await pool.query('UPDATE api_keys SET last_used_at = $1 WHERE api_key_hash = $2', [now, keyHash]);
    return;
  }
  const db = readJson();
  const key = db.api_keys.find(k => k.api_key_hash === keyHash);
  if (key) key.last_used_at = now;
  writeJson(db);
}

// ========== Webhooks ==========
export async function createWebhook(data: Omit<WebhookEndpoint, 'id' | 'created_at' | 'is_active' | 'failure_count' | 'last_triggered_at'>): Promise<WebhookEndpoint> {
  const id = uuid();
  const created_at = new Date().toISOString();
  const full: WebhookEndpoint = { id, created_at, is_active: true, failure_count: 0, last_triggered_at: null, ...data };
  if (IS_POSTGRES && pool) {
    await pool.query(
      `INSERT INTO webhooks (id, merchant_id, url, secret_hash, events, is_active, created_at)
       VALUES ($1,$2,$3,$4,$5,TRUE,$6)`,
      [id, data.merchant_id, data.url, data.secret_hash, JSON.stringify(data.events), created_at]
    );
    return full;
  }
  const db = readJson();
  db.webhooks.push(full);
  writeJson(db);
  return full;
}

export async function getWebhooksByMerchant(merchantId: string): Promise<WebhookEndpoint[]> {
  if (IS_POSTGRES && pool) {
    const res = await pool.query('SELECT * FROM webhooks WHERE merchant_id = $1 ORDER BY created_at DESC', [merchantId]);
    return res.rows;
  }
  return readJson().webhooks.filter(w => w.merchant_id === merchantId);
}

export async function getActiveWebhooksForEvent(merchantId: string, event: string): Promise<WebhookEndpoint[]> {
  if (IS_POSTGRES && pool) {
    const res = await pool.query(
      `SELECT * FROM webhooks WHERE merchant_id = $1 AND is_active = TRUE AND events ? $2`,
      [merchantId, event]
    );
    return res.rows;
  }
  return readJson().webhooks.filter(w => w.merchant_id === merchantId && w.is_active && w.events.includes(event));
}

export async function deleteWebhook(id: string, merchantId: string): Promise<boolean> {
  if (IS_POSTGRES && pool) {
    const res = await pool.query('DELETE FROM webhooks WHERE id = $1 AND merchant_id = $2', [id, merchantId]);
    return (res.rowCount ?? 0) > 0;
  }
  const db = readJson();
  const idx = db.webhooks.findIndex(w => w.id === id && w.merchant_id === merchantId);
  if (idx === -1) return false;
  db.webhooks.splice(idx, 1);
  writeJson(db);
  return true;
}

export async function incrementWebhookFailure(id: string): Promise<void> {
  if (IS_POSTGRES && pool) {
    await pool.query(
      'UPDATE webhooks SET failure_count = failure_count + 1, is_active = (failure_count + 1 < 10) WHERE id = $1',
      [id]
    );
    return;
  }
  const db = readJson();
  const wh = db.webhooks.find(w => w.id === id);
  if (wh) {
    wh.failure_count++;
    if (wh.failure_count >= 10) wh.is_active = false;
  }
  writeJson(db);
}

export async function resetWebhookFailure(id: string): Promise<void> {
  const now = new Date().toISOString();
  if (IS_POSTGRES && pool) {
    await pool.query('UPDATE webhooks SET failure_count = 0, last_triggered_at = $1 WHERE id = $2', [now, id]);
    return;
  }
  const db = readJson();
  const wh = db.webhooks.find(w => w.id === id);
  if (wh) { wh.failure_count = 0; wh.last_triggered_at = now; }
  writeJson(db);
}

// ========== Webhook Deliveries ==========
export async function createWebhookDelivery(data: Omit<WebhookDelivery, 'id' | 'created_at' | 'status' | 'response_code' | 'attempts' | 'next_retry_at'>): Promise<WebhookDelivery> {
  const id = uuid();
  const created_at = new Date().toISOString();
  const full: WebhookDelivery = { id, created_at, status: 'pending', response_code: null, attempts: 0, next_retry_at: null, ...data };
  if (IS_POSTGRES && pool) {
    await pool.query(
      `INSERT INTO webhook_deliveries (id, webhook_id, event, payload, status, attempts, created_at)
       VALUES ($1,$2,$3,$4,'pending',0,$5)`,
      [id, data.webhook_id, data.event, JSON.stringify(data.payload), created_at]
    );
    return full;
  }
  const db = readJson();
  db.webhook_deliveries.push(full);
  writeJson(db);
  return full;
}

export async function updateWebhookDelivery(id: string, status: 'delivered' | 'failed', responseCode: number | null): Promise<void> {
  if (IS_POSTGRES && pool) {
    await pool.query(
      'UPDATE webhook_deliveries SET status = $1, response_code = $2, attempts = attempts + 1 WHERE id = $3',
      [status, responseCode, id]
    );
    return;
  }
  const db = readJson();
  const d = db.webhook_deliveries.find(x => x.id === id);
  if (d) { d.status = status; d.response_code = responseCode; d.attempts++; }
  writeJson(db);
}

// ========== Payment Sessions ==========
export async function createPaymentSession(data: Omit<PaymentSession, 'id' | 'created_at' | 'status' | 'purchase_commitment' | 'tx_id' | 'payment_mode'>): Promise<PaymentSession> {
  const id = 'ps_' + uuid().replace(/-/g, '');
  const created_at = new Date().toISOString();
  const full: PaymentSession = {
    id, created_at, status: 'pending',
    purchase_commitment: null, tx_id: null, payment_mode: null,
    ...data,
  };
  if (IS_POSTGRES && pool) {
    await pool.query(
      `INSERT INTO payment_sessions (id, merchant_id, merchant_address, amount, currency, description, metadata, status, redirect_url, cancel_url, expires_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8,$9,$10,$11)`,
      [id, data.merchant_id, data.merchant_address, data.amount, data.currency, data.description,
       JSON.stringify(data.metadata), data.redirect_url, data.cancel_url, data.expires_at, created_at]
    );
    return full;
  }
  const db = readJson();
  db.payment_sessions.push(full);
  writeJson(db);
  return full;
}

export async function getPaymentSession(id: string): Promise<PaymentSession | null> {
  if (IS_POSTGRES && pool) {
    const res = await pool.query('SELECT * FROM payment_sessions WHERE id = $1', [id]);
    return res.rows[0] || null;
  }
  return readJson().payment_sessions.find(s => s.id === id) || null;
}

export async function completePaymentSession(id: string, data: { purchase_commitment: string; tx_id: string; payment_mode: string }): Promise<PaymentSession | null> {
  if (IS_POSTGRES && pool) {
    const res = await pool.query(
      `UPDATE payment_sessions SET status = 'completed', purchase_commitment = $1, tx_id = $2, payment_mode = $3
       WHERE id = $4 AND status = 'pending' RETURNING *`,
      [data.purchase_commitment, data.tx_id, data.payment_mode, id]
    );
    return res.rows[0] || null;
  }
  const db = readJson();
  const session = db.payment_sessions.find(s => s.id === id && s.status === 'pending');
  if (!session) return null;
  session.status = 'completed';
  session.purchase_commitment = data.purchase_commitment;
  session.tx_id = data.tx_id;
  session.payment_mode = data.payment_mode as 'private' | 'public' | 'escrow';
  writeJson(db);
  return session;
}

export async function getPaymentSessionsByMerchant(merchantId: string): Promise<PaymentSession[]> {
  if (IS_POSTGRES && pool) {
    const res = await pool.query(
      'SELECT * FROM payment_sessions WHERE merchant_id = $1 ORDER BY created_at DESC LIMIT 100',
      [merchantId]
    );
    return res.rows;
  }
  return readJson().payment_sessions.filter(s => s.merchant_id === merchantId);
}

// ========== Payment Links ==========
export async function createPaymentLink(data: Omit<PaymentLink, 'id' | 'created_at' | 'is_active' | 'total_contributions' | 'total_collected'>): Promise<PaymentLink> {
  const id = 'pl_' + uuid().replace(/-/g, '');
  const created_at = new Date().toISOString();
  const full: PaymentLink = {
    id, created_at, is_active: true, total_contributions: 0, total_collected: 0,
    ...data,
  };
  if (IS_POSTGRES && pool) {
    await pool.query(
      `INSERT INTO payment_links (id, merchant_id, merchant_address, link_hash, amount, currency, link_type, label, description, is_active, tx_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE,$10,$11)`,
      [id, data.merchant_id, data.merchant_address, data.link_hash, data.amount, data.currency,
       data.link_type, data.label, data.description, data.tx_id, created_at]
    );
    return full;
  }
  const db = readJson();
  db.payment_links.push(full);
  writeJson(db);
  return full;
}

export async function getPaymentLinkByHash(linkHash: string): Promise<PaymentLink | null> {
  if (IS_POSTGRES && pool) {
    const res = await pool.query('SELECT * FROM payment_links WHERE link_hash = $1', [linkHash]);
    return res.rows[0] || null;
  }
  return readJson().payment_links.find(l => l.link_hash === linkHash) || null;
}

export async function getPaymentLink(id: string): Promise<PaymentLink | null> {
  if (IS_POSTGRES && pool) {
    const res = await pool.query('SELECT * FROM payment_links WHERE id = $1', [id]);
    return res.rows[0] || null;
  }
  return readJson().payment_links.find(l => l.id === id) || null;
}

export async function getPaymentLinksByMerchant(merchantId: string): Promise<PaymentLink[]> {
  if (IS_POSTGRES && pool) {
    const res = await pool.query(
      'SELECT * FROM payment_links WHERE merchant_id = $1 ORDER BY created_at DESC LIMIT 100',
      [merchantId]
    );
    return res.rows;
  }
  return readJson().payment_links.filter(l => l.merchant_id === merchantId);
}

export async function closePaymentLink(id: string, merchantId: string): Promise<PaymentLink | null> {
  if (IS_POSTGRES && pool) {
    const res = await pool.query(
      `UPDATE payment_links SET is_active = FALSE WHERE id = $1 AND merchant_id = $2 RETURNING *`,
      [id, merchantId]
    );
    return res.rows[0] || null;
  }
  const db = readJson();
  const link = db.payment_links.find(l => l.id === id && l.merchant_id === merchantId);
  if (!link) return null;
  link.is_active = false;
  writeJson(db);
  return link;
}

export async function recordLinkContribution(linkHash: string, amount: number): Promise<PaymentLink | null> {
  if (IS_POSTGRES && pool) {
    const res = await pool.query(
      `UPDATE payment_links SET total_contributions = total_contributions + 1, total_collected = total_collected + $1
       WHERE link_hash = $2 AND is_active = TRUE RETURNING *`,
      [amount, linkHash]
    );
    const link = res.rows[0] || null;
    if (link && link.link_type === 'one_time') {
      await pool.query('UPDATE payment_links SET is_active = FALSE WHERE link_hash = $1', [linkHash]);
      link.is_active = false;
    }
    return link;
  }
  const db = readJson();
  const link = db.payment_links.find(l => l.link_hash === linkHash && l.is_active);
  if (!link) return null;
  link.total_contributions += 1;
  link.total_collected += amount;
  if (link.link_type === 'one_time') link.is_active = false;
  writeJson(db);
  return link;
}

export { IS_POSTGRES, pool };
