// VeilReceipt SDK — Accept private payments on Aleo
// https://github.com/veilreceipt

export type {
  AleoAddress,
  AleoField,
  AleoTransactionId,
  VeilReceiptConfig,
  PaymentSession,
  CompleteSessionParams,
  SessionResult,
  PaymentLink,
  PaymentLinkPublic,
  CreatePaymentLinkParams,
  FulfillLinkParams,
  Product,
  CreateProductParams,
  Receipt,
  Escrow,
  StoreReceiptParams,
  VerificationResult,
  ApiKey,
  Webhook,
  ProvingHealth,
  DelegateProofParams,
  TxStatus,
} from './types';

import type {
  VeilReceiptConfig,
  PaymentSession,
  CompleteSessionParams,
  SessionResult,
  PaymentLink,
  PaymentLinkPublic,
  CreatePaymentLinkParams,
  FulfillLinkParams,
  Product,
  CreateProductParams,
  Receipt,
  Escrow,
  StoreReceiptParams,
  VerificationResult,
  ApiKey,
  Webhook,
  ProvingHealth,
  DelegateProofParams,
  TxStatus,
} from './types';

class VeilReceiptError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'VeilReceiptError';
  }
}

export { VeilReceiptError };

/**
 * VeilReceipt SDK Client
 *
 * ```ts
 * import { VeilReceipt } from '@veilreceipt/sdk';
 *
 * const veil = new VeilReceipt({
 *   baseUrl: 'https://api.veilreceipt.com',
 *   apiKey: 'vr_live_...',
 * });
 *
 * // Get a payment session
 * const session = await veil.getPaymentSession('sess_abc123');
 *
 * // Resolve a payment link
 * const link = await veil.resolvePaymentLink('a1b2c3d4');
 * ```
 */
export class VeilReceipt {
  private baseUrl: string;
  private apiKey?: string;
  private token?: string;
  private timeout: number;

  constructor(config: VeilReceiptConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.token = config.token;
    this.timeout = config.timeout ?? 30_000;
  }

  /** Update the auth token (e.g. after login) */
  setToken(token: string | null) {
    this.token = token ?? undefined;
  }

  /** Update the API key */
  setApiKey(key: string | null) {
    this.apiKey = key ?? undefined;
  }

