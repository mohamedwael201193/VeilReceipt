<div align="center">

<img src="frontend/public/aleoicon.png" width="72" height="72" alt="VeilReceipt" />

# VeilReceipt

### 🛡️ Privacy-First Commerce Protocol on Aleo

*Buy anything. Prove everything. Reveal nothing.*

<br/>

[![Aleo Testnet](https://img.shields.io/badge/Network-Aleo%20Testnet-6366f1?style=for-the-badge)](https://explorer.provable.com/testnet)
[![Contract](https://img.shields.io/badge/Contract-veilreceipt__v3.aleo-8b5cf6?style=for-the-badge)](https://testnet.explorer.provable.com)
[![Leo](https://img.shields.io/badge/Leo-Smart%20Contract-a855f7?style=for-the-badge)](https://leo-lang.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)

<br/>

**[🛒 Shop](frontend/src/pages/Checkout.tsx)** &nbsp;·&nbsp; **[🧾 Receipts](frontend/src/pages/Receipts.tsx)** &nbsp;·&nbsp; **[📊 Merchant](frontend/src/pages/Merchant.tsx)** &nbsp;·&nbsp; **[📜 Contract](contracts/src/main.leo)**

</div>

---

## 🔍 What is VeilReceipt?

**VeilReceipt** is a zero-knowledge commerce protocol built entirely on [Aleo](https://aleo.org). It lets buyers shop privately and merchants accept payments — with cryptographic proof that every transaction happened, but **zero information leaked** about who bought what, for how much, or from whom.

> 🔐 **What you bought** — hidden &nbsp;|&nbsp; 💰 **How much you paid** — hidden &nbsp;|&nbsp; 🏪 **Who you paid** — hidden

The protocol covers the full commerce lifecycle:

| Feature | What it does |
|---|---|
| 🔒 **Private Purchase** | ZK proof of payment — encrypted receipts for buyer & merchant |
| 🌐 **Public Purchase** | Auditable on-chain payment for compliance use cases |
| 🔐 **Escrow** | Trustless fund lock with an enforced 500-block (~8h) refund window |
| ⭐ **Loyalty Stamps** | Accumulate stamps per purchase; prove tier without revealing your history |
| 🎫 **Support Proofs** | Selective-disclosure tokens for dispute resolution |
| 💎 **USDCx Payments** | Private stablecoin purchases via `test_usdcx_stablecoin.aleo` |

Everything runs through a single Leo smart contract (`veilreceipt_v3.aleo`) deployed on Aleo Testnet, with a React frontend and Express API backend.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        USER BROWSER                           │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │        React Frontend  (Vite + Tailwind CSS)          │    │
│  │                                                       │    │
│  │  🛒 Shop           🧾 Receipts     📊 Merchant        │    │
│  │  ──────────        ────────────    ────────────       │    │
│  │  Product cards     Buyer receipts  Revenue split      │    │
│  │  Cart sidebar      Escrow mgmt     ALEO / USDCx       │    │
│  │  Pay mode select   Loyalty stamps  Sales history      │    │
│  │  ALEO / USDCx      TX activity                        │    │
│  │                                                       │    │
│  │        useVeilWallet hook  (Shield Wallet SDK)        │    │
│  └──────────────┬─────────────────────┬──────────────────┘   │
│                 │  wallet calls        │  REST API            │
└─────────────────┼──────────────────────┼─────────────────────┘
                  │                      │
       ┌──────────▼──────┐    ┌──────────▼──────────────┐
       │  Shield Wallet  │    │  Express Backend API     │
       │  ─────────────  │    │  ─────────────────────   │
       │  ZK proof gen   │    │  /auth    /products      │
       │  TX signing     │    │  /receipts  /merchant    │
       │  Record decrypt │    │  /escrow    /loyalty     │
       └──────────┬──────┘    └──────────┬───────────────┘
                  │                      │
       ┌──────────▼──────────────────────▼──────────────┐
       │                 Aleo Testnet                    │
       │  ──────────────────────────────────────────    │
       │  veilreceipt_v3.aleo      (11 transitions)     │
       │  test_usdcx_stablecoin.aleo                    │
       └─────────────────────┬──────────────────────────┘
                             │  metadata only
                  ┌──────────▼──────────┐
                  │  PostgreSQL (prod)  │
                  │  JSON file  (dev)   │
                  │  commitment hashes  │
                  │  no private data    │
                  └─────────────────────┘
```

---

##  Smart Contract  `veilreceipt_v3.aleo`

The entire protocol lives in one Leo program with **11 transitions**. All on-chain state uses **BHP256 commitment hashes**  raw addresses, amounts, and identities are never stored in any mapping.

### Record Types (Private  encrypted for owner)

| Record | Owner | Key Fields | Purpose |
|--------|-------|-----------|---------|
| `BuyerReceipt` | Buyer | merchant, total, cart_commitment, timestamp, purchase_commitment, token_type | Buyer proof of purchase |
| `MerchantReceipt` | Merchant | purchase_commitment, total, token_type | Merchant proof of sale |
| `EscrowReceipt` | Buyer | merchant, total, purchase_commitment | Escrow lock claim |
| `ReturnClaim` | Buyer | purchase_commitment, refund_amount, return_reason_hash | Refund receipt |
| `LoyaltyStamp` | Buyer | score, total_spent, stamp_commitment | Accumulated loyalty |
| `LoyaltyProof` | Verifier | prover_commitment, threshold, verified | ZK merchant badge |

### On-Chain Mappings (Commitment-keyed, boolean-valued)

```leo
mapping purchase_exists:    field => bool   // replay-attack prevention
mapping escrow_active:      field => bool   // is escrow live?
mapping escrow_timestamps:  field => u64    // block height at lock
mapping return_processed:   field => bool   // double-refund prevention
mapping loyalty_claimed:    field => bool   // per-receipt nullifier
```

No raw merchant addresses, amounts, or buyer identities are stored  only BHP256 commitment hashes.

### All 11 Transitions

| # | Transition | Type | Description |
|---|-----------|------|-------------|
| 1 | `purchase_private_credits` | async | Atomic private ALEO purchase  BuyerReceipt + MerchantReceipt |
| 2 | `purchase_private_usdcx` | async | Atomic private USDCx purchase + compliance record |
| 3 | `purchase_public_credits` | async | Public ALEO purchase (amounts visible) + private receipts |
| 4 | `purchase_escrow_credits` | async | Lock credits on-chain under program address + EscrowReceipt |
| 5 | `complete_escrow` | async | Buyer releases locked funds  private credits to merchant |
| 6 | `refund_escrow` | async | Buyer self-refunds within 500-block window (~8 hours) |
| 7 | `claim_loyalty` | async | Mint first LoyaltyStamp from a receipt (nullifier prevents double-claim) |
| 8 | `merge_loyalty` | async | Accumulate additional stamp into existing LoyaltyStamp |
| 9 | `prove_loyalty_tier` | sync | ZK threshold badge  proves score  N without revealing exact score |
| 10 | `prove_purchase_support` | sync | Generate selective-disclosure support token from receipt |
| 11 | `verify_support_token` | sync | Public verification of a support token |

---

## 🔄 End-to-End Flows

### 🔒 Private Purchase

```
Buyer                    Shield Wallet              Aleo Testnet
──────                   ─────────────              ────────────
Add items to cart
Select "Private" mode
Click Pay
                         Generate ZK proof
                         purchase_private_credits()
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
   Credits locked under veilreceipt_v3.aleo program address
   escrow_active[commitment]     = true
   escrow_timestamps[commitment] = block.height
   → BuyerReceipt + EscrowReceipt issued to buyer
         │
         ├── Within 500 blocks (~8h) ──► refund_escrow()
         │        assert block.height < created_at + 500
         │        assert !return_processed[commitment]
         │        Credits returned → buyer private record
         │        → ReturnClaim issued
         │
         └── Buyer satisfied ──────────► complete_escrow()
                  Credits released → merchant private record
                  → MerchantReceipt issued
```

### ⭐ Loyalty Stamp System

```
Purchase 1  →  claim_loyalty()  →  LoyaltyStamp { score: 1, total_spent: X }
Purchase 2  →  merge_loyalty()  →  LoyaltyStamp { score: 2, total_spent: X+Y }
Purchase N  →  merge_loyalty()  →  LoyaltyStamp { score: N }

         ┌─────────────────────────────────────────────────────┐
         │  prove_loyalty_tier(threshold=3, merchant_addr)     │
         │                                                      │
         │  ZK circuit asserts:  score (5) >= threshold (3)    │
         │  Merchant receives:   LoyaltyProof { verified:true } │
         │  Merchant never sees: your score or purchase history │
         └─────────────────────────────────────────────────────┘
```

---

## 💳 Payment Modes

| Mode | Privacy | Tokens | On-chain State | Best For |
|---|---|---|---|---|
| 🔒 **Private** | Full ZK | ALEO · USDCx | Commitment hash only | Default — maximum privacy |
| 🌐 **Public** | Amount visible | ALEO | Amount + addresses | Auditable / compliance |
| 🔐 **Escrow** | Full ZK | ALEO | Commitment + locked funds | Buyer protection |

---

## 🗃️ Project Structure

```
VeilReceipt/
│
├── 📜 contracts/
│   ├── src/main.leo              ← Full protocol (11 transitions)
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
│       │   ├── escrow.ts         ← Escrow record management
│       │   └── loyalty.ts        ← Loyalty event logging
│       └── services/
│           ├── database.ts       ← PostgreSQL (prod) / JSON (dev)
│           └── aleo.ts           ← TX status + block height RPC
│
└── 🎨 frontend/
    └── src/
        ├── pages/
        │   ├── Home.tsx          ← Landing + wallet connect
        │   ├── Checkout.tsx      ← Shop, cart, payment mode selector
        │   ├── Merchant.tsx      ← Revenue dashboard
        │   └── Receipts.tsx      ← Receipts, escrow, loyalty, TX history
        ├── hooks/
        │   └── useVeilWallet.ts  ← All wallet ops + ZK proof + TX polling
        ├── stores/
        │   ├── cartStore.ts      ← Zustand cart state
        │   ├── txStore.ts        ← TX tracker (shield→at1 ID resolution)
        │   └── userStore.ts      ← Auth + session
        ├── lib/
        │   ├── api.ts            ← Backend REST client
        │   ├── chain.ts          ← Constants (escrow window, program ID)
        │   └── stablecoin.ts     ← USDCx / Credits formatting
        └── components/
            ├── ui/Components.tsx ← Design system (Card, Badge, Button…)
            ├── icons/Icons.tsx   ← ALEO + USDCx token icons + TokenAmount
            └── layout/Header.tsx ← Navigation
```

---

## 🧠 Key Design Decisions

### 🔑 BHP256 Commitments Everywhere

Aleo mappings are **public state**. Instead of storing `merchant → sale_count`, VeilReceipt stores `BHP256(merchant + amount + salt) → bool`. A blockchain observer sees only hashes — the purchase relationship is completely hidden.

### ⚛️ Atomic Dual-Record Issuance

Each purchase creates a `BuyerReceipt` and a `MerchantReceipt` in the **same ZK transaction**. The circuit guarantees both records are issued simultaneously — no race condition, no partial state.

### 🔄 Non-Destructive Record Operations

`claim_loyalty`, `merge_loyalty`, and `prove_loyalty_tier` return a **refreshed copy** of the input record (nonce rotated). The buyer retains their receipt after claiming loyalty and keeps their stamp after proving tier. Domain-separated nullifiers prevent replay attacks.

### 🗄️ Backend Stores Only Metadata

The backend stores commitment hashes and non-sensitive fields (`token_type`, `purchase_type`). **No amounts, no addresses, no identities** are ever sent to the backend. All private data stays exclusively in the user's wallet.

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
VITE_ALEO_PROGRAM_ID=veilreceipt_v3.aleo
VITE_ALEO_RPC_URL=https://api.explorer.provable.com/v1
```

---

## 🗺️ Roadmap

### ✅ Shipped
- [x] Leo smart contract with 11 transitions deployed on Aleo Testnet
- [x] Atomic private ALEO Credits + USDCx purchases (ZK proof, no on-chain identity)
- [x] Public purchase mode for auditable transactions
- [x] Trustless escrow with 500-block (~8 hour) refund window
- [x] Loyalty stamp system — claim, merge, prove tier without revealing score
- [x] Privacy-preserving Send Loyalty Badge — merchants get `verified: true`, never your history
- [x] Purchase support proof tokens + public verification helper
- [x] Express API with PostgreSQL (prod) / JSON (dev) adapter
- [x] React + Shield Wallet frontend with real-time TX tracker
- [x] TX ID resolution: shield temp → real `at1` on-chain ID with RPC auto-confirm
- [x] Merchant revenue analytics split by token type (ALEO / USDCx)
- [x] Brand token icons (ALEO + USDCx) across all UI surfaces

### 🏪 Multi-Merchant Platform
- [ ] Merchant registration flow with on-chain commitment-keyed registry
- [ ] Per-merchant product catalogs with category tagging
- [ ] Merchant reputation score derived from loyalty badge counts

### 🔬 Advanced Privacy Primitives
- [ ] Merkle root cart commitments — prove individual items without revealing the full cart
- [ ] Partial category disclosure — prove purchase category, not specific product
- [ ] Third-party escrow arbitration with ZK evidence submission
- [ ] Recurring subscription receipts with time-locked on-chain commitments
- [ ] Cross-merchant loyalty aggregation into a single global private score

### 🌐 Ecosystem & Integrations
- [ ] Verifier SDK (npm package) so any merchant can check loyalty badges in their own platform
- [ ] Mobile wallet support (iOS / Android)
- [ ] Private voucher records — merchant issues discount tokens to loyalty badge holders
- [ ] Gift card protocol — transferable credit records with merchant redemption
- [ ] Private order tracking — shipping status committed on-chain, recipient address never revealed
- [ ] B2B invoicing — dual-record private invoices with integrated escrow payment rails
- [ ] Decentralized backend — replace Express with Aleo program records + IPFS metadata

### 🚀 Mainnet
- [ ] Deploy `veilreceipt_v3.aleo` to Aleo Mainnet
- [ ] Integrate mainnet USDCx / USDC.aleo stablecoin
- [ ] Frontend + backend switch to mainnet RPC endpoints
- [ ] Production hardening: rate limiting, monitoring, audit

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
