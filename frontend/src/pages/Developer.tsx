// Developer — Public SDK & API documentation page (no auth required)

import { FC, useState } from 'react';

const sections = ['overview', 'sdk', 'api', 'webhooks', 'links', 'verify', 'sse'] as const;
type Section = typeof sections[number];

const sectionLabels: Record<Section, string> = {
  overview: 'Overview',
  sdk: 'SDK',
  api: 'REST API',
  webhooks: 'Webhooks',
  links: 'Payment Links',
  verify: 'Verification',
  sse: 'Real-time Events',
};

const CodeBlock: FC<{ code: string; lang?: string }> = ({ code, lang }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="relative group">
      <pre className="bg-[#050505]/60 border border-[#d4bbff]/10 rounded-xl p-4 text-sm text-[#e5e2e1]/80 overflow-x-auto font-mono leading-relaxed">
        {lang && <span className="absolute top-2 right-12 text-[10px] text-[#c9c6c5]/30 font-mono uppercase">{lang}</span>}
        {code}
      </pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 px-2 py-1 text-[10px] font-mono text-[#c9c6c5]/60 hover:text-[#7dffa2] bg-[#1c1b1b] border border-[#d4bbff]/10 rounded transition-all"
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  );
};

const SectionCard: FC<{ title: string; children: React.ReactNode; id?: string }> = ({ title, children, id }) => (
  <div id={id} className="bg-[#1c1b1b]/40 border border-[#d4bbff]/10 rounded-2xl p-6 scroll-mt-24">
    <h2 className="text-lg font-semibold text-[#e5e2e1] mb-4">{title}</h2>
    {children}
  </div>
);

const Badge: FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'sky' }) => (
  <span className={`px-2 py-0.5 text-xs bg-${color}-500/10 text-${color}-300 rounded-full font-medium`}>
    {children}
  </span>
);

const BASE_URL = 'https://veilreceipt-api.onrender.com';
const APP_URL = 'https://veil-receipt.vercel.app';