  // ───────────────────────────────────────
  // Internal
  // ───────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new VeilReceiptError(
          (data as { error?: string }).error || `Request failed: ${res.status}`,
          res.status
        );
      }

      return data as T;
    } finally {
      clearTimeout(timer);
    }
  }

  // ───────────────────────────────────────
  // Health
  // ───────────────────────────────────────

  /** Check API health */
  async health(): Promise<{ status: string; timestamp: string }> {
    return this.request('GET', '/health');
  }

  // ───────────────────────────────────────
  // Payment Sessions
  // ───────────────────────────────────────

  /** Get details of a payment session */
  async getPaymentSession(sessionId: string): Promise<PaymentSession> {
    return this.request('GET', `/integrate/payments/${encodeURIComponent(sessionId)}`);
  }

  /** Complete a payment session after on-chain tx */
  async completePaymentSession(
    sessionId: string,
    params: CompleteSessionParams
  ): Promise<SessionResult> {
    return this.request('POST', `/integrate/payments/${encodeURIComponent(sessionId)}/complete`, params);
  }

  // ───────────────────────────────────────
  // Payment Links
  // ───────────────────────────────────────

  /** Create a new payment link (requires merchant auth) */
  async createPaymentLink(params: CreatePaymentLinkParams): Promise<PaymentLink> {
    return this.request('POST', '/links', params);
  }

  /** List payment links for the authenticated merchant */
  async listPaymentLinks(): Promise<PaymentLink[]> {
    return this.request('GET', '/links');
  }

  /** Resolve a payment link by its public hash (no auth required) */
  async resolvePaymentLink(hash: string): Promise<PaymentLinkPublic> {
    return this.request('GET', `/links/resolve/${encodeURIComponent(hash)}`);
  }

  /** Get a specific payment link by ID */
  async getPaymentLink(id: string): Promise<PaymentLink> {
    return this.request('GET', `/links/${encodeURIComponent(id)}`);
  }

  /** Record a link fulfillment after on-chain tx */
  async fulfillPaymentLink(
    id: string,
    params: FulfillLinkParams
  ): Promise<{ success: boolean }> {
    return this.request('POST', `/links/${encodeURIComponent(id)}/fulfill`, params);
  }

  /** Close/deactivate a payment link (merchant only) */
  async closePaymentLink(id: string): Promise<{ success: boolean }> {
    return this.request('POST', `/links/${encodeURIComponent(id)}/close`);
  }

  // ───────────────────────────────────────
  // Products
  // ───────────────────────────────────────

  /** List products, optionally filtered */
  async getProducts(filters?: {
    merchant?: string;
    category?: string;
    inStock?: boolean;
  }): Promise<{ products: Product[] }> {
    const params = new URLSearchParams();
    if (filters?.merchant) params.set('merchant', filters.merchant);
    if (filters?.category) params.set('category', filters.category);
    if (filters?.inStock !== undefined) params.set('inStock', String(filters.inStock));
    const q = params.toString();
    return this.request('GET', `/products${q ? `?${q}` : ''}`);
  }

  /** Get a single product by ID */
  async getProduct(id: string): Promise<{ product: Product }> {
    return this.request('GET', `/products/${encodeURIComponent(id)}`);
  }

  /** Create a product (merchant auth required) */
  async createProduct(params: CreateProductParams): Promise<{ product: Product }> {
    return this.request('POST', '/products', params);
  }

  /** Update a product (merchant auth required) */
  async updateProduct(
    id: string,
    params: Partial<{
      name: string;
      description: string;
      price: number;
      imageUrl: string;
      category: string;
      inStock: boolean;
    }>
  ): Promise<{ product: Product }> {
    return this.request('PUT', `/products/${encodeURIComponent(id)}`, params);
  }

  /** Delete a product (merchant auth required) */
  async deleteProduct(id: string): Promise<{ success: boolean }> {
    return this.request('DELETE', `/products/${encodeURIComponent(id)}`);
  }

  // ───────────────────────────────────────
  // Receipts
  // ───────────────────────────────────────

  /** Store receipt metadata */
  async storeReceipt(params: StoreReceiptParams): Promise<{ receipt: Receipt }> {
    return this.request('POST', '/receipts', params);
  }

  /** Get all receipts for authenticated user */
  async getReceipts(): Promise<{ receipts: Receipt[]; count: number }> {
    return this.request('GET', '/receipts');
  }

  /** Get receipts by buyer address */
  async getReceiptsByBuyer(address: string): Promise<{ receipts: Receipt[]; count: number }> {
    return this.request('GET', `/receipts/buyer/${encodeURIComponent(address)}`);
  }

  /** Get a receipt by transaction ID */
  async getReceiptByTxId(txId: string): Promise<{ receipt: Receipt }> {
    return this.request('GET', `/receipts/tx/${encodeURIComponent(txId)}`);
  }

  // ───────────────────────────────────────
  // Escrow
  // ───────────────────────────────────────

  /** Create an escrow record */
  async createEscrow(params: {
    purchaseCommitment: string;
    buyerAddress: string;
    merchantAddress: string;
    total: number;
    txId: string;
  }): Promise<{ escrow: Escrow }> {
    return this.request('POST', '/escrow', params);
  }

  /** Resolve an escrow (complete or refund) */
  async resolveEscrow(
    id: string,
    action: 'complete' | 'refund',
    txId: string
  ): Promise<{ escrow: Escrow }> {
    return this.request('POST', `/escrow/${encodeURIComponent(id)}/resolve`, { action, txId });
  }

  /** Get escrows for authenticated user */
  async getMyEscrows(): Promise<{ escrows: Escrow[] }> {
    return this.request('GET', '/escrow/my');
  }

  // ───────────────────────────────────────
  // Verification
  // ───────────────────────────────────────

  /** Verify a purchase commitment on-chain */
  async verifyPurchase(commitment: string): Promise<VerificationResult> {
    return this.request('GET', `/integrate/verify/${encodeURIComponent(commitment)}`);
  }

  // ───────────────────────────────────────
  // Transaction Status
  // ───────────────────────────────────────

  /** Check transaction status on-chain */
  async getTransactionStatus(txId: string): Promise<TxStatus> {
    return this.request('GET', `/tx/${encodeURIComponent(txId)}/status`);
  }

  /** Get current chain block height */
  async getChainHeight(): Promise<{ height: number }> {
    return this.request('GET', '/chain/height');
  }

  // ───────────────────────────────────────
  // API Keys (merchant dashboard)
  // ───────────────────────────────────────

  /** Create an API key */
  async createApiKey(label: string, permissions: string[]): Promise<ApiKey & { key: string; warning: string }> {
    return this.request('POST', '/integrate/keys', { label, permissions });
  }

  /** List API keys */
  async listApiKeys(): Promise<{ keys: ApiKey[] }> {
    return this.request('GET', '/integrate/keys');
  }

  /** Revoke an API key */
  async revokeApiKey(id: string): Promise<{ success: boolean }> {
    return this.request('DELETE', `/integrate/keys/${encodeURIComponent(id)}`);
  }

  // ───────────────────────────────────────
  // Webhooks (merchant dashboard)
  // ───────────────────────────────────────

  /** Create a webhook */
  async createWebhook(
    url: string,
    events: string[]
  ): Promise<Webhook & { signing_secret: string; warning: string }> {
    return this.request('POST', '/integrate/webhooks', { url, events });
  }

  /** List webhooks */
  async listWebhooks(): Promise<{ webhooks: Webhook[] }> {
    return this.request('GET', '/integrate/webhooks');
  }

  /** Delete a webhook */
  async deleteWebhook(id: string): Promise<{ success: boolean }> {
    return this.request('DELETE', `/integrate/webhooks/${encodeURIComponent(id)}`);
  }

  // ───────────────────────────────────────
  // Delegated Proving
  // ───────────────────────────────────────

  /** Check proving service health */
  async getProvingHealth(): Promise<ProvingHealth> {
    return this.request('GET', '/proving/health');
  }

  /** Submit a transition for delegated proving */
  async submitDelegatedProof(params: DelegateProofParams): Promise<{ proof_id: string }> {
    return this.request('POST', '/proving/delegate', params);
  }

  /** Check delegated proof status */
  async getProvingStatus(proofId: string): Promise<{ status: string; tx_id?: string }> {
    return this.request('GET', `/proving/status/${encodeURIComponent(proofId)}`);
  }
}
