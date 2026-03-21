// Integrate Page — Merchant Integration Dashboard
// Manage API keys, webhooks, and view integration docs

import { FC, useEffect, useState, useCallback } from 'react';

import toast from 'react-hot-toast';
import { useVeilWallet } from '@/hooks/useVeilWallet';
import { api } from '@/lib/api';
import { Button, Badge, Modal, EmptyState } from '@/components/ui/Components';
import { LoadingSpinner } from '@/components/icons/Icons';
import { ShieldIcon, ZapIcon, SettingsIcon } from '@/components/icons/Icons';

interface ApiKeyItem {
  id: string;
  prefix: string;
  label: string;
  permissions: string[];
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

interface WebhookItem {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  failure_count: number;
  created_at: string;
}

const AVAILABLE_EVENTS = [
  { value: 'payment.confirmed', label: 'Payment Confirmed', desc: 'When a payment is confirmed on-chain' },
  { value: 'payment.failed', label: 'Payment Failed', desc: 'When a payment fails' },
  { value: 'escrow.created', label: 'Escrow Created', desc: 'When funds are locked in escrow' },
  { value: 'escrow.completed', label: 'Escrow Completed', desc: 'When escrow is released to merchant' },
  { value: 'refund.processed', label: 'Refund Processed', desc: 'When an escrow refund is processed' },
  { value: 'link.fulfilled', label: 'Link Fulfilled', desc: 'When a payment link receives a payment' },
  { value: 'link.closed', label: 'Link Closed', desc: 'When a payment link is deactivated' },
];

const AVAILABLE_PERMISSIONS = [
  { value: 'payments', label: 'Payments', desc: 'Create and manage payment sessions' },
  { value: 'webhooks', label: 'Webhooks', desc: 'Manage webhook endpoints' },
  { value: 'products', label: 'Products', desc: 'Manage product catalog' },
  { value: 'receipts', label: 'Receipts', desc: 'Query receipt data' },
];

const Integrate: FC = () => {
  const { connected, role } = useVeilWallet();

  const [activeTab, setActiveTab] = useState<'overview' | 'keys' | 'webhooks' | 'docs'>('overview');
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [loading, setLoading] = useState(false);

  // New key modal
  const [showNewKey, setShowNewKey] = useState(false);
  const [keyLabel, setKeyLabel] = useState('');
  const [keyPermissions, setKeyPermissions] = useState<string[]>(['payments']);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);