const Developer: FC = () => {
  const [active, setActive] = useState<Section>('overview');

  const scrollTo = (id: Section) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="pt-4 pb-16 px-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#d4bbff]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#d4bbff]">code</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#e5e2e1]">Developer Documentation</h1>
            <p className="text-[#c9c6c5]/60 text-sm">Integrate private payments into any application</p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs font-mono">
          <span className="text-[#7dffa2]">npm: veilreceipt-sdk</span>
          <span className="text-[#c9c6c5]/40">|</span>
          <span className="text-[#d4bbff]">Contract: veilreceipt_v8.aleo</span>
          <span className="text-[#c9c6c5]/40">|</span>
          <span className="text-sky-400">17 transitions</span>
        </div>
      </div>

      {/* Navigation pills */}
      <div className="flex flex-wrap gap-1 mb-8 p-1 bg-[#1c1b1b]/40 rounded-xl border border-[#d4bbff]/10 w-fit">
        {sections.map(s => (
          <button
            key={s}
            onClick={() => scrollTo(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              active === s
                ? 'bg-[#d4bbff]/10 text-[#d4bbff] border border-[#d4bbff]/20'
                : 'text-[#c9c6c5]/60 hover:text-[#c9c6c5]/80'
            }`}
          >
            {sectionLabels[s]}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {/* Overview */}
        <SectionCard title="Overview" id="overview">
          <p className="text-[#c9c6c5]/70 text-sm mb-6 leading-relaxed">
            VeilReceipt is a privacy-first commerce protocol on Aleo. Accept payments in <strong className="text-[#e5e2e1]">Aleo Credits</strong>, <strong className="text-[#e5e2e1]">USDCx</strong>, and <strong className="text-[#e5e2e1]">USAD</strong> stablecoins — with zero-knowledge proofs ensuring buyer privacy. No payment amounts, no buyer addresses, and no purchase details are ever exposed on-chain.
          </p>

          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div className="bg-[#050505]/30 rounded-xl p-4 border border-[#d4bbff]/5">
              <h3 className="text-[#7dffa2] font-semibold text-sm mb-1">Payment Sessions</h3>
              <p className="text-[#c9c6c5]/50 text-xs">Create checkout sessions, redirect customers, receive webhook confirmations.</p>
            </div>
            <div className="bg-[#050505]/30 rounded-xl p-4 border border-[#d4bbff]/5">
              <h3 className="text-[#d4bbff] font-semibold text-sm mb-1">Payment Links</h3>
              <p className="text-[#c9c6c5]/50 text-xs">Shareable on-chain links (one-time, recurring, open donation) with QR codes.</p>
            </div>
            <div className="bg-[#050505]/30 rounded-xl p-4 border border-[#d4bbff]/5">
              <h3 className="text-sky-400 font-semibold text-sm mb-1">On-Chain Escrow</h3>
              <p className="text-[#c9c6c5]/50 text-xs">Lock funds with a 500-block refund window. BHP256-hashed timestamps prevent timing attacks.</p>
            </div>
          </div>

          <h3 className="text-[#e5e2e1]/90 font-medium mb-3 text-sm">Quick Start</h3>
          <CodeBlock lang="bash" code={`npm install veilreceipt-sdk`} />
          <div className="mt-4" />
          <CodeBlock lang="typescript" code={`import { VeilReceipt } from 'veilreceipt-sdk';

const veil = new VeilReceipt({
  baseUrl: '${BASE_URL}',
  apiKey: 'veil_pk_your_key_here',
});

// Create a payment session
const session = await veil.getPaymentSession('ps_abc123');

// Verify a purchase on-chain
const result = await veil.verifyPurchase('commitment_field...');
console.log(result.on_chain_verified); // true`} />
        </SectionCard>

        {/* SDK */}
        <SectionCard title="TypeScript SDK — veilreceipt-sdk" id="sdk">
          <p className="text-[#c9c6c5]/70 text-sm mb-4">Full-featured SDK with typed methods for every API endpoint. Supports CJS, ESM, and includes TypeScript declarations.</p>
          <CodeBlock lang="bash" code="npm install veilreceipt-sdk" />

          <h3 className="text-[#e5e2e1]/90 font-medium mt-6 mb-3 text-sm">Configuration</h3>
          <CodeBlock lang="typescript" code={`import { VeilReceipt } from 'veilreceipt-sdk';

const veil = new VeilReceipt({
  baseUrl: '${BASE_URL}',  // API endpoint
  apiKey: 'veil_pk_...',              // For payment operations
  token: 'jwt_token...',              // For merchant dashboard ops
  timeout: 30000,                     // Request timeout (ms)
});`} />

          <h3 className="text-[#e5e2e1]/90 font-medium mt-6 mb-3 text-sm">Available Methods</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#c9c6c5]/50 border-b border-[#d4bbff]/10">
                  <th className="pb-2 pr-4 font-medium">Category</th>
                  <th className="pb-2 pr-4 font-medium">Method</th>
                  <th className="pb-2 font-medium">Auth</th>
                </tr>
              </thead>
              <tbody className="text-[#c9c6c5]/70 font-mono text-xs">
                <tr className="border-b border-[#d4bbff]/5"><td className="py-2 pr-4 text-[#7dffa2]">Sessions</td><td className="py-2 pr-4">getPaymentSession(id)</td><td className="py-2">Public</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-2 pr-4"></td><td className="py-2 pr-4">completePaymentSession(id, params)</td><td className="py-2">Public</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-2 pr-4 text-[#d4bbff]">Links</td><td className="py-2 pr-4">createPaymentLink(params)</td><td className="py-2">JWT</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-2 pr-4"></td><td className="py-2 pr-4">resolvePaymentLink(hash)</td><td className="py-2">None</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-2 pr-4"></td><td className="py-2 pr-4">fulfillPaymentLink(id, params)</td><td className="py-2">JWT</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-2 pr-4"></td><td className="py-2 pr-4">closePaymentLink(id)</td><td className="py-2">JWT</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-2 pr-4 text-sky-400">Products</td><td className="py-2 pr-4">getProducts(filters?)</td><td className="py-2">Public</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-2 pr-4"></td><td className="py-2 pr-4">createProduct(params)</td><td className="py-2">JWT</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-2 pr-4 text-amber-400">Receipts</td><td className="py-2 pr-4">storeReceipt(params)</td><td className="py-2">JWT</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-2 pr-4"></td><td className="py-2 pr-4">getReceipts()</td><td className="py-2">JWT</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-2 pr-4 text-purple-400">Escrow</td><td className="py-2 pr-4">createEscrow(params)</td><td className="py-2">JWT</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-2 pr-4"></td><td className="py-2 pr-4">resolveEscrow(id, action, txId)</td><td className="py-2">JWT</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-2 pr-4 text-[#7dffa2]">Verify</td><td className="py-2 pr-4">verifyPurchase(commitment)</td><td className="py-2">Public</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-2 pr-4 text-rose-400">Keys</td><td className="py-2 pr-4">createApiKey(label, perms)</td><td className="py-2">JWT</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-2 pr-4"></td><td className="py-2 pr-4">listApiKeys()</td><td className="py-2">JWT</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-2 pr-4 text-orange-400">Webhooks</td><td className="py-2 pr-4">createWebhook(url, events)</td><td className="py-2">JWT</td></tr>
                <tr><td className="py-2 pr-4 text-cyan-400">Proving</td><td className="py-2 pr-4">submitDelegatedProof(params)</td><td className="py-2">JWT</td></tr>
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* REST API */}
        <SectionCard title="REST API Reference" id="api">
          <p className="text-[#c9c6c5]/70 text-sm mb-4">Base URL: <code className="bg-white/[0.05] px-1.5 py-0.5 rounded text-[#7dffa2]">{BASE_URL}</code></p>
          <p className="text-[#c9c6c5]/70 text-sm mb-6">Authentication: API Key via <code className="bg-white/[0.05] px-1.5 py-0.5 rounded text-sky-300">X-API-Key</code> header or JWT via <code className="bg-white/[0.05] px-1.5 py-0.5 rounded text-sky-300">Authorization: Bearer</code></p>

          <h3 className="text-[#e5e2e1]/90 font-medium mb-3 text-sm">Create Payment Session</h3>
          <CodeBlock lang="bash" code={`curl -X POST ${BASE_URL}/integrate/payments \\
  -H "X-API-Key: veil_pk_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 5000000,
    "currency": "credits",
    "description": "Order #1234",
    "metadata": { "order_id": "1234" },
    "redirect_url": "https://your-store.com/success",
    "cancel_url": "https://your-store.com/cancel"
  }'

# Response:
{
  "id": "ps_abc123...",
  "checkout_url": "${APP_URL}/pay/ps_abc123...",
  "status": "pending",
  "expires_at": "2026-03-28T12:30:00Z"
}`} />

          <h3 className="text-[#e5e2e1]/90 font-medium mt-6 mb-3 text-sm">All Endpoints</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-left text-[#c9c6c5]/50 border-b border-[#d4bbff]/10">
                  <th className="pb-2 pr-3 font-medium">Method</th>
                  <th className="pb-2 pr-3 font-medium">Endpoint</th>
                  <th className="pb-2 pr-3 font-medium">Auth</th>
                  <th className="pb-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="text-[#c9c6c5]/70">
                <tr className="border-b border-[#d4bbff]/5"><td className="py-1.5 pr-3 text-[#7dffa2]">POST</td><td className="py-1.5 pr-3">/integrate/payments</td><td className="py-1.5 pr-3">API Key</td><td className="py-1.5">Create payment session</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-1.5 pr-3 text-sky-400">GET</td><td className="py-1.5 pr-3">/integrate/payments/:id</td><td className="py-1.5 pr-3">Public</td><td className="py-1.5">Get session status</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-1.5 pr-3 text-[#7dffa2]">POST</td><td className="py-1.5 pr-3">/integrate/payments/:id/complete</td><td className="py-1.5 pr-3">Public</td><td className="py-1.5">Complete session with TX proof</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-1.5 pr-3 text-[#7dffa2]">POST</td><td className="py-1.5 pr-3">/integrate/keys</td><td className="py-1.5 pr-3">JWT</td><td className="py-1.5">Create API key</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-1.5 pr-3 text-sky-400">GET</td><td className="py-1.5 pr-3">/integrate/keys</td><td className="py-1.5 pr-3">JWT</td><td className="py-1.5">List API keys</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-1.5 pr-3 text-rose-400">DEL</td><td className="py-1.5 pr-3">/integrate/keys/:id</td><td className="py-1.5 pr-3">JWT</td><td className="py-1.5">Revoke API key</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-1.5 pr-3 text-[#7dffa2]">POST</td><td className="py-1.5 pr-3">/integrate/webhooks</td><td className="py-1.5 pr-3">JWT</td><td className="py-1.5">Register webhook endpoint</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-1.5 pr-3 text-sky-400">GET</td><td className="py-1.5 pr-3">/integrate/webhooks</td><td className="py-1.5 pr-3">JWT</td><td className="py-1.5">List webhooks</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-1.5 pr-3 text-rose-400">DEL</td><td className="py-1.5 pr-3">/integrate/webhooks/:id</td><td className="py-1.5 pr-3">JWT</td><td className="py-1.5">Delete webhook</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-1.5 pr-3 text-sky-400">GET</td><td className="py-1.5 pr-3">/integrate/verify/:commitment</td><td className="py-1.5 pr-3">Public</td><td className="py-1.5">Verify purchase on-chain</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-1.5 pr-3 text-[#7dffa2]">POST</td><td className="py-1.5 pr-3">/links</td><td className="py-1.5 pr-3">JWT</td><td className="py-1.5">Create payment link</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-1.5 pr-3 text-sky-400">GET</td><td className="py-1.5 pr-3">/links/resolve/:hash</td><td className="py-1.5 pr-3">None</td><td className="py-1.5">Resolve payment link</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-1.5 pr-3 text-[#7dffa2]">POST</td><td className="py-1.5 pr-3">/links/:id/fulfill</td><td className="py-1.5 pr-3">JWT</td><td className="py-1.5">Record link fulfillment</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-1.5 pr-3 text-[#7dffa2]">POST</td><td className="py-1.5 pr-3">/receipts</td><td className="py-1.5 pr-3">JWT</td><td className="py-1.5">Store receipt</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-1.5 pr-3 text-sky-400">GET</td><td className="py-1.5 pr-3">/products</td><td className="py-1.5 pr-3">Public</td><td className="py-1.5">List products</td></tr>
                <tr><td className="py-1.5 pr-3 text-[#7dffa2]">POST</td><td className="py-1.5 pr-3">/proving/delegate</td><td className="py-1.5 pr-3">JWT</td><td className="py-1.5">Submit delegated proof</td></tr>
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Webhooks */}
        <SectionCard title="Webhook Events" id="webhooks">
          <p className="text-[#c9c6c5]/70 text-sm mb-4">
            Webhooks are signed with <strong className="text-[#e5e2e1]">HMAC-SHA256</strong> using your webhook secret (<code className="bg-white/[0.05] px-1.5 py-0.5 rounded text-sky-300">whsec_...</code>). Auto-disabled after 10 consecutive failures.
          </p>

          <h3 className="text-[#e5e2e1]/90 font-medium mb-3 text-sm">Available Events</h3>
          <div className="grid gap-2 mb-6">
            {[
              { event: 'payment.confirmed', desc: 'Payment confirmed on-chain' },
              { event: 'payment.failed', desc: 'Payment transaction failed' },
              { event: 'escrow.created', desc: 'Funds locked in escrow' },
              { event: 'escrow.completed', desc: 'Escrow released to merchant' },
              { event: 'refund.processed', desc: 'Escrow refunded to buyer' },
              { event: 'link.fulfilled', desc: 'Payment link received payment' },
              { event: 'link.closed', desc: 'Payment link deactivated' },
            ].map(({ event, desc }) => (
              <div key={event} className="flex items-center gap-3 bg-[#050505]/30 rounded-lg p-3">
                <code className="text-xs text-[#7dffa2] font-mono bg-[#7dffa2]/5 px-2 py-0.5 rounded">{event}</code>
                <span className="text-[#c9c6c5]/60 text-xs">{desc}</span>
              </div>
            ))}
          </div>

          <h3 className="text-[#e5e2e1]/90 font-medium mb-3 text-sm">Webhook Payload</h3>
          <CodeBlock lang="json" code={`POST https://your-store.com/webhooks/veilreceipt
Headers:
  X-VeilReceipt-Signature: sha256=a1b2c3d4e5...
  X-VeilReceipt-Event: payment.confirmed

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
  "timestamp": "2026-03-28T12:00:00Z"
}`} />

          <h3 className="text-[#e5e2e1]/90 font-medium mt-6 mb-3 text-sm">Verify Signature</h3>
          <CodeBlock lang="javascript" code={`const crypto = require('crypto');

function verifyWebhook(rawBody, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// In your Express handler:
app.post('/webhooks/veilreceipt', (req, res) => {
  const sig = req.headers['x-veilreceipt-signature'];
  if (!verifyWebhook(req.rawBody, sig, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  const { event, data } = req.body;
  // Handle event...
  res.sendStatus(200);
});`} />
        </SectionCard>

        {/* Payment Links */}
        <SectionCard title="Payment Links" id="links">
          <p className="text-[#c9c6c5]/70 text-sm mb-4">
            On-chain shareable payment links — no checkout integration needed. Create once, share anywhere. Supports QR codes.
          </p>

          <h3 className="text-[#e5e2e1]/90 font-medium mb-3 text-sm">Link Types</h3>
          <div className="grid gap-2 mb-6 md:grid-cols-3">
            <div className="bg-[#050505]/30 rounded-xl p-4 border border-sky-500/10">
              <span className="px-2 py-0.5 text-xs bg-sky-500/10 text-sky-300 rounded-full font-medium">one_time</span>
              <p className="text-[#c9c6c5]/60 text-xs mt-2">Auto-closes after a single payment. Perfect for invoices.</p>
            </div>
            <div className="bg-[#050505]/30 rounded-xl p-4 border border-[#7dffa2]/10">
              <span className="px-2 py-0.5 text-xs bg-[#7dffa2]/10 text-[#7dffa2] rounded-full font-medium">recurring</span>
              <p className="text-[#c9c6c5]/60 text-xs mt-2">Fixed amount, stays active for multiple payments.</p>
            </div>
            <div className="bg-[#050505]/30 rounded-xl p-4 border border-purple-500/10">
              <span className="px-2 py-0.5 text-xs bg-purple-500/10 text-purple-300 rounded-full font-medium">open</span>
              <p className="text-[#c9c6c5]/60 text-xs mt-2">Payer chooses the amount. For donations and tips.</p>
            </div>
          </div>

          <CodeBlock lang="typescript" code={`// Create a payment link
const link = await veil.createPaymentLink({
  link_hash: 'generated_hash...',
  amount: 5_000_000,
  currency: 'credits',
  link_type: 'recurring',
  label: 'Monthly Subscription',
  description: 'Premium plan',
  tx_id: 'at1...',
});

// Share: ${APP_URL}/pay?link=<link_hash>

// Resolve (no auth — payer side)
const info = await veil.resolvePaymentLink(link.link_hash);
console.log(info.label, info.amount, info.currency);`} />
        </SectionCard>

        {/* Verification */}
        <SectionCard title="On-Chain Verification" id="verify">
          <p className="text-[#c9c6c5]/70 text-sm mb-4">
            Verify any purchase directly against the Aleo blockchain. The <code className="bg-white/[0.05] px-1.5 py-0.5 rounded text-sky-300">purchase_exists</code> mapping stores BHP256 commitment hashes — no amounts or addresses.
          </p>

          <CodeBlock lang="typescript" code={`// Programmatic verification
const result = await veil.verifyPurchase('field_commitment...');
console.log(result.on_chain_verified); // true/false
console.log(result.receipt);           // off-chain metadata if stored

// REST API
// GET /integrate/verify/:commitment
// Returns: { verified: bool, on_chain: bool, receipt?: {...} }`} />

          <h3 className="text-[#e5e2e1]/90 font-medium mt-6 mb-3 text-sm">Support Proof Codes</h3>
          <p className="text-[#c9c6c5]/70 text-sm mb-3">
            Buyers generate Base64 proof codes from receipts and share them. Merchants paste codes on the Verify page for instant on-chain verification — no payment details exposed.
          </p>
          <CodeBlock code={`// Proof code format (Base64 JSON):
{
  "purchase_commitment": "field...",
  "product_hash": "field...",
  "salt": "field...",
  "merchant": "field...",
  "timestamp": 12345
}
// → btoa(JSON.stringify(proofData))
// → Paste on /verify → auto-fills → one-click verify`} />
        </SectionCard>

        {/* SSE */}
        <SectionCard title="Real-time Events (Server-Sent Events)" id="sse">
          <p className="text-[#c9c6c5]/70 text-sm mb-4">
            Subscribe to live payment notifications via SSE. 30-second keep-alive. Merchants receive events for all payment types instantly.
          </p>

          <CodeBlock lang="javascript" code={`// Connect to the event stream
const es = new EventSource(
  '${BASE_URL}/events/stream?token=' + jwt
);

es.addEventListener('payment.confirmed', (e) => {
  const data = JSON.parse(e.data);
  console.log('Payment received:', data.amount, data.currency);
});

es.addEventListener('link.fulfilled', (e) => {
  console.log('Link payment:', JSON.parse(e.data));
});

es.addEventListener('escrow.created', (e) => {
  console.log('Escrow locked:', JSON.parse(e.data));
});

// Available events: payment.confirmed, link.fulfilled,
// link.closed, escrow.created, escrow.completed`} />
        </SectionCard>

        {/* Privacy Model */}
        <SectionCard title="Privacy Model" id="privacy">
          <p className="text-[#c9c6c5]/70 text-sm mb-4">
            VeilReceipt uses Aleo's zero-knowledge proof system to guarantee cryptographic privacy at every layer.
          </p>

          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[#d4bbff]/10">
                  <th className="pb-2 pr-4 font-medium text-[#7dffa2]">Private (ZK Protected)</th>
                  <th className="pb-2 font-medium text-[#c9c6c5]/50">Public (On-Chain)</th>
                </tr>
              </thead>
              <tbody className="text-[#c9c6c5]/70 text-xs">
                <tr className="border-b border-[#d4bbff]/5"><td className="py-2 pr-4">Payment amounts</td><td className="py-2">BHP256 commitment hashes (opaque)</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-2 pr-4">Buyer & merchant addresses</td><td className="py-2">Boolean flags (purchase_exists, escrow_active)</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-2 pr-4">Cart items & quantities</td><td className="py-2">Review count aggregates per product</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-2 pr-4">Escrow timestamps (hashed)</td><td className="py-2">Link contribution counts</td></tr>
                <tr className="border-b border-[#d4bbff]/5"><td className="py-2 pr-4">Review ratings (in records only)</td><td className="py-2">Transaction confirmation</td></tr>
                <tr><td className="py-2 pr-4">Access token tiers & gates</td><td className="py-2">Program execution metadata</td></tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-[#e5e2e1]/90 font-medium mb-3 text-sm">Contract: veilreceipt_v8.aleo</h3>
          <p className="text-[#c9c6c5]/70 text-xs mb-2">17 transitions · 9 record types · 9 mappings · All commitments use BHP256::commit_to_field() with scalar randomizers</p>
          <p className="text-[#c9c6c5]/50 text-xs">
            Explorer: <a href="https://testnet.explorer.provable.com/program/veilreceipt_v8.aleo" target="_blank" rel="noopener noreferrer" className="text-[#d4bbff] hover:underline">testnet.explorer.provable.com/program/veilreceipt_v8.aleo</a>
          </p>
        </SectionCard>
      </div>
    </div>
  );
};

export default Developer;
