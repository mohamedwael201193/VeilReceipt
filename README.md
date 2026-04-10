<div align="center">

<img src="frontend/public/App Logo.png" width="72" height="72" alt="VeilReceipt" />

# VeilReceipt

### Privacy-First Zero-Knowledge Commerce Protocol on Aleo

*Buy anything. Prove everything. Reveal nothing.*

<br/>

[![Live App](https://img.shields.io/badge/Live-veil--receipt.vercel.app-7dffa2?style=for-the-badge)](https://veil-receipt.vercel.app)
[![Contract](https://img.shields.io/badge/Contract-veilreceipt__v8.aleo-8b5cf6?style=for-the-badge)](https://testnet.explorer.provable.com/program/veilreceipt_v8.aleo)
[![SDK](https://img.shields.io/badge/npm-veilreceipt--sdk-cb3837?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/veilreceipt-sdk)
[![Leo](https://img.shields.io/badge/Leo-3.4.0-a855f7?style=for-the-badge)](https://leo-lang.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

<br/>

**[Live App](https://veil-receipt.vercel.app)** · **[SDK Docs](https://veil-receipt.vercel.app/developer)** · **[Contract Explorer](https://testnet.explorer.provable.com/program/veilreceipt_v8.aleo)** · **[Leo Source](contracts/src/main.leo)**

</div>

---

## What is VeilReceipt?

VeilReceipt is a zero-knowledge commerce protocol on [Aleo](https://aleo.org). Buyers shop privately and merchants accept payments — with cryptographic proof that every transaction happened, but **zero information leaked** about who bought what, for how much, or from whom.

The protocol covers the **full commerce lifecycle** through a single Leo smart contract (`veilreceipt_v8.aleo`) with **17 transitions, 9 record types, and 9 mappings** — all commitment-keyed using `BHP256::commit_to_field()` with scalar randomizers.

| What's Private (ZK Protected) | What's Public (On-Chain) |
|---|---|
| Payment amounts | BHP256 commitment hashes (opaque) |
| Buyer & merchant addresses | Boolean flags (exists, active) |
| Cart items & quantities | Review count aggregates |
| Escrow timestamps (BHP256-hashed) | Link contribution counts |
| Review ratings (records only) | Transaction confirmations |
| Access token tiers | Program execution metadata |

---

## Features

| Feature | Description |
|---|---|
| **Triple Token Support** | Private payments via Aleo Credits, USDCx, and USAD stablecoins |
| **3 Payment Modes** | Private (full ZK), Public (auditable), Escrow (buyer-protected) |
| **On-Chain Escrow** | Trustless fund lock with BHP256-hashed timestamps and 500-block (~8h) refund window |
| **Cart Merkle Proofs** | Prove individual cart items without revealing the rest of the purchase (depth-2 tree) |
| **Payment Links** | Shareable on-chain links: one-time, recurring, open donation — with QR codes |
| **Access Tokens** | Receipt-gated 5-tier tokens (Bronze→Diamond) to prove purchase without revealing details |
| **Anonymous Reviews** | Verified star ratings with nullifier-based double-review prevention |
| **Support Proofs** | Shareable base64 proof codes — paste to verify instantly on-chain |
| **Merchant Dashboard** | Revenue analytics split by token, product CRUD, escrow tracking, payment links with QR |
| **Integration API** | API keys (SHA-256 hashed), HMAC-SHA256 webhooks, payment sessions, embeddable checkout |
| **TypeScript SDK** | `veilreceipt-sdk` on npm — typed methods for sessions, links, products, receipts, escrow, verification |
| **Real-time SSE** | Server-Sent Events for live payment notifications to merchants |
| **Delegated Proving** | Backend proxy to Provable DPS for faster ZK proof generation |
| **Self-Payment Guard** | Contract-level `assert(merchant != self.signer)` + frontend warning |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      USER BROWSER                         │
│                                                           │
│  ┌───────────────────────────────────────────────────┐   │
│  │        React Frontend (Vite 5 + TailwindCSS)       │   │
│  │                                                     │   │
│  │  Home · Shop · Pay · Receipts · Purchases           │   │
│  │  Merchant · Verify · Integrate · Developer          │   │
│  │                                                     │   │
│  │         useVeilWallet (Shield Wallet SDK)            │   │
│  └──────────┬───────────────────────┬──────────────────┘   │
│             │ wallet calls           │ REST API            │
└─────────────┼───────────────────────┼─────────────────────┘
              │                       │
   ┌──────────▼─────┐     ┌──────────▼────────────────────┐
   │  Shield Wallet  │     │     Express Backend API        │
   │  ────────────── │     │  ──────────────────────────    │
   │  ZK proof gen   │     │  /auth      /products          │
   │  TX signing     │     │  /receipts  /merchant          │
   │  Record decrypt │     │  /escrow    /links             │
   └──────────┬──────┘     │  /events    /integrate         │
              │            │  /proving                       │
              │            │                                 │
              │            │  Integration Layer:             │
              │            │  · API Keys (SHA-256)           │
              │            │  · Webhooks (HMAC-SHA256)       │
              │            │  · Payment Sessions (30min)     │
              │            │  · veilreceipt-sdk              │
              │            └──────────┬──────────────────────┘
              │                       │
   ┌──────────▼───────────────────────▼───────────────────┐
   │                   Aleo Testnet                        │
   │  ──────────────────────────────────────────────       │
   │  veilreceipt_v8.aleo   (17 transitions, 9 records)   │
   │  credits.aleo                                         │
   │  test_usdcx_stablecoin.aleo                           │
   │  test_usad_stablecoin.aleo                            │
   └───────────────────────────────────────────────────────┘

   ┌───────────────────────────────────────────────────┐
   │        External E-Commerce Platforms               │
   │  Shopify · WooCommerce · Custom Stores            │
   │                                                    │
   │  1. POST /integrate/payments  (API key auth)       │
   │  2. Redirect → /pay/:sessionId (hosted checkout)   │
   │  3. Webhook callback on confirmation               │
   │  4. GET /integrate/verify/:commitment              │
   └───────────────────────────────────────────────────┘
```

---

## Smart Contract — `veilreceipt_v8.aleo`

**Deployed on Aleo Testnet**
- **Deployment TX:** `at1cs0c6j3ghkdlplr4evp9xce6fr373zwp5xamghw45wnauxf2pugsk9wh8z`
- **Cost:** 28.751776 credits
- **Variables:** 1,984,571 / 2,097,152 (94.6% of testnet limit)
- **Imports:** `credits.aleo`, `test_usdcx_stablecoin.aleo`, `test_usad_stablecoin.aleo`

### 17 Transitions

| # | Transition | Type | Description |
|---|---|---|---|
| 1 | `purchase_private_credits` | async | Atomic private ALEO payment → BuyerReceipt + MerchantReceipt |
| 2 | `purchase_private_usdcx` | async | Private USDCx stablecoin payment + compliance |
| 3 | `purchase_private_usad` | async | Private USAD stablecoin payment + compliance |
| 4 | `purchase_public_credits` | async | Public ALEO payment (auditable) + private receipts |
| 5 | `purchase_escrow_credits` | async | Lock credits on-chain + EscrowReceipt |
| 6 | `complete_escrow` | async | Release locked funds → merchant private credits |
| 7 | `refund_escrow` | async | Self-refund within 500-block window (BHP256-hash verified) |
| 8 | `prove_cart_item` | inline | Merkle proof for specific cart item → CartItemProof |
| 9 | `prove_purchase_support` | inline | Generate support proof token |
| 10 | `verify_support_token` | inline | Public verification of support claim |
| 11 | `register_merchant` | async | On-chain merchant registration → MerchantLicense |
| 12 | `mint_access_token` | inline | Receipt-gated access token (5 tiers) → AccessToken |
| 13 | `submit_anonymous_review` | async | Anonymous review with nullifier → ReviewToken |
| 14 | `create_payment_link` | async | Create on-chain payment link → PaymentLink record |
| 15 | `fulfill_link_credits` | async | Pay link with credits → dual receipts |
| 16 | `close_payment_link` | async | Deactivate a payment link |
| 17 | `fulfill_link_escrow_credits` | async | Pay link with escrow lock |

### 9 Record Types

| Record | Owner | Purpose |
|---|---|---|
| `BuyerReceipt` | Buyer | Purchase proof with merchant, total, cart_commitment, token_type |
| `MerchantReceipt` | Merchant | Sales record with purchase_commitment, total, token_type |
| `EscrowReceipt` | Buyer | Escrow lock claim with merchant, total, purchase_commitment |
| `ReturnClaim` | Buyer | Refund proof with purchase_commitment, refund_amount |
| `CartItemProof` | Verifier | Merkle inclusion proof for a specific cart item |
| `MerchantLicense` | Merchant | On-chain registration with store_commitment |
| `AccessToken` | Buyer | Receipt-gated access with merchant, gate_commitment, tier |
| `ReviewToken` | Buyer | Anonymous review with product_hash, rating, review_commitment |
| `PaymentLink` | Merchant | Link record with link_hash, amount, currency, link_type |

### 9 Mappings (All Commitment-Keyed)

```leo
mapping purchase_exists:    field => bool    // Replay prevention
mapping escrow_active:      field => bool    // Active escrow tracking
mapping escrow_timestamps:  field => field   // BHP256-hashed block height
mapping return_processed:   field => bool    // Double-refund prevention
mapping merchant_active:    field => bool    // Merchant registry
mapping review_submitted:   field => bool    // Nullifier for double-review
mapping review_count:       field => u64     // Aggregate review count
mapping link_active:        field => bool    // Payment link status
mapping link_contributions: field => u64     // Contribution count per link
```

**No raw addresses, amounts, or identities stored in any mapping.**

---

## End-to-End Flows

### Private Purchase (Credits / USDCx / USAD)

```
Buyer                    Shield Wallet              Aleo Testnet
──────                   ─────────────              ────────────
Add items to cart
Select Private mode
Choose token
Click Pay
                         Generate ZK proof
                         purchase_private_*()
                                                    finalize:
                                                    purchase_exists[commit] = true
                         ← at1... TX ID
BuyerReceipt ✓ (encrypted for buyer)
MerchantReceipt ✓ (encrypted for merchant)
```

### Escrow → Release or Refund

```
purchase_escrow_credits()
  → Credits locked under program address
  → escrow_active[commit] = true
  → escrow_timestamps[commit] = BHP256::hash_to_field(block.height)
  → BuyerReceipt + EscrowReceipt issued
       │
       ├── Within 500 blocks ──► refund_escrow()
       │     Verify hash, check window, return credits
       │     → ReturnClaim issued
       │
       └── Satisfied ────────► complete_escrow()
             Release to merchant private record
             → MerchantReceipt issued
```

### Cart Merkle Proofs

```
4 items → depth-2 Merkle tree:
  leaf₀ = hash(item₀)   leaf₁ = hash(item₁)
  leaf₂ = hash(item₂)   leaf₃ = hash(0field)  ← zero padding
  root = hash(hash(leaf₀, leaf₁), hash(leaf₂, leaf₃))
  root = cart_commitment in receipt

prove_cart_item(receipt, item₁, path, verifier)
  → Verifies Merkle path → CartItemProof to verifier
  → Verifier sees: item₁ was in purchase. Nothing else.
```

### Support Proof → Share → Verify

```
Buyer: prove_purchase_support() → proofData
       "Copy Proof Code" → base64 string
       Share with merchant

Merchant: Paste on /verify → auto-fill → "Verify On-Chain"
          → Checks purchase_exists mapping → ✓ Verified
```

### Access Tokens (Receipt-Gated)

```
mint_access_token(receipt, gate_id, tier)
  gate_commitment = hash(purchase_commitment + gate_id)
  → AccessToken { tier: Bronze | Silver | Gold | Platinum | Diamond }
  Proves purchase without revealing amount, items, or identity.
```

### Anonymous Reviews

```
submit_anonymous_review(receipt, product_hash, rating)
  nullifier = hash(purchase_commitment + product_hash + signer)
  → Prevents double-review (nullifier stored on-chain)
  → review_count[product_hash] += 1 (aggregate only)
  → Rating stored in private ReviewToken record only
  Shop page displays: ★ bars with verified counts
```

### Payment Links

```
Merchant: create_payment_link(link_hash, amount, currency, link_type)
  → PaymentLink record + link_active[hash] = true

Buyer: /pay?link=<hash> → choose token → fulfill_link_credits()
  → BuyerReceipt + MerchantReceipt + link_contributions++

Supports: one_time (auto-close after 1 payment), recurring, open (payer sets amount)
QR codes generated for each link.
```

---

## Application Pages

| Page | Route | Description |
|---|---|---|
| **Home** | `/` | Animated hero, live network stats, 6 feature cards with SVG illustrations, "How it Works" flow |
| **Shop** | `/checkout` | Product catalog, 3 privacy modes, 3 tokens, cart, star ratings with verified review counts |
| **Pay** | `/pay` | Unified payment handler for sessions and links, self-payment guard, token selection, escrow |
| **Receipts** | `/receipts` | 3 tabs: Receipts (support proofs), Sales (revenue by token), Escrow (release/refund countdown) |
| **Purchases** | `/purchases` | Purchase history, Merkle proof actions, support proof generation, copy proof codes |
| **Verify** | `/verify` | Access tokens (mint 5 tiers), anonymous reviews (star ratings), proof verification (paste code) |
| **Merchant** | `/merchant` | On-chain registration, revenue analytics, product CRUD, payment links with QR, real-time SSE |
| **Integrate** | `/integrate` | API key management, webhook configuration, Quick Start docs, full API reference |
| **Developer** | `/developer` | Public SDK documentation, REST API reference, webhook events, privacy model table |

---

## Integration API

### Quick Start

```bash
# 1. Create API key (from /integrate dashboard)
# 2. Create payment session
curl -X POST https://veilreceipt-api.onrender.com/integrate/payments \
  -H "X-API-Key: veil_pk_..." \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000000, "currency": "credits", "description": "Order #42"}'
# → { id, checkout_url, status, expires_at }

# 3. Redirect customer to checkout_url
# 4. Receive webhook: payment.confirmed
# 5. Verify: GET /integrate/verify/:commitment
```

### SDK

```bash
npm install veilreceipt-sdk
```

```typescript
import { VeilReceipt } from 'veilreceipt-sdk';

const veil = new VeilReceipt({
  baseUrl: 'https://veilreceipt-api.onrender.com',
  apiKey: 'veil_pk_...',
});

const session = await veil.getPaymentSession('ps_abc123');
const result = await veil.verifyPurchase('commitment...');
const link = await veil.resolvePaymentLink('hash...');
```

### Webhook Events

| Event | Trigger |
|---|---|
| `payment.confirmed` | On-chain payment confirmed |
| `payment.failed` | Payment failed |
| `escrow.created` | Funds locked in escrow |
| `escrow.completed` | Escrow released to merchant |
| `refund.processed` | Escrow refunded to buyer |
| `link.fulfilled` | Payment link received payment |
| `link.closed` | Payment link deactivated |

Signed with HMAC-SHA256 (`X-VeilReceipt-Signature` header). Auto-disabled after 10 consecutive failures.

---

## Privacy Design Decisions

1. **BHP256::commit_to_field()** with `scalar` randomizers — proper hiding + binding commitment scheme for all purchases
2. **No addresses in finalize** — all 13 finalize blocks receive only commitment hashes, never raw addresses or amounts
3. **Hashed escrow timestamps** — `BHP256::hash_to_field(block.height)` prevents timing analysis attacks
4. **Review nullifiers** — `hash(commitment + product + signer)` prevents double-review without identity leak
5. **Ratings never on-chain** — stored exclusively in encrypted `ReviewToken` records
6. **Atomic dual-record issuance** — BuyerReceipt + MerchantReceipt in one ZK transaction
7. **Backend stores only metadata** — commitment hashes and token types, never amounts or addresses

---

## Tech Stack

| Layer | Technology |
|---|---|
| Contract | Leo 3.4.0 · BHP256 commitments · 17 transitions · credits.aleo + USDCx + USAD |
| Wallet | Shield Wallet SDK (ZK proofs + auto-decryption) |
| Frontend | React 18 · TypeScript · Vite 5 · TailwindCSS · Zustand · Framer Motion · GSAP |
| Backend | Node.js · Express · TypeScript · PostgreSQL / JSON · Zod validation · JWT |
| SDK | veilreceipt-sdk · TypeScript · tsup (CJS + ESM + .d.ts) |
| Real-time | Server-Sent Events with 30s keep-alive |
| Integration | HMAC-SHA256 webhooks · SHA-256 API keys · Delegated proving via Provable DPS |

---

## Project Structure

```
VeilReceipt/
├── contracts/
│   ├── src/main.leo              ← Full protocol (17 transitions, 9 records, 9 mappings)
│   └── build/main.aleo           ← Compiled bytecode
├── backend/
│   └── src/
│       ├── index.ts              ← Express server
│       ├── routes/
│       │   ├── auth.ts           ← Nonce-based wallet auth (JWT)
│       │   ├── products.ts       ← Product catalog CRUD
│       │   ├── merchant.ts       ← Revenue dashboard
│       │   ├── receipts.ts       ← Receipt storage + webhooks
│       │   ├── escrow.ts         ← Escrow lifecycle + webhooks
│       │   ├── links.ts         ← Payment link CRUD
│       │   ├── events.ts         ← SSE real-time streaming
│       │   ├── integrate.ts      ← API keys, webhooks, payment sessions
│       │   └── proving.ts        ← Delegated proving proxy
│       ├── middleware/
│       │   ├── auth.ts           ← JWT authentication
│       │   └── apiKey.ts         ← API key auth (SHA-256 hashed)
│       └── services/
│           ├── database.ts       ← PostgreSQL (prod) / JSON (dev)
│           ├── aleo.ts           ← On-chain RPC queries
│           └── webhooks.ts       ← HMAC-SHA256 webhook dispatcher
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Home.tsx          ← Landing + feature showcase
│       │   ├── Checkout.tsx      ← Shop + cart + star ratings
│       │   ├── Pay.tsx           ← Unified payment (sessions + links)
│       │   ├── Receipts.tsx      ← Receipt management + escrow lifecycle
│       │   ├── Purchases.tsx     ← History + Merkle proofs
│       │   ├── Merchant.tsx      ← Dashboard + analytics + payment links
│       │   ├── Verify.tsx        ← Access tokens + reviews + proof verification
│       │   ├── Integrate.tsx     ← API key / webhook management
│       │   └── Developer.tsx     ← Public SDK / API documentation
│       ├── hooks/
│       │   └── useVeilWallet.ts  ← All wallet ops + ZK proof + TX polling
│       ├── stores/               ← Zustand (cart, tx, user)
│       └── lib/                  ← API client, chain constants, Merkle tree, utils
└── packages/
    └── sdk/                      ← veilreceipt-sdk npm package
        └── src/index.ts          ← VeilReceipt client class
```

---

## Local Development

```bash
# Clone
git clone https://github.com/mohamedwael201193/VeilReceipt
cd VeilReceipt

# Backend (terminal 1)
cd backend && npm install && npm run dev    # → http://localhost:3001

# Frontend (terminal 2)
cd frontend && npm install && npm run dev   # → http://localhost:5173
```

### Environment

```env
# Frontend .env
VITE_API_BASE_URL=http://localhost:3001
VITE_ALEO_NETWORK=testnet
VITE_ALEO_PROGRAM_ID=veilreceipt_v8.aleo

# Backend .env
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret
ALEO_PROGRAM_ID=veilreceipt_v8.aleo
```

---

## License

MIT