  // New webhook modal
  const [showNewWebhook, setShowNewWebhook] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<string[]>(['payment.confirmed']);
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);
  const [creatingWebhook, setCreatingWebhook] = useState(false);

  const loadData = useCallback(async () => {
    if (!connected || role !== 'merchant') return;
    setLoading(true);
    try {
      const [keysRes, webhooksRes] = await Promise.all([
        api.listApiKeys(),
        api.listWebhooks(),
      ]);
      setApiKeys(keysRes.keys);
      setWebhooks(webhooksRes.webhooks);
    } catch (e: any) {
      // Ignore if not registered
    } finally {
      setLoading(false);
    }
  }, [connected, role]);

  useEffect(() => { loadData(); }, [loadData]);

  // Create API key
  const handleCreateKey = async () => {
    if (!keyLabel.trim()) { toast.error('Label required'); return; }
    setCreatingKey(true);
    try {
      const result = await api.createApiKey({ label: keyLabel.trim(), permissions: keyPermissions });
      setNewKeyValue(result.key);
      toast.success('API key created!');
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create key');
    } finally {
      setCreatingKey(false);
    }
  };

  // Revoke API key
  const handleRevokeKey = async (id: string) => {
    try {
      await api.revokeApiKey(id);
      toast.success('API key revoked');
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to revoke key');
    }
  };

  // Create webhook
  const handleCreateWebhook = async () => {
    if (!webhookUrl.trim()) { toast.error('URL required'); return; }
    setCreatingWebhook(true);
    try {
      const result = await api.createWebhook({ url: webhookUrl.trim(), events: webhookEvents });
      setNewWebhookSecret(result.signing_secret);
      toast.success('Webhook created!');
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create webhook');
    } finally {
      setCreatingWebhook(false);
    }
  };

  // Delete webhook
  const handleDeleteWebhook = async (id: string) => {
    try {
      await api.deleteWebhook(id);
      toast.success('Webhook removed');
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove webhook');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const isMerchant = connected && role === 'merchant';

  // Determine which tabs to show — docs always visible, others need merchant auth
  const allTabs = ['overview', 'keys', 'webhooks', 'docs'] as const;
  const availableTabs = isMerchant ? allTabs : (['docs'] as const);

  // Force docs tab if not merchant
  const effectiveTab = isMerchant ? activeTab : 'docs';

  if (!connected) {
    return (
      <div className="pt-4 pb-16 px-4 max-w-4xl mx-auto">
        <EmptyState
          icon={<SettingsIcon size={32} />}
          title="Integration Dashboard"
          description="Connect your wallet to view integration documentation and API reference."
        />
      </div>
    );
  }

  return (
    <div className="pt-4 pb-16 px-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#e5e2e1] mb-1">Integration Dashboard</h1>
        <p className="text-[#c9c6c5]/60 text-sm">Connect VeilReceipt to your e-commerce platform</p>
      </div>

      {/* Merchant Auth Notice */}
      {!isMerchant && (
        <div className="mb-6 bg-[#1c1b1b]/40 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" /></svg>
          <p className="text-[#c9c6c5]/70 text-sm">
            <span className="text-amber-300 font-medium">Authenticate as a merchant</span> on the{' '}
            <a href="/merchant" className="text-sky-400 underline underline-offset-2 hover:text-sky-300">Merchant page</a>{' '}
            to unlock API keys, webhooks, and full dashboard access.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-8 p-1 bg-[#1c1b1b]/40 rounded-xl border border-[#d4bbff]/10 w-fit">
        {availableTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              effectiveTab === tab
                ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                : 'text-[#c9c6c5]/60 hover:text-[#c9c6c5]/80'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : (
        <>
          {/* Overview Tab */}
          {effectiveTab === 'overview' && (
            <div className="grid gap-6 md:grid-cols-3">
              <div className="bg-[#1c1b1b]/40 border border-[#d4bbff]/10 rounded-2xl p-6">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center mb-3">
                  <ZapIcon size={20} className="text-sky-400" />
                </div>
                <h3 className="text-[#e5e2e1] font-semibold mb-1">API Keys</h3>
                <p className="text-[#c9c6c5]/60 text-sm mb-3">Authenticate your platform's requests</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-[#e5e2e1]">{apiKeys.filter(k => k.is_active).length}</span>
                  <span className="text-[#c9c6c5]/40 text-sm">active</span>
                </div>
              </div>

              <div className="bg-[#1c1b1b]/40 border border-[#d4bbff]/10 rounded-2xl p-6">
                <div className="w-10 h-10 rounded-xl bg-[#7dffa2]/10 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-[#7dffa2]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h3 className="text-[#e5e2e1] font-semibold mb-1">Webhooks</h3>
                <p className="text-[#c9c6c5]/60 text-sm mb-3">Real-time payment notifications</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-[#e5e2e1]">{webhooks.filter(w => w.is_active).length}</span>
                  <span className="text-[#c9c6c5]/40 text-sm">active</span>
                </div>
              </div>

              <div className="bg-[#1c1b1b]/40 border border-[#d4bbff]/10 rounded-2xl p-6">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center mb-3">
                  <ShieldIcon size={20} className="text-purple-400" />
                </div>
                <h3 className="text-[#e5e2e1] font-semibold mb-1">Privacy</h3>
                <p className="text-[#c9c6c5]/60 text-sm mb-3">All payments use zero-knowledge proofs</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#7dffa2]">Active</span>
                  <span className="text-[#c9c6c5]/40 text-sm">on Aleo testnet</span>
                </div>
              </div>
            </div>
          )}

          {/* API Keys Tab */}
          {effectiveTab === 'keys' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-[#e5e2e1]">API Keys</h2>
                  <p className="text-[#c9c6c5]/60 text-sm">Use these to authenticate requests from your platform</p>
                </div>
                <Button variant="primary" onClick={() => { setShowNewKey(true); setNewKeyValue(null); setKeyLabel(''); setKeyPermissions(['payments']); }}>
                  Create Key
                </Button>
              </div>

              {apiKeys.length === 0 ? (
                <div className="bg-[#1c1b1b]/30 border border-[#d4bbff]/8 rounded-xl p-8 text-center">
                  <p className="text-[#c9c6c5]/40 text-sm">No API keys yet. Create one to start integrating.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {apiKeys.map(key => (
                    <div key={key.id} className="bg-[#1c1b1b]/40 border border-[#d4bbff]/10 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm text-[#e5e2e1]/80">{key.prefix}...</span>
                          <span className="text-[#c9c6c5]/60 text-sm">{key.label}</span>
                          {key.is_active ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="warning">Revoked</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#c9c6c5]/30">
                          <span>Permissions: {key.permissions.join(', ')}</span>
                          <span>Created: {new Date(key.created_at).toLocaleDateString()}</span>
                          {key.last_used_at && <span>Last used: {new Date(key.last_used_at).toLocaleString()}</span>}
                        </div>
                      </div>
                      {key.is_active && (
                        <Button variant="ghost" onClick={() => handleRevokeKey(key.id)}>
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Webhooks Tab */}
          {effectiveTab === 'webhooks' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-[#e5e2e1]">Webhook Endpoints</h2>
                  <p className="text-[#c9c6c5]/60 text-sm">Receive real-time notifications when payments are made</p>
                </div>
                <Button variant="primary" onClick={() => { setShowNewWebhook(true); setNewWebhookSecret(null); setWebhookUrl(''); setWebhookEvents(['payment.confirmed']); }}>
                  Add Endpoint
                </Button>
              </div>

              {webhooks.length === 0 ? (
                <div className="bg-[#1c1b1b]/30 border border-[#d4bbff]/8 rounded-xl p-8 text-center">
                  <p className="text-[#c9c6c5]/40 text-sm">No webhooks configured. Add one to receive payment events.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {webhooks.map(wh => (
                    <div key={wh.id} className="bg-[#1c1b1b]/40 border border-[#d4bbff]/10 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-[#e5e2e1]/80 break-all">{wh.url}</span>
                          {wh.is_active ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="error">Disabled</Badge>
                          )}
                        </div>
                        <Button variant="ghost" onClick={() => handleDeleteWebhook(wh.id)}>
                          Remove
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {wh.events.map(e => (
                          <span key={e} className="px-2 py-0.5 text-xs bg-sky-500/10 text-sky-300 rounded-full">{e}</span>
                        ))}
                      </div>
                      <div className="text-xs text-[#c9c6c5]/30">
                        {wh.failure_count > 0 && <span className="text-amber-400 mr-3">Failures: {wh.failure_count}/10</span>}
                        <span>Created: {new Date(wh.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Docs Tab */}
          {effectiveTab === 'docs' && (
            <div className="space-y-8">
              {/* Quick Start */}
              <div className="bg-[#1c1b1b]/40 border border-[#d4bbff]/10 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-[#e5e2e1] mb-4">Quick Start Guide</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-[#e5e2e1]/90 font-medium mb-2">1. Get Your API Key</h3>
                    <p className="text-[#c9c6c5]/60 text-sm mb-2">Go to the API Keys tab and create a key with <code className="bg-white/[0.05] px-1.5 py-0.5 rounded text-sky-300">payments</code> permission.</p>
                  </div>
                  <div>
                    <h3 className="text-[#e5e2e1]/90 font-medium mb-2">2. Create a Payment Session</h3>
                    <p className="text-[#c9c6c5]/60 text-sm mb-2">From your server, call the API to create a session:</p>
                    <pre className="bg-[#050505]/50 border border-[#d4bbff]/10 rounded-xl p-4 text-sm text-[#e5e2e1]/80 overflow-x-auto font-mono">{`curl -X POST ${window.location.origin}/integrate/payments \\
  -H "X-API-Key: veil_pk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 5000000,
    "currency": "credits",
    "description": "Order #1234",
    "metadata": { "order_id": "1234" },
    "redirect_url": "https://your-store.com/success",
    "cancel_url": "https://your-store.com/cancel"
  }'`}</pre>
                  </div>
                  <div>
                    <h3 className="text-[#e5e2e1]/90 font-medium mb-2">3. Redirect Customer</h3>
                    <p className="text-[#c9c6c5]/60 text-sm mb-2">The API returns a <code className="bg-white/[0.05] px-1.5 py-0.5 rounded text-sky-300">checkout_url</code>. Redirect your customer there:</p>
                    <pre className="bg-[#050505]/50 border border-[#d4bbff]/10 rounded-xl p-4 text-sm text-[#e5e2e1]/80 overflow-x-auto font-mono">{`// Response:
{
  "id": "ps_abc123...",
  "checkout_url": "${window.location.origin}/pay/ps_abc123...",
  "status": "pending",
  "expires_at": "2026-03-18T12:30:00Z"
}

// Redirect:
window.location.href = response.checkout_url;`}</pre>
                  </div>
                  <div>
                    <h3 className="text-[#e5e2e1]/90 font-medium mb-2">4. Receive Webhook</h3>
                    <p className="text-[#c9c6c5]/60 text-sm mb-2">After payment, your webhook receives:</p>
                    <pre className="bg-[#050505]/50 border border-[#d4bbff]/10 rounded-xl p-4 text-sm text-[#e5e2e1]/80 overflow-x-auto font-mono">{`POST https://your-store.com/webhooks/veilreceipt
Headers:
  X-VeilReceipt-Signature: sha256=...
  X-VeilReceipt-Event: payment.confirmed
Body:
{
  "event": "payment.confirmed",
  "data": {
    "purchase_commitment": "field...",
    "tx_id": "at1...",
    "amount": 5000000,
    "currency": "credits",
    "payment_mode": "private",
    "session_id": "ps_abc123..."
  },
  "timestamp": "2026-03-18T12:00:00Z"
}`}</pre>
                  </div>
                  <div>
                    <h3 className="text-[#e5e2e1]/90 font-medium mb-2">5. Verify Signature</h3>
                    <p className="text-[#c9c6c5]/60 text-sm mb-2">Verify the webhook signature in your handler:</p>
                    <pre className="bg-[#050505]/50 border border-[#d4bbff]/10 rounded-xl p-4 text-sm text-[#e5e2e1]/80 overflow-x-auto font-mono">{`const crypto = require('crypto');

function verifyWebhook(body, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`}</pre>
                  </div>
                </div>
              </div>

              {/* TypeScript SDK */}
              <div className="bg-[#1c1b1b]/40 border border-[#d4bbff]/10 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-[#e5e2e1] mb-4">TypeScript SDK</h2>
                <p className="text-[#c9c6c5]/60 text-sm mb-4">Install the official SDK for type-safe API access:</p>
                <pre className="bg-[#050505]/50 border border-[#d4bbff]/10 rounded-xl p-4 text-sm text-[#e5e2e1]/80 overflow-x-auto font-mono mb-4">{`npm install @veilreceipt/sdk`}</pre>
                <pre className="bg-[#050505]/50 border border-[#d4bbff]/10 rounded-xl p-4 text-sm text-[#e5e2e1]/80 overflow-x-auto font-mono">{`import { VeilReceipt } from '@veilreceipt/sdk';

const veil = new VeilReceipt({
  baseUrl: '${window.location.origin.replace('localhost:5173', 'localhost:3001')}',
  apiKey: 'vr_live_...',
});

// Get a payment session
const session = await veil.getPaymentSession('sess_abc123');

// Resolve a payment link (no auth required)
const link = await veil.resolvePaymentLink('a1b2c3d4');
console.log(link.label, link.amount, link.currency);

// Verify a purchase on-chain
const result = await veil.verifyPurchase('field1234...');
console.log(result.on_chain_verified);

// Create a product
const product = await veil.createProduct({
  name: 'Digital Art Pack',
  description: 'Exclusive digital artwork',
  price: 10_000_000,
  price_type: 'credits',
  sku: 'ART-001',
});`}</pre>
              </div>

              {/* Payment Links */}
              <div className="bg-[#1c1b1b]/40 border border-[#d4bbff]/10 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-[#e5e2e1] mb-4">Payment Links</h2>
                <p className="text-[#c9c6c5]/60 text-sm mb-4">
                  Shareable payment links that work without checkout integration. Create once, share anywhere — supports one-time, recurring, and open-amount payments.
                </p>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-[#e5e2e1]/90 font-medium mb-2">Link Types</h3>
                    <div className="grid gap-2">
                      <div className="flex items-center gap-3 bg-[#050505]/30 rounded-lg p-3">
                        <span className="px-2 py-0.5 text-xs bg-sky-500/10 text-sky-300 rounded-full font-medium">one_time</span>
                        <span className="text-[#c9c6c5]/60 text-sm">Auto-closes after a single payment</span>
                      </div>
                      <div className="flex items-center gap-3 bg-[#050505]/30 rounded-lg p-3">
                        <span className="px-2 py-0.5 text-xs bg-[#7dffa2]/10 text-[#7dffa2] rounded-full font-medium">recurring</span>
                        <span className="text-[#c9c6c5]/60 text-sm">Stays active for multiple payments at a fixed amount</span>
                      </div>
                      <div className="flex items-center gap-3 bg-[#050505]/30 rounded-lg p-3">
                        <span className="px-2 py-0.5 text-xs bg-purple-500/10 text-purple-300 rounded-full font-medium">open</span>
                        <span className="text-[#c9c6c5]/60 text-sm">Payer chooses the amount (donations, tips)</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[#e5e2e1]/90 font-medium mb-2">Using the SDK</h3>
                    <pre className="bg-[#050505]/50 border border-[#d4bbff]/10 rounded-xl p-4 text-sm text-[#e5e2e1]/80 overflow-x-auto font-mono">{`// Create a payment link (merchant auth)
const link = await veil.createPaymentLink({
  link_hash: 'generated_hash...',
  amount: 5_000_000,
  currency: 'credits',
  link_type: 'recurring',
  label: 'Monthly Subscription',
  description: 'Premium plan — monthly',
  tx_id: 'at1...',
});

// Share the link
const payUrl = '${window.location.origin}/pay?link=' + link.link_hash;

// Resolve link (public — payer's side)
const info = await veil.resolvePaymentLink(link.link_hash);

// Record fulfillment after on-chain tx
await veil.fulfillPaymentLink(link.id, {
  link_id: link.id,
  purchase_commitment: 'field...',
  buyer_address_hash: 'hash...',
  amount: 5_000_000,
  tx_id: 'at1...',
  payment_mode: 'private',
});`}</pre>
                  </div>
                  <div>
                    <h3 className="text-[#e5e2e1]/90 font-medium mb-2">REST API</h3>
                    <pre className="bg-[#050505]/50 border border-[#d4bbff]/10 rounded-xl p-4 text-sm text-[#e5e2e1]/80 overflow-x-auto font-mono">{`# Resolve a link (no auth)
GET /links/resolve/:hash

# Create a link (merchant JWT)
POST /links
{ "link_hash": "...", "amount": 5000000, "currency": "credits",
  "link_type": "one_time", "label": "Invoice #42", "description": "...", "tx_id": "at1..." }

# Record fulfillment
POST /links/:id/fulfill
{ "link_id": "...", "purchase_commitment": "...", "buyer_address_hash": "...",
  "amount": 5000000, "tx_id": "at1...", "payment_mode": "private" }

# Close a link (merchant JWT)
POST /links/:id/close`}</pre>
                  </div>
                </div>
              </div>

              {/* Real-time Events */}
              <div className="bg-[#1c1b1b]/40 border border-[#d4bbff]/10 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-[#e5e2e1] mb-4">Real-time Events (SSE)</h2>
                <p className="text-[#c9c6c5]/60 text-sm mb-4">
                  Subscribe to server-sent events for live payment notifications:
                </p>
                <pre className="bg-[#050505]/50 border border-[#d4bbff]/10 rounded-xl p-4 text-sm text-[#e5e2e1]/80 overflow-x-auto font-mono">{`// Connect to the event stream
const es = new EventSource(
  '${window.location.origin.replace('localhost:5173', 'localhost:3001')}/events/stream?token=' + jwt
);

es.addEventListener('link.fulfilled', (e) => {
  const data = JSON.parse(e.data);
  console.log('Payment received:', data.amount, data.payment_mode);
});

es.addEventListener('link.closed', (e) => {
  console.log('Link closed:', JSON.parse(e.data));
});

es.addEventListener('payment.confirmed', (e) => {
  console.log('Payment confirmed:', JSON.parse(e.data));
});`}</pre>
              </div>

              {/* Embeddable Widget */}
              <div className="bg-[#1c1b1b]/40 border border-[#d4bbff]/10 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-[#e5e2e1] mb-4">Embeddable Checkout Button</h2>
                <p className="text-[#c9c6c5]/60 text-sm mb-4">Add a "Pay with Aleo" button to any webpage:</p>
                <pre className="bg-[#050505]/50 border border-[#d4bbff]/10 rounded-xl p-4 text-sm text-[#e5e2e1]/80 overflow-x-auto font-mono">{`<!-- Include the VeilReceipt SDK -->
<script src="${window.location.origin}/veil-checkout.js"></script>

<!-- Add the checkout button -->
<button onclick="VeilCheckout.open({
  sessionId: 'ps_abc123...',
  onSuccess: (result) => console.log('Paid!', result),
  onCancel: () => console.log('Cancelled')
})">
  Pay with Aleo
</button>

<!-- Or create a session and redirect automatically -->
<script>
  VeilCheckout.createAndRedirect({
    apiKey: 'veil_pk_...',
    amount: 5000000,
    currency: 'credits',
    description: 'Order #1234',
    redirectUrl: window.location.href
  });
</script>`}</pre>
              </div>

              {/* Shopify Integration */}
              <div className="bg-[#1c1b1b]/40 border border-[#d4bbff]/10 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-[#e5e2e1] mb-4">Shopify / WooCommerce Integration</h2>
                <p className="text-[#c9c6c5]/60 text-sm mb-4">Reference integration pattern for existing e-commerce platforms:</p>
                <pre className="bg-[#050505]/50 border border-[#d4bbff]/10 rounded-xl p-4 text-sm text-[#e5e2e1]/80 overflow-x-auto font-mono">{`// Shopify Custom Payment Gateway (server-side)
// In your Shopify app's payment handler:

app.post('/shopify/create-payment', async (req, res) => {
  const { order_id, amount, currency } = req.body;

  // Create a VeilReceipt payment session
  const response = await fetch(
    '${window.location.origin.replace('localhost:5173', 'localhost:3001')}/integrate/payments',
    {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.VEILRECEIPT_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amount * 1_000_000,  // Convert to microcredits
        currency: 'credits',
        description: 'Shopify Order #' + order_id,
        metadata: { shopify_order_id: order_id },
        redirect_url: 'https://your-store.myshopify.com/thank-you',
        cancel_url: 'https://your-store.myshopify.com/cart'
      })
    }
  );

  const session = await response.json();
  // Redirect customer to VeilReceipt checkout
  res.redirect(session.checkout_url);
});

// Handle webhook from VeilReceipt
app.post('/shopify/webhook', (req, res) => {
  const { event, data } = req.body;
  if (event === 'payment.confirmed') {
    // Mark Shopify order as paid
    markOrderPaid(data.session_id, data.tx_id);
  }
  res.sendStatus(200);
});`}</pre>
              </div>

              {/* API Reference */}
              <div className="bg-[#1c1b1b]/40 border border-[#d4bbff]/10 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-[#e5e2e1] mb-4">API Reference</h2>
                <div className="space-y-4">
                  {[
                    { method: 'POST', path: '/integrate/payments', auth: 'API Key', desc: 'Create a payment session' },
                    { method: 'GET', path: '/integrate/payments/:id', auth: 'None', desc: 'Get payment session status' },
                    { method: 'GET', path: '/integrate/payments', auth: 'API Key', desc: 'List all payment sessions' },
                    { method: 'GET', path: '/integrate/verify/:commitment', auth: 'None', desc: 'Verify a purchase on-chain' },
                    { method: 'POST', path: '/links', auth: 'JWT', desc: 'Create a payment link' },
                    { method: 'GET', path: '/links', auth: 'JWT', desc: 'List merchant payment links' },
                    { method: 'GET', path: '/links/resolve/:hash', auth: 'None', desc: 'Resolve payment link by hash' },
                    { method: 'GET', path: '/links/:id', auth: 'JWT', desc: 'Get payment link details' },
                    { method: 'POST', path: '/links/:id/fulfill', auth: 'JWT', desc: 'Record link fulfillment' },
                    { method: 'POST', path: '/links/:id/close', auth: 'JWT', desc: 'Close a payment link' },
                    { method: 'GET', path: '/events/stream', auth: 'Token', desc: 'SSE real-time event stream' },
                    { method: 'GET', path: '/proving/health', auth: 'None', desc: 'Proving service health' },
                    { method: 'POST', path: '/proving/delegate', auth: 'JWT', desc: 'Submit delegated proof' },
                    { method: 'GET', path: '/proving/status/:id', auth: 'JWT', desc: 'Check proof status' },
                    { method: 'POST', path: '/integrate/keys', auth: 'JWT', desc: 'Create an API key' },
                    { method: 'GET', path: '/integrate/keys', auth: 'JWT', desc: 'List API keys' },
                    { method: 'DELETE', path: '/integrate/keys/:id', auth: 'JWT', desc: 'Revoke an API key' },
                    { method: 'POST', path: '/integrate/webhooks', auth: 'JWT', desc: 'Register webhook endpoint' },
                    { method: 'GET', path: '/integrate/webhooks', auth: 'JWT', desc: 'List webhooks' },
                    { method: 'DELETE', path: '/integrate/webhooks/:id', auth: 'JWT', desc: 'Remove a webhook' },
                  ].map((ep, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className={`font-mono font-bold w-16 ${
                        ep.method === 'POST' ? 'text-[#7dffa2]' : ep.method === 'DELETE' ? 'text-[#ffb4ab]' : 'text-sky-400'
                      }`}>{ep.method}</span>
                      <span className="font-mono text-[#c9c6c5]/80 flex-1">{ep.path}</span>
                      <Badge variant={ep.auth === 'None' ? 'info' : ep.auth === 'API Key' ? 'warning' : 'success'}>{ep.auth}</Badge>
                      <span className="text-[#c9c6c5]/40 hidden md:block">{ep.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* New API Key Modal */}
      <Modal isOpen={showNewKey} onClose={() => setShowNewKey(false)} title={newKeyValue ? 'API Key Created' : 'Create API Key'}>
        {newKeyValue ? (
          <div>
            <p className="text-[#c9c6c5]/70 text-sm mb-3">Save this key now — you won't see it again:</p>
            <div className="bg-[#050505]/50 border border-sky-500/20 rounded-xl p-4 mb-4">
              <code className="text-sky-300 text-sm break-all font-mono">{newKeyValue}</code>
            </div>
            <Button variant="primary" className="w-full" onClick={() => { copyToClipboard(newKeyValue); setShowNewKey(false); }}>
              Copy & Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-[#c9c6c5]/60 text-xs uppercase tracking-wider block mb-2">Label</label>
              <input
                type="text"
                value={keyLabel}
                onChange={e => setKeyLabel(e.target.value)}
                placeholder="e.g. Production Server"
                className="w-full bg-[#1c1b1b]/40 border border-[#d4bbff]/10 rounded-xl px-4 py-3 text-[#e5e2e1] text-sm focus:border-sky-500/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[#c9c6c5]/60 text-xs uppercase tracking-wider block mb-2">Permissions</label>
              <div className="space-y-2">
                {AVAILABLE_PERMISSIONS.map(p => (
                  <label key={p.value} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#1c1b1b]/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={keyPermissions.includes(p.value)}
                      onChange={e => {
                        if (e.target.checked) setKeyPermissions([...keyPermissions, p.value]);
                        else setKeyPermissions(keyPermissions.filter(x => x !== p.value));
                      }}
                      className="rounded"
                    />
                    <div>
                      <span className="text-[#e5e2e1] text-sm">{p.label}</span>
                      <span className="text-[#c9c6c5]/40 text-xs ml-2">{p.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <Button variant="primary" className="w-full" onClick={handleCreateKey} disabled={creatingKey}>
              {creatingKey ? <LoadingSpinner /> : 'Create Key'}
            </Button>
          </div>
        )}
      </Modal>

      {/* New Webhook Modal */}
      <Modal isOpen={showNewWebhook} onClose={() => setShowNewWebhook(false)} title={newWebhookSecret ? 'Webhook Created' : 'Add Webhook Endpoint'}>
        {newWebhookSecret ? (
          <div>
            <p className="text-[#c9c6c5]/70 text-sm mb-3">Save this signing secret — you won't see it again:</p>
            <div className="bg-[#050505]/50 border border-sky-500/20 rounded-xl p-4 mb-4">
              <code className="text-sky-300 text-sm break-all font-mono">{newWebhookSecret}</code>
            </div>
            <p className="text-[#c9c6c5]/40 text-xs mb-4">Use this to verify webhook signatures with HMAC-SHA256.</p>
            <Button variant="primary" className="w-full" onClick={() => { copyToClipboard(newWebhookSecret); setShowNewWebhook(false); }}>
              Copy & Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-[#c9c6c5]/60 text-xs uppercase tracking-wider block mb-2">Endpoint URL</label>
              <input
                type="url"
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
                placeholder="https://your-store.com/webhooks/veilreceipt"
                className="w-full bg-[#1c1b1b]/40 border border-[#d4bbff]/10 rounded-xl px-4 py-3 text-[#e5e2e1] text-sm focus:border-sky-500/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[#c9c6c5]/60 text-xs uppercase tracking-wider block mb-2">Events</label>
              <div className="space-y-2">
                {AVAILABLE_EVENTS.map(ev => (
                  <label key={ev.value} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#1c1b1b]/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={webhookEvents.includes(ev.value)}
                      onChange={e => {
                        if (e.target.checked) setWebhookEvents([...webhookEvents, ev.value]);
                        else setWebhookEvents(webhookEvents.filter(x => x !== ev.value));
                      }}
                      className="rounded"
                    />
                    <div>
                      <span className="text-[#e5e2e1] text-sm">{ev.label}</span>
                      <span className="text-[#c9c6c5]/40 text-xs ml-2">{ev.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <Button variant="primary" className="w-full" onClick={handleCreateWebhook} disabled={creatingWebhook}>
              {creatingWebhook ? <LoadingSpinner /> : 'Add Endpoint'}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Integrate;
