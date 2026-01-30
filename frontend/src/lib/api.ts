// API Client for VeilReceipt Backend

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

interface ApiError {
  error: string;
  message?: string;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('veilreceipt_token', token);
    } else {
      localStorage.removeItem('veilreceipt_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('veilreceipt_token');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error((data as ApiError).error || 'Request failed');
    }

    return data as T;
  }

  // Auth endpoints
  async getNonce(address: string) {
    return this.request<{ nonce: string; message: string; expiresAt: number }>(
      '/auth/nonce',
      {
        method: 'POST',
        body: JSON.stringify({ address }),
      }
    );
  }

  async verifySignature(address: string, nonce: string, signature: string, role: 'merchant' | 'buyer') {
    const result = await this.request<{ token: string; address: string; role: string; expiresIn: string }>(
      '/auth/verify',
      {
        method: 'POST',
        body: JSON.stringify({ address, nonce, signature, role }),
      }
    );
    this.setToken(result.token);
    return result;
  }

  async getMe() {
    return this.request<{ address: string; role: string; merchant?: any }>('/auth/me');
  }

  // Product endpoints
  async getProducts(filters?: { merchant?: string; category?: string; inStock?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.merchant) params.set('merchant', filters.merchant);
    if (filters?.category) params.set('category', filters.category);
    if (filters?.inStock !== undefined) params.set('inStock', String(filters.inStock));
    
    const query = params.toString();
    return this.request<{ products: any[] }>(`/products${query ? `?${query}` : ''}`);
  }

  async getProduct(id: string) {
    return this.request<{ product: any }>(`/products/${id}`);
  }

  async createProduct(data: { name: string; description: string; price: number; sku: string; imageUrl?: string; category?: string }) {
    return this.request<{ product: any }>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: Partial<{ name: string; description: string; price: number; imageUrl: string; category: string; inStock: boolean }>) {
    return this.request<{ product: any }>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: string) {
    return this.request<{ success: boolean }>(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  // Merchant endpoints
  async getMerchantProfile() {
    return this.request<{ merchant: any }>('/merchant/profile');
  }

  async updateMerchantProfile(data: { businessName: string }) {
    return this.request<{ merchant: any }>('/merchant/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getMerchantProducts() {
    return this.request<{ products: any[] }>('/merchant/products');
  }

  async getMerchantStats() {
    return this.request<any>('/merchant/stats');
  }

  async getMerchantReceipts() {
    return this.request<{ receipts: any[] }>('/merchant/receipts');
  }

  async getMerchantReturns() {
    return this.request<{ returns: any[] }>('/merchant/returns');
  }

  async updateReturnStatus(id: string, status: 'processed' | 'rejected') {
    return this.request<{ returnRequest: any }>(`/merchant/returns/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Event endpoints
  async recordTransaction(data: {
    txId: string;
    type: 'purchase' | 'return' | 'loyalty';
    merchantAddress: string;
    buyerAddress: string;
    cartCommitment?: string;
    totalAmount?: number;
    itemCount?: number;
    nullifier?: string;
    tier?: number;
    reason?: string;
  }) {
    return this.request<{ success: boolean; type: string; data: any }>('/events/tx', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTransactionStatus(txId: string) {
    return this.request<{ txId: string; confirmed: boolean; receiptMeta?: any; returnRequest?: any; loyaltyClaim?: any }>(`/events/tx/${txId}`);
  }

  async waitForConfirmation(txId: string, timeout?: number) {
    return this.request<{ txId: string; confirmed: boolean }>(`/events/tx/${txId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ timeout }),
    });
  }

  async getMyReceipts() {
    return this.request<{ receipts: any[] }>('/events/receipts');
  }

  async getMyReturns() {
    return this.request<{ returns: any[] }>('/events/returns');
  }

  async getMyLoyalty() {
    return this.request<{ claims: any[] }>('/events/loyalty');
  }

  // Receipts endpoints (backend storage for record metadata)
  async storeReceipt(data: {
    txId: string;
    onChainTxId?: string;
    merchantAddress: string;
    buyerAddress: string;
    total: number;
    cartCommitment?: string;
    timestamp?: number;
    blockHeight?: number;
    items?: { sku: string; quantity: number; price: number }[];
  }) {
    return this.request<{ receipt: any }>('/receipts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getReceipts() {
    return this.request<{ receipts: any[]; count: number }>('/receipts');
  }

  async getReceiptsByBuyer(address: string) {
    return this.request<{ receipts: any[]; count: number }>(`/receipts/buyer/${address}`);
  }

  async getReceiptByTxId(txId: string) {
    return this.request<{ receipt: any }>(`/receipts/tx/${txId}`);
  }

  // Health check
  async healthCheck() {
    return this.request<{ status: string; timestamp: string }>('/health');
  }
}

export const api = new ApiClient();
