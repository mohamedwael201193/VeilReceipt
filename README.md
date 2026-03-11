<div align="center">

<img src="frontend/public/App Logo.png" width="72" height="72" alt="VeilReceipt" />

# VeilReceipt

### 🛡️ Privacy-First Commerce Protocol on Aleo

*Buy anything. Prove everything. Reveal nothing.*

<br/>

[![Aleo Testnet](https://img.shields.io/badge/Network-Aleo%20Testnet-6366f1?style=for-the-badge)](https://explorer.provable.com/testnet)
[![Contract](https://img.shields.io/badge/Contract-veilreceipt__v7.aleo-8b5cf6?style=for-the-badge)](https://testnet.explorer.provable.com)
[![Leo](https://img.shields.io/badge/Leo-Smart%20Contract-a855f7?style=for-the-badge)](https://leo-lang.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)

<br/>

**[🛒 Shop](frontend/src/pages/Checkout.tsx)** &nbsp;·&nbsp; **[🧾 Receipts](frontend/src/pages/Receipts.tsx)** &nbsp;·&nbsp; **[🔐 Verify](frontend/src/pages/Verify.tsx)** &nbsp;·&nbsp; **[📊 Merchant](frontend/src/pages/Merchant.tsx)** &nbsp;·&nbsp; **[📜 Contract](contracts/src/main.leo)**

</div>

---

## 🔍 What is VeilReceipt?

**VeilReceipt** is a zero-knowledge commerce protocol built entirely on [Aleo](https://aleo.org). It lets buyers shop privately and merchants accept payments — with cryptographic proof that every transaction happened, but **zero information leaked** about who bought what, for how much, or from whom.

> 🔐 **What you bought** — hidden &nbsp;|&nbsp; 💰 **How much you paid** — hidden &nbsp;|&nbsp; 🏪 **Who you paid** — hidden

The protocol covers the full commerce lifecycle:

| Feature | What it does |
|---|---|
| 🔒 **Private Purchase** | ZK proof of payment — `BHP256::commit_to_field()` with scalar randomizers |
| 🌐 **Public Purchase** | Auditable on-chain payment for compliance use cases |
| 🔐 **Escrow** | Trustless fund lock with BHP256-hashed timestamps and 500-block (~8h) refund window |
| 🌲 **Cart Merkle Proofs** | Prove individual cart items without revealing the rest of your purchase |
| 🎤 **Support Proofs** | Shareable proof codes for dispute resolution — paste to verify instantly |
| 📎 **Merchant Registration** | On-chain merchant identity with MerchantLicense records |
| 💎 **Three Payment Tokens** | Private purchases via Aleo Credits, USDCx, and USAD stablecoins |
| 🎟️ **Access Tokens** | Receipt-gated access tokens — prove purchase without revealing details (5 tiers) |
| ⭐ **Anonymous Reviews** | Verified star ratings with nullifier-based double-review prevention |

Everything runs through a single Leo smart contract (`veilreceipt_v7.aleo`) deployed on Aleo Testnet, with a React frontend and Express API backend.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                           │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │          React Frontend  (Vite + Tailwind CSS)            │  │
│  │                                                           │  │
│  │  🛒 Shop        🧾 Receipts    🔐 Verify    📊 Merchant   │  │
│  │  ────────────   ────────────   ──────────   ────────────  │  │
│  │  Product cards  Buyer rcpts    Access tkns  Revenue split │  │
│  │  Cart + modal   Escrow mgmt   Anon review  ALEO/USDCx/   │  │
│  │  Pay mode sel   Support proof  My tokens    USAD stats    │  │
│  │  Star ratings   Copy Code      Verify Proof Product CRUD  │  │
│  │  3 token types  JSON export    Star rating  On-chain reg  │  │
│  │                                                           │  │
│  │          useVeilWallet hook  (Shield Wallet SDK)           │  │
│  └────────────────┬──────────────────────┬───────────────────┘  │
│                   │  wallet calls         │  REST API           │
└───────────────────┼──────────────────────┼─────────────────────┘
                    │                      │
         ┌──────────▼──────┐    ┌──────────▼──────────────┐
         │  Shield Wallet  │    │  Express Backend API     │
         │  ─────────────  │    │  ─────────────────────   │
         │  ZK proof gen   │    │  /auth    /products      │
         │  TX signing     │    │  /receipts  /merchant    │
         │  Record decrypt │    │  /escrow                 │
         └──────────┬──────┘    └──────────┬───────────────┘
                    │                      │
         ┌──────────▼──────────────────────▼──────────────┐
         │                  Aleo Testnet                   │
         │  ────────────────────────────────────────────   │
         │  veilreceipt_v7.aleo        (13 transitions)    │
         │  test_usdcx_stablecoin.aleo                     │
         │  test_usad_stablecoin.aleo                      │
         └──────────────────────┬──────────────────────────┘
                                │  metadata only
                     ┌──────────▼──────────┐
                     │  PostgreSQL (prod)   │
                     │  JSON file  (dev)    │
                     │  commitment hashes   │
                     │  no private data     │
                     └─────────────────────┘
```

---

## 📜 Smart Contract — `veilreceipt_v7.aleo`

The entire protocol lives in one Leo program with **13 transitions**, **8 record types**, and **7 mappings**. All on-chain state uses **BHP256::commit_to_field** with scalar randomizers — raw addresses, amounts, and identities are never stored in any mapping.

### Record Types (Private — encrypted for owner)

| Record | Owner | Key Fields | Purpose |
|--------|-------|-----------|---------|
| `BuyerReceipt` | Buyer | merchant, total, cart_commitment, timestamp, purchase_commitment, token_type | Buyer proof of purchase |
| `MerchantReceipt` | Merchant | purchase_commitment, total, token_type | Merchant proof of sale |
| `EscrowReceipt` | Buyer | merchant, total, purchase_commitment | Escrow lock claim |
| `ReturnClaim` | Buyer | purchase_commitment, refund_amount, return_reason_hash | Refund receipt |
| `CartItemProof` | Verifier | item_commitment, cart_root, verified | Merkle inclusion proof |
| `MerchantLicense` | Merchant | store_commitment | On-chain registration |
| `AccessToken` | Buyer | merchant, gate_commitment, token_tier | Receipt-gated access proof |
| `ReviewToken` | Buyer | product_hash, rating, review_commitment | Anonymous verified review |

### On-Chain Mappings (Commitment-keyed — no raw data stored)

```leo
mapping purchase_exists:    field => bool    // replay-attack prevention
mapping escrow_active:      field => bool    // is escrow live?
mapping escrow_timestamps:  field => field   // BHP256-hashed block height at lock
mapping return_processed:   field => bool    // double-refund prevention
mapping merchant_active:    field => bool    // merchant registration status
mapping review_submitted:   field => bool    // nullifier for double-review prevention
mapping review_count:       field => u64     // aggregate review count per product
```

No raw merchant addresses, amounts, buyer identities, or block heights are stored — only BHP256 commitment hashes and opaque nullifiers.

### All 13 Transitions

| # | Transition | Type | Description |
|---|-----------|------|-------------|
| 1 | `purchase_private_credits` | async | Atomic private ALEO purchase → BuyerReceipt + MerchantReceipt |
| 2 | `purchase_private_usdcx` | async | Atomic private USDCx purchase + compliance record |
| 3 | `purchase_private_usad` | async | Atomic private USAD purchase + compliance record |
| 4 | `purchase_public_credits` | async | Public ALEO purchase (amounts visible) + private receipts |
| 5 | `purchase_escrow_credits` | async | Lock credits on-chain under program address + EscrowReceipt |
| 6 | `complete_escrow` | async | Buyer releases locked funds → private credits to merchant |
| 7 | `refund_escrow` | async | Buyer self-refunds within 500-block window (hash-verified) |
| 8 | `prove_cart_item` | inline | Merkle proof for a specific cart item |
| 9 | `prove_purchase_support` | inline | Selective-disclosure support proof token |
| 10 | `verify_support_token` | inline | Public verification of a support token |
| 11 | `register_merchant` | async | On-chain merchant registration with MerchantLicense |
| 12 | `mint_access_token` | inline | Receipt-gated access token minting (5 tiers) |
| 13 | `submit_anonymous_review` | async | Anonymous verified review with nullifier |

---

## 🔄 End-to-End Flows

### 🔒 Private Purchase (Credits / USDCx / USAD)

```
Buyer                    Shield Wallet              Aleo Testnet
──────                   ─────────────              ────────────
Add items to cart
Select "Private" mode
Choose token (Credits/USDCx/USAD)
Click Pay
                         Generate ZK proof
                         purchase_private_*()
                                                    finalize:
                                                    purchase_exists
                                                    [commitment] = true
                         ← at1xyz... TX ID
BuyerReceipt ✓ (encrypted, only buyer can read)
                         MerchantReceipt ✓ (encrypted, only merchant can read)
TX panel → ✓ DONE
```

### 🔐 Escrow → Release or Refund

```
Buyer pays with Escrow mode
         │
         ▼
purchase_escrow_credits()
   Credits locked under veilreceipt_v7.aleo program address
   escrow_active[commitment]     = true
   escrow_timestamps[commitment] = BHP256::hash_to_field(block.height)
   → BuyerReceipt + EscrowReceipt issued to buyer
         │
         ├── Within 500 blocks (~8h) ──► refund_escrow(created_block)
         │        assert hash(created_block) == stored_hash
         │        assert block.height < created_block + 500
         │        assert !return_processed[commitment]
         │        Credits returned → buyer private record
         │        → ReturnClaim issued
         │
         └── Buyer satisfied ──────────► complete_escrow()
                  Credits released → merchant private record
                  → MerchantReceipt issued
```

### 🌲 Cart Merkle Proofs

```
Purchase with 3 items (padded to 4 leaves)
         │
         ▼
Build depth-2 Merkle tree:
   leaf_0 = hash(item_0)   leaf_1 = hash(item_1)
   leaf_2 = hash(item_2)   leaf_3 = hash(0field)  ← zero padding

   node_01 = hash(leaf_0, leaf_1)
   node_23 = hash(leaf_2, leaf_3)
   root    = hash(node_01, node_23)  ← stored as cart_commitment

         ┌─────────────────────────────────────────────────────┐
         │  prove_cart_item(receipt, item_1, path, verifier)   │
         │                                                     │
         │  Verifies Merkle path from item_1 to cart root      │
         │  Verifier receives: CartItemProof { verified }       │
         │  Verifier never sees: other items, total, merchant  │
         └─────────────────────────────────────────────────────┘
```

### 🎤 Support Proof → Shareable Code → Verify

```
Buyer (Receipts page)              Merchant (Verify page)
─────────────────────              ──────────────────────
Click "Support Proof"
prove_purchase_support()
← proof_token + proofData
     (commitment, product_hash,
      salt, merchant, timestamp)

Click "Copy Proof Code"
→ base64-encoded JSON string
                                   Paste proof code in "Quick Verify"
Share with merchant                → Auto-fills all fields
                                   Click "Verify On-Chain"
                                   → Checks purchase_exists mapping
                                   → ✓ Verified / ✗ Not Verified
```

### 🎟️ Access Tokens (Receipt-Gated)

```
Buyer has a BuyerReceipt
         │
         ▼
mint_access_token(receipt, gate_id, tier)
   gate_commitment = hash(purchase_commitment + gate_id)
   → AccessToken { merchant, gate_commitment, token_tier }
         │
         ▼
5 tiers: Bronze (1) → Silver (2) → Gold (3) → Platinum (4) → Diamond (5)
Token proves purchase from merchant without revealing amount, items, or identity
"Copy Proof" generates shareable base64 code
"Token Minted" badge shown on receipts from same merchant
```

### ⭐ Anonymous Reviews

```
Buyer has a BuyerReceipt + selects product by SKU
         │
         ▼
submit_anonymous_review(receipt, product_hash, rating)
   nullifier = hash(purchase_commitment + product_hash + signer)
   finalize: assert !review_submitted[nullifier]  → prevents double-review
             review_count[product_hash] += 1       → aggregate count
   → ReviewToken { product_hash, rating, review_commitment }
         │
         ▼
Shop page shows: ★ star rating bar with count on each product
Click rating bar → review detail modal with your rating, total count, ZK privacy info
Ratings are private (stored only in ReviewToken record) — only counts are public
```

---

## 💳 Payment Modes

| Mode | Privacy | Tokens | On-chain State | Best For |
|---|---|---|---|---|
| 🔒 **Private** | Full ZK | ALEO · USDCx · USAD | Commitment hash only | Default — maximum privacy |
| 🌐 **Public** | Amount visible | ALEO | Amount + addresses | Auditable / compliance |
| 🔐 **Escrow** | Full ZK | ALEO | Commitment + locked funds | Buyer protection |

---

## 🗃️ Project Structure

```
VeilReceipt/
│
├── 📜 contracts/
│   ├── src/main.leo              ← Full protocol (13 transitions, 8 records, 7 mappings)
│   └── build/                   ← Compiled .aleo bytecode
│
├── 🖥️ backend/
│   └── src/
│       ├── index.ts              ← Express server
│       ├── types.ts              ← Zod schemas + shared types
│       ├── routes/
│       │   ├── auth.ts           ← Nonce-based wallet auth
│       │   ├── products.ts       ← Product catalog CRUD
│       │   ├── merchant.ts       ← Revenue dashboard + token analytics
│       │   ├── receipts.ts       ← Off-chain receipt metadata
│       │   └── escrow.ts         ← Escrow record management
│       └── services/
│           ├── database.ts       ← PostgreSQL (prod) / JSON (dev)
│           └── aleo.ts           ← TX status + block height RPC
│
└── 🎨 frontend/
    └── src/
        ├── pages/
        │   ├── Home.tsx          ← Landing page + feature showcase + live stats
        │   ├── Checkout.tsx      ← Shop + cart + star ratings + 3-token checkout
        │   ├── Purchases.tsx     ← Purchase history + Merkle proofs + support proofs
        │   ├── Merchant.tsx      ← Revenue dashboard + on-chain registration
        │   ├── Receipts.tsx      ← Receipts + escrow + Copy Code + JSON export
        │   └── Verify.tsx        ← Access tokens + reviews + My Tokens + Verify Proof
        ├── hooks/
        │   └── useVeilWallet.ts  ← All wallet ops + ZK proof + TX polling
        ├── stores/
        │   ├── cartStore.ts      ← Zustand cart state
        │   ├── txStore.ts        ← TX tracker (shield→at1 ID resolution)
        │   └── userStore.ts      ← Auth + session
        ├── lib/
        │   ├── api.ts            ← Backend REST client
        │   ├── chain.ts          ← Constants (escrow window, program ID)
        │   ├── merkle.ts         ← Cart Merkle tree builder + proof formatting
        │   ├── stablecoin.ts     ← USDCx / USAD / Credits formatting
        │   └── utils.ts          ← toAleoField, formatting utilities
        └── components/
            ├── ui/Components.tsx ← Design system (Card, Badge, Button…)
            ├── icons/Icons.tsx   ← ALEO + USDCx + USAD token icons
            └── layout/Header.tsx ← Navigation
```

---

## 🧠 Key Design Decisions

### 🔑 BHP256::commit_to_field() Commitments

Aleo mappings are **public state**. VeilReceipt uses proper `BHP256::commit_to_field(PurchaseData, scalar_salt)` for all purchase commitments. The `scalar` type provides a cryptographic randomizer that makes commitments binding and hiding — a blockchain observer sees only commitments, the purchase relationship is completely hidden.

### 🎟️ Receipt-Gated Access Tokens

Buyers mint an `AccessToken` from any purchase receipt. The token proves purchase from a specific merchant without revealing what was bought, how much was paid, or when. `gate_commitment = BHP256::hash_to_field(purchase_commitment + gate_id)` binds the token to a specific gate/purpose. The receipt is non-consuming — nonce_seed rotation prevents replay. Five tiers (Bronze→Diamond) enable tiered access control.

### ⭐ Anonymous Verified Reviews

Buyers submit reviews by proving purchase via receipt and selecting a product by SKU. A double-review nullifier `BHP256::hash_to_field(purchase_commitment + product_hash + signer)` prevents submitting multiple reviews for the same product from the same receipt. Ratings (1-5 stars) are stored only in the private `ReviewToken` record — never on-chain. The `review_count` mapping shows aggregate popularity without any reviewer identity. The Shop page displays star rating bars with counts, and a review detail modal shows your personal rating alongside the total count.

### 🎤 Shareable Support Proof Codes

Support proofs are generated from receipts via `prove_purchase_support`. The proof data (purchase commitment, product hash, salt, merchant, timestamp) is encoded as a base64 JSON string — buyers click "Copy Proof Code" and share it. Merchants paste the code on the Verify page to auto-fill all fields and verify on-chain with one click. The proof reveals nothing about the payment amount or other items.

### 🔒 Hashed Escrow Timestamps

Escrow creation block heights are stored as `BHP256::hash_to_field(block.height)` instead of raw values. This prevents timing analysis that could deanonymize purchases. At refund time, the buyer provides the raw block height; finalize verifies the hash matches before checking the 500-block window.

### ⚛️ Atomic Dual-Record Issuance

Each purchase creates a `BuyerReceipt` and a `MerchantReceipt` in the **same ZK transaction**. The circuit guarantees both records are issued simultaneously — no race condition, no partial state. This applies to all three tokens (Credits, USDCx, USAD).

### 🌲 Merkle Cart Proofs

Cart items are organized into a depth-2 binary Merkle tree (max 4 items per purchase). The root becomes the `cart_commitment` in the receipt. Later, `prove_cart_item` verifies a Merkle path on-chain and issues a `CartItemProof` to a verifier — proving a specific item was purchased without revealing other items, the total, or the merchant.

### 🗄️ Backend Stores Only Metadata

The backend stores commitment hashes and non-sensitive fields (`token_type`, `purchase_type`). **No amounts, no addresses, no identities** are ever sent to the backend. All private data stays exclusively in the user's wallet.

---

## 🎨 Application Pages

### 🏠 Home
Landing page with wallet connect, animated hero, live network stats (contract version, 13 transitions, block height, 8 ZK proof types), feature showcase with SVG illustrations for all 6 core features (Private Payments, Dual Receipts, Escrow & Refunds, Support Proofs, Access Tokens, Anonymous Reviews), and a 4-step "How it Works" flow.

### 🛒 Shop
Product catalog fetched from API. Three privacy modes (Private, Public, Escrow) and three tokens (Aleo Credits, USDCx, USAD). Cart sidebar with itemized totals. Order confirmation modal before checkout. Star rating bar on each product card showing verified review count — click to see detailed review modal with your personal rating, total count, and ZK privacy explanation. Self-purchase prevention enforced by the contract.

### 🧾 Receipts
Three tabs — **Receipts** (buyer receipts with token type badges, "Support Proof" button, "Copy Code" for proven receipts, JSON export), **Sales** (merchant receipts with revenue summary split by Credits/USDCx/USAD), **Escrow** (active escrows with Release/Refund actions, 500-block countdown). "Proof Sent" badge persists across page reloads via localStorage.

### 📦 Purchases
Purchase history dashboard with Merkle proof actions. "Prove Item" generates a cart Merkle proof for any item (warranty, returns, review verification). "Support Proof" generates a shareable proof code. Copy Proof Code button for all proven receipts.

### 🔐 Verify
Four tabs — **Access Tokens** (mint receipt-gated tokens with 5 tiers, "Token Minted" badge), **Reviews** (select product by SKU, star rating selector, on-chain review count display), **My Tokens** (access tokens with tier labels + review tokens with star display and per-product counts), **Verify Proof** (paste base64 proof code for instant auto-fill, one-click on-chain verification via `purchase_exists` mapping).

### 📊 Merchant
On-chain registration with `register_merchant` transition. Revenue analytics split by token type (ALEO, USDCx, USAD). Product CRUD management with price currency selection. Sales history. Privacy note: all buyer addresses are hashed before storage.

---

## 🚀 Local Development

### Prerequisites

- **Node.js** 18+
- **Leo CLI** — `curl -sSf https://install.leo-lang.org | sh`
- **Shield Wallet** — [Chrome Extension](https://chromewebstore.google.com)

### Setup

```bash
# Clone
git clone https://github.com/mohamedwael201193/VeilReceipt
cd VeilReceipt

# Backend  (terminal 1)
cd backend
npm install
npm run dev          # → http://localhost:3001

# Frontend  (terminal 2)
cd frontend
npm install
npm run dev          # → http://localhost:5173
```

### Frontend `.env`

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_ALEO_NETWORK=testnet
VITE_ALEO_PROGRAM_ID=veilreceipt_v7.aleo
VITE_ALEO_RPC_URL=https://api.explorer.provable.com/v1
```

---

## 🗺️ Roadmap

### ✅ Shipped (v7 — Wave 3)
- [x] Leo smart contract with **13 transitions, 8 record types, 7 mappings** — deployed on Aleo Testnet
- [x] Proper `BHP256::commit_to_field()` with scalar randomizers for all commitments
- [x] **Three payment tokens**: Aleo Credits + USDCx + USAD stablecoins
- [x] Atomic private purchases with all three tokens (ZK proof, no on-chain identity)
- [x] Public purchase mode for auditable transactions
- [x] Trustless escrow with **BHP256-hashed timestamps** and 500-block (~8 hour) refund window
- [x] Cart Merkle tree proofs — prove individual items without revealing the full cart
- [x] On-chain merchant registration with MerchantLicense records
- [x] **Shareable support proof codes** — base64-encoded, paste-to-verify workflow
- [x] **Receipt-gated access tokens** — 5-tier system (Bronze→Diamond), Copy Proof, Token Minted badges
- [x] **Anonymous verified reviews** — product SKU selection, nullifier-based double-review prevention, aggregate counting
- [x] **Star rating display on Shop** — rating bars with counts, review detail modal, personal rating badges
- [x] **Persistent proof state** — Proof Sent badges and proof data survive page reloads via localStorage
- [x] Verify page with 4 tabs: Access Tokens, Reviews, My Tokens, Verify Proof
- [x] Quick Verify: paste proof code → auto-fill all fields → one-click on-chain verification
- [x] Order confirmation modal with itemized cart summary before checkout
- [x] Receipt JSON export for record-keeping
- [x] Live stats dashboard — contract version, transitions, block height, privacy features
- [x] Express API with PostgreSQL (prod) / JSON (dev) adapter
- [x] React + Shield Wallet frontend with real-time TX tracker
- [x] TX ID resolution: shield temp → real `at1` on-chain ID with RPC auto-confirm
- [x] Merchant revenue analytics split by token type (ALEO / USDCx / USAD)
- [x] Redesigned all pages with custom dark UI, SVG illustrations, animations
- [x] Wallet record fetch retry logic for reliable first-click transactions

### 🔬 Future
- [ ] Partial category disclosure — prove purchase category, not specific product
- [ ] Third-party escrow arbitration with ZK evidence submission
- [ ] Cross-merchant private reputation scoring
- [ ] Verifier SDK (npm package) for external platforms
- [ ] Mobile wallet support
- [ ] Mainnet deployment

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit with clear messages
4. Open a Pull Request

---

## 📄 License

MIT © VeilReceipt

---

<div align="center">

Built with 💜 on [Aleo](https://aleo.org)

*The future of private commerce is zero-knowledge.*

</div>
