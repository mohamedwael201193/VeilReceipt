<p align="center">
  <img src="https://img.shields.io/badge/Aleo-Testnet%20Beta-7B61FF?style=for-the-badge" alt="Aleo Testnet">
  <img src="https://img.shields.io/badge/Leo-Smart%20Contract-00D9FF?style=for-the-badge" alt="Leo Smart Contract">
  <img src="https://img.shields.io/badge/Privacy-Zero%20Knowledge-10B981?style=for-the-badge" alt="Zero Knowledge">
  <img src="https://img.shields.io/badge/Status-Live%20on%20Testnet-22C55E?style=for-the-badge" alt="Live">
  <img src="https://img.shields.io/badge/Payments-PRIVATE%20Credits-F59E0B?style=for-the-badge" alt="Private Payments">
</p>

<h1 align="center">🛡️ VeilReceipt v2</h1>

<p align="center">
  <strong>Privacy-First Commerce Infrastructure on Aleo with PRIVATE Credits Transfer</strong>
</p>

<p align="center">
  🔒 Private payments • Encrypted receipts • Anonymous returns • Private loyalty rewards • Zero-knowledge proofs
</p>

<p align="center">
  <a href="https://testnet.explorer.provable.com/program/veilreceipt_v2.aleo">View on Explorer</a> •
  <a href="https://veil-receipt.vercel.app">Live Demo</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-architecture--flow">Architecture</a> •
  <a href="#-smart-contract">Smart Contract</a>
</p>

---

## 🔒 MAXIMUM PRIVACY: Private Payments

**VeilReceipt is the ONLY commerce dApp with fully private payments!**

When you pay with private credits on VeilReceipt:
- ❌ **Amount NOT visible** on blockchain
- ❌ **Sender NOT visible** on blockchain  
- ❌ **Receiver NOT visible** on blockchain
- ✅ **Only encrypted ciphertext** appears on-chain

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    🔒 PRIVATE PAYMENT vs 💳 PUBLIC PAYMENT                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  💳 PUBLIC (Other dApps):           🔒 PRIVATE (VeilReceipt):              │
│  ┌─────────────────────────┐        ┌─────────────────────────┐            │
│  │ From: aleo1abc...       │        │ CIPHERTEXT1QVQ...       │            │
│  │ To:   aleo1xyz...       │        │ (encrypted - no data    │            │
│  │ Amount: 3,000,000       │        │  visible to anyone!)    │            │
│  │ ❌ EVERYONE CAN SEE!    │        │ ✅ FULLY HIDDEN         │            │
│  └─────────────────────────┘        └─────────────────────────┘            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Verified Private Transaction on Testnet

**Transaction:** [`at1mqlu6vtz294s92jdnfgkg6hyevsux7hprhlllgzl05n8ex40jgpslyp4s3`](https://testnet.explorer.provable.com/transaction/at1mqlu6vtz294s92jdnfgkg6hyevsux7hprhlllgzl05n8ex40jgpslyp4s3)

| Field | What Explorer Shows |
|-------|---------------------|
| **Function** | `TRANSFER_PRIVATE` |
| **Inputs** | `CIPHERTEXT...` (encrypted!) |
| **Amount** | **HIDDEN** |
| **Addresses** | **HIDDEN** |

---

## 🆕 What's New in V2

VeilReceipt v2 introduces **real Aleo credits transfer** with **THREE privacy levels**:

| Privacy Level | Function | Amount Visible? | Addresses Visible? | Recommended |
|---------------|----------|-----------------|---------------------|-------------|
| 🔒 **Private** | `transfer_private` | ❌ HIDDEN | ❌ HIDDEN | ✅ **YES** |
| 💳 Public | `transfer_public` | ✅ Visible | ✅ Visible | For transparency |
| 🎮 Demo | None | N/A | N/A | Testing only |

### How Private Payments Work

VeilReceipt uses a **two-transaction flow** with `credits.aleo/transfer_private`:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    🔒 PRIVATE PAYMENT FLOW (Maximum Privacy)               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Step 1: Private Credits Transfer (HIDDEN ON-CHAIN)                        │
│   ┌─────────────┐         ┌─────────────────────────┐                      │
│   │  Private    │────────►│   credits.aleo/         │                      │
│   │  Credits    │  ??? cr │   transfer_private      │  Amount HIDDEN!      │
│   │  Record     │         └──────────┬──────────────┘  Addresses HIDDEN!   │
│   └─────────────┘                    │                                      │
│                                      ▼                                      │
│                           ┌─────────────────────────┐                      │
│                           │   Merchant receives     │                      │
│                           │   private credits       │                      │
│                           └─────────────────────────┘                      │
│                                                                             │
│   Step 2: Create Private Receipt                                            │
│   ┌─────────────┐         ┌─────────────────────────┐                      │
│   │    Buyer    │────────►│  veilreceipt_v2.aleo/   │                      │
│   │   Wallet    │         │     purchase            │                      │
│   └─────────────┘         └──────────┬──────────────┘                      │
│                                      │                                      │
│                                      ▼                                      │
│                           ┌─────────────────────────┐                      │
│                           │   Private Receipt       │  Encrypted for       │
│                           │   Record                │  buyer only          │
│                           └─────────────────────────┘                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Why This is Revolutionary:**
- **No other commerce dApp** offers fully private payments
- Payment amount is cryptographically hidden using zero-knowledge proofs
- Only the buyer and merchant know the transaction details
- Perfect for: salary payments, B2B transactions, private purchases

---

## 📋 Project Overview

**VeilReceipt** is a complete privacy-preserving commerce protocol built on Aleo with **real Aleo credits transfer**. It enables consumers to shop, pay with real tokens, receive verifiable receipts, process returns, and earn loyalty rewards—all without exposing their purchase history to anyone, including merchants.

### The Problem

Traditional e-commerce and retail systems expose sensitive consumer data:

| Current Reality | Privacy Risk |
|-----------------|--------------|
| Purchase history stored on merchant servers | Data breaches, profiling, price discrimination |
| Receipts tied to identity | Shopping behavior surveillance |
| Returns require revealing original purchase | Loss of anonymity |
| Loyalty programs track all transactions | Complete purchase graph exposed |

**Every purchase leaves a permanent, traceable record** that can be sold, leaked, or subpoenaed.

### The Solution

VeilReceipt leverages Aleo's zero-knowledge architecture to create a commerce system where:

- **Real credits transfer** from buyer to merchant using `credits.aleo`
- **Receipts are private records** owned by the buyer, encrypted on-chain
- **Returns are processed using nullifiers** without linking to identity
- **Loyalty rewards are claimed anonymously** using ZK proofs
- **Support verification works without revealing details** via proof tokens

> *"Pay with real credits. Prove you bought something without revealing what, when, or where."*

---

## ⚡ Why Aleo

Aleo was the only viable choice for VeilReceipt. Here's why:

### Zero-Knowledge Native

Unlike other blockchains that bolt on privacy features, Aleo is **built from the ground up** for zero-knowledge computation:

| Feature | Aleo | Other Chains |
|---------|------|--------------|
| Private state by default | ✅ Records are encrypted | ❌ All state public |
| On-chain ZK computation | ✅ Native Leo/Aleo VM | ❌ Requires off-chain provers |
| Selective disclosure | ✅ Prove specific claims | ❌ All or nothing |
| UTXO privacy model | ✅ Records consumed on use | ❌ Account balances visible |

### Private vs Public Data in VeilReceipt

| Data | Visibility | Rationale |
|------|------------|-----------|
| Receipt contents | 🔒 **Private** | Only owner can decrypt |
| Cart items | 🔒 **Private** | Hidden in cart commitment hash |
| Purchase timestamp | 🔒 **Private** | Stored in encrypted record |
| Return reason | 🔒 **Private** | Hashed before submission |
| Loyalty tier earned | 🔒 **Private** | Stored in private stamp record |
| Merchant total sales | 🌐 **Public** | Aggregate only, no transaction details |
| Nullifiers (spent) | 🌐 **Public** | Prevents double-spending, unlinkable |

### The Technical Advantage

Aleo's **record model** is fundamental to VeilReceipt:

1. **Records are owned** — Only the owner's view key can decrypt
2. **Records are consumed** — UTXO model prevents replay attacks
3. **Nullifiers are deterministic** — Prevent double-returns without revealing identity
4. **Async finalize** — Public aggregates update without exposing private inputs

---

## 🏗️ Architecture & Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              VEILRECEIPT ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐         ┌─────────────┐         ┌─────────────────────┐  │
│   │   Frontend  │◄───────►│   Backend   │         │   Aleo Blockchain   │  │
│   │  React/Vite │  REST   │  Express.js │         │                     │  │
│   └──────┬──────┘   API   └──────┬──────┘         │  ┌───────────────┐  │  │
│          │                       │                │  │ veilreceipt   │  │  │
│          │                       │                │  │   _v1.aleo    │  │  │
│          │                       ▼                │  │               │  │  │
│          │                ┌────────────┐          │  │ • purchase()  │  │  │
│          │                │   JSON DB  │          │  │ • open_return │  │  │
│          │                │ (Metadata) │          │  │ • claim_loyal │  │  │
│          │                └────────────┘          │  │ • prove_supp  │  │  │
│          │                                        │  └───────────────┘  │  │
│          │         ┌──────────────────────────────┼───────────┘         │  │
│          │         │                              │                     │  │
│          ▼         ▼                              │                     │  │
│   ┌─────────────────────┐                         │  Private Records:   │  │
│   │     Leo Wallet      │◄────────────────────────┼─►  • Receipt       │  │
│   │   (User's Keys)     │    Sign & Execute       │    • ReturnClaim   │  │
│   └─────────────────────┘    Transactions         │    • LoyaltyStamp  │  │
│                                                   │                     │  │
│                                                   │  Public Mappings:   │  │
│                                                   │    • sales_total   │  │
│                                                   │    • nullifiers    │  │
│                                                   └─────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### User Interaction Flow

**Step 1: Connect Wallet**
- User connects Leo Wallet to the application
- Wallet address displayed in UI
- No data transmitted until user initiates action

**Step 2: Browse & Add to Cart**
- Products loaded from backend (public catalog)
- Cart managed locally in browser (Zustand store)
- Cart contents never sent to blockchain

**Step 3: Private Checkout (with Real Payment)**
- **Step 3a:** User selects privacy level (Private recommended!)
- **Step 3b:** For PRIVATE: `credits.aleo/transfer_private` → Amount HIDDEN on-chain!
- **Step 3c:** For PUBLIC: `credits.aleo/transfer_public` → Amount visible on-chain
- **Step 3d:** Contract creates encrypted Receipt record via `veilreceipt_v2.aleo/purchase`
- Only the receipt commitment reaches the chain (encrypted)

**Step 4: View Receipts**
- Receipts decrypted locally using wallet's view key
- Only the record owner can see contents
- Backend stores metadata for UX (optional)

**Step 5: Process Return / Claim Loyalty / Generate Proof**
- User selects receipt and action
- Transaction signed with wallet
- Receipt consumed (UTXO) or proof generated
- Nullifier prevents duplicate operations

> ⚠️ **UTXO Model:** Each receipt can only be used **once** - either for a return OR for loyalty claim, not both. This is fundamental to Aleo's privacy model.

---

## 🏆 Buildathon Privacy Score

VeilReceipt is designed to maximize the **40% Privacy Usage** score:

### Privacy Features Used

| Feature | Implementation | Privacy Level |
|---------|----------------|---------------|
| **Private Payments** | `credits.aleo/transfer_private` | 🔒 Maximum |
| **Encrypted Receipts** | Private records (owner-only access) | 🔒 Maximum |
| **Nullifier System** | Prevents double-spending, unlinkable | 🔒 Maximum |
| **Hashed Return Reasons** | Reason converted to field hash | 🔒 Maximum |
| **Cart Commitment** | Items hashed before submission | 🔒 Maximum |
| **Private Loyalty Stamps** | Private records for loyalty tiers | 🔒 Maximum |

### What's Encrypted On-Chain

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRIVACY LAYERS IN VEILRECEIPT                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Layer 1: Payment (NEW - PRIVATE!)                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  transfer_private → Amount: ENCRYPTED, Sender: ENCRYPTED,            │  │
│  │                     Receiver: ENCRYPTED                               │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Layer 2: Receipt Record                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  owner: ENCRYPTED, merchant: ENCRYPTED, amount: ENCRYPTED,           │  │
│  │  cart_commitment: ENCRYPTED, timestamp: ENCRYPTED                     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Layer 3: Return/Loyalty Records                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  ReturnClaim: reason HASHED before encryption                         │  │
│  │  LoyaltyStamp: tier stored in ENCRYPTED private record               │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Verified Private Transaction Proof

**Transaction:** [`at1mqlu6vtz294s92jdnfgkg6hyevsux7hprhlllgzl05n8ex40jgpslyp4s3`](https://testnet.explorer.provable.com/transaction/at1mqlu6vtz294s92jdnfgkg6hyevsux7hprhlllgzl05n8ex40jgpslyp4s3)

View this on the explorer - you'll see:
- ❌ Amount NOT visible (encrypted ciphertext)
- ❌ Sender address NOT visible (encrypted)
- ❌ Receiver address NOT visible (encrypted)
- ✅ Only zero-knowledge proof is public

---

## 📜 Smart Contract

**Program ID:** `veilreceipt_v2.aleo`  
**Network:** Aleo Testnet Beta  
**Deployed Block:** 14,100,173  
**Transaction:** [`at1d4nj46almxfpplvckk5pc6uecdgqp20g3pg4sfp6ahm9tnuluc8q2xst5h`](https://testnet.explorer.provable.com/transaction/at1d4nj46almxfpplvckk5pc6uecdgqp20g3pg4sfp6ahm9tnuluc8q2xst5h)  
**Leo Version:** 3.4.0

**🆕 V2 Features:**
- ✅ **Real Aleo credits transfer** via `import credits.aleo`
- ✅ `purchase_public` - Transfer with public credits (cross-program call)
- ✅ `purchase_private` - Transfer with private credits (maximum privacy)
- ✅ `purchase` - Demo mode (no payment, for testing)
- ✅ All functions verified working on testnet

### Dependencies

```leo
import credits.aleo;  // Official Aleo credits program
```

Added via: `leo add --network credits.aleo`

### Record Types

The contract defines three private record types, each owned exclusively by the user:

```leo
record Receipt {
    owner: address,           // Buyer's address (record owner)
    merchant: address,        // Seller's address
    total: u64,               // Amount in microcredits
    cart_commitment: field,   // Hash of cart contents
    timestamp: u64,           // Purchase time
    nonce_seed: field         // Unique seed for nullifier generation
}

record ReturnClaim {
    owner: address,              // Original buyer
    original_receipt_hash: field, // Links to original purchase
    return_reason_hash: field,   // Privacy-preserving reason
    timestamp: u64,              // Return processing time
    refund_amount: u64           // Amount to refund
}

record LoyaltyStamp {
    owner: address,        // Stamp holder
    tier: u8,              // 1=Bronze, 2=Silver, 3=Gold, 4=Platinum
    earned_at: u64,        // Timestamp earned
    stamp_id: field        // Unique identifier
}
```

### Contract Functions

#### `purchase_public` — Real Payment with Public Credits (V2)

```leo
async transition purchase_public(
    merchant: address,
    total: u64,
    cart_commitment: field,
    timestamp: u64
) -> (Receipt, Future)
```

**Real Payment:** Calls `credits.aleo/transfer_public` to transfer credits from buyer to merchant. Creates encrypted Receipt record.

> ⚠️ **Note:** Cross-program calls transfer from the *program address*, not the user. Use the two-step frontend flow for user-to-merchant transfers.

#### `purchase_private` — Real Payment with Private Credits (V2)

```leo
async transition purchase_private(
    merchant: address,
    total: u64,
    cart_commitment: field,
    timestamp: u64,
    payment: credits.aleo/credits
) -> (Receipt, credits.aleo/credits, Future)
```

**Maximum Privacy:** Uses private credits record for payment. Returns change as new private credits record.

#### `purchase` — Demo Mode (No Payment)

```leo
async transition purchase(
    merchant: address,
    total: u64,
    cart_commitment: field,
    timestamp: u64
) -> (Receipt, Future)
```

**Privacy:** Creates a Receipt record encrypted for the buyer. The cart commitment hides actual items. Merchant sees only aggregate sales via public mapping. No actual credits transfer - for testing only.

#### `open_return` — Process Anonymous Return

```leo
async transition open_return(
    receipt: Receipt,
    return_reason_hash: field
) -> (ReturnClaim, Future)
```

**Privacy:** Consumes the receipt (UTXO spent). Nullifier prevents double-returns. Return reason is hashed—original text never on-chain.

#### `claim_loyalty` — Claim Anonymous Loyalty Stamp

```leo
async transition claim_loyalty(
    receipt: Receipt,
    tier: u8
) -> (LoyaltyStamp, Future)
```

**Privacy:** Consumes receipt to create tier stamp. No link between stamps and purchase history. Each receipt can only claim once.

#### `prove_purchase_for_support` — Generate ZK Proof Token

```leo
transition prove_purchase_for_support(
    receipt: Receipt,
    product_hash: field,
    salt: field
) -> field
```

**Privacy:** Generates a verifiable proof token **without consuming** the receipt. Can be used to prove purchase to support without revealing full details. Salt prevents correlation.

#### `verify_support_token` — Verify Proof Token

```leo
transition verify_support_token(
    merchant: address,
    total: u64,
    product_hash: field,
    timestamp: u64,
    salt: field,
    claimed_token: field
) -> bool
```

**Privacy:** Public verification. Support can check token validity without accessing the original receipt.

### Public Mappings

```leo
mapping merchant_sales_total: address => u64;  // Aggregate sales per merchant
mapping used_nullifiers: field => bool;        // Prevents double-spending
```

---

## 🖥️ Pages & UI Breakdown

### Home Page (`/`)

**Purpose:** Landing page introducing VeilReceipt's privacy features.

| Element | Description |
|---------|-------------|
| Hero section | Project introduction with gradient styling |
| Feature cards | Private Checkout, Receipts, Returns, Loyalty |
| How it works | 3-step flow explanation |
| CTA buttons | Connect wallet, navigate to checkout/merchant |

**Privacy:** No user data collected. Wallet connection initiated only on user action.

---

### Checkout Page (`/checkout`)

**Purpose:** Browse products and execute private purchases.

| Section | What's Shown | Privacy Level |
|---------|--------------|---------------|
| Product Grid | Available products (name, price, SKU) | Public catalog |
| Cart Sidebar | Selected items, quantities, total | 🔒 Local browser state only |
| Checkout Modal | Transaction status, confirmation | 🔒 TX signed locally |

**User Actions:**
- Add/remove products from cart
- Authenticate as buyer (wallet signature)
- Execute `purchase()` transaction

**On-Chain Data:**
- Merchant address (public)
- Total amount (public)
- Cart commitment hash (contents hidden)
- Timestamp (public)

**What Never Reaches Chain:**
- Individual product names
- Quantities per item
- Shopping behavior

---

### Receipts Page (`/receipts`)

**Purpose:** View owned receipts and perform operations.

| Section | What's Shown | Privacy Level |
|---------|--------------|---------------|
| Receipt List | All Receipt records owned by user | 🔒 Decrypted locally |
| Receipt Details | Merchant, total, timestamp, commitment | 🔒 Only owner sees |
| Action Buttons | Return, Loyalty, Support Proof | 🔒 Operations create records |

**Operations Available:**

| Action | Modal | Result |
|--------|-------|--------|
| **Process Return** | Select reason (hashed) | ReturnClaim record, receipt consumed |
| **Claim Loyalty** | Select tier (1-4) | LoyaltyStamp record, receipt consumed |
| **Support Proof** | Generate token | Proof token returned, receipt preserved |

**Privacy Features:**
- 🔒 **PRIVATE payments** - Amount & addresses encrypted using `transfer_private`
- Receipts decrypted using wallet's view key
- Return reasons hashed before submission
- Each operation protected by nullifier system

**Payment Privacy Selector:**
```
┌──────────────────────────────────────────────────────┐
│  Select Payment Privacy Level:                       │
│                                                      │
│  ◉ 🔒 Private (Recommended)                         │
│      Amount & addresses hidden on-chain              │
│                                                      │
│  ○ 💳 Public                                         │
│      Amount visible on blockchain                    │
│                                                      │
│  ○ 🎮 Demo Mode                                      │
│      Testing only - no real payment                  │
└──────────────────────────────────────────────────────┘
```

---

### Merchant Console (`/merchant`)

**Purpose:** Merchant dashboard for product and sales management.

| Section | What's Shown | Privacy Level |
|---------|--------------|---------------|
| Stats Cards | Total sales, returns, products | 🌐 Aggregates only |
| Product List | Merchant's catalog with CRUD | Public catalog |
| Add Product Form | Name, price, SKU, description | Public |

**User Actions:**
- Authenticate as merchant (wallet signature)
- Create new products
- Delete existing products
- Refresh sales statistics

**Privacy Note:** Merchants see aggregate sales totals from the public mapping but **cannot**:
- See individual buyer addresses
- View what items were purchased
- Link transactions to customers
- Access purchase history

---

## 🔐 Privacy Model

### Data Classification

| Data Type | Storage | Who Can See |
|-----------|---------|-------------|
| Receipt contents | Encrypted on-chain | Owner only (view key) |
| Cart items | Never stored | Buyer only (local) |
| Return reason | Hash only on-chain | Nobody (irreversible hash) |
| Loyalty stamps | Encrypted on-chain | Owner only (view key) |
| Merchant totals | Public mapping | Everyone (aggregate) |
| Nullifiers | Public mapping | Everyone (unlinkable) |

### What Is Never Revealed

| Data | Protection Mechanism |
|------|---------------------|
| Cart contents (items purchased) | Only commitment hash reaches chain |
| Buyer identity to merchant | Records owned by buyer, not merchant |
| Purchase history linkage | Each receipt is independent UTXO |
| Return reason text | BHP256 hash, irreversible |
| Loyalty claim history | Stamps unlinkable to receipts |

### How Aleo Guarantees Privacy

1. **Record Encryption**
   - All records encrypted with owner's view key
   - Network stores only ciphertext
   - Decryption happens locally in wallet

2. **UTXO Consumption**
   - Records spent on use (like physical cash)
   - No account balance history
   - Fresh records created each transaction

3. **Nullifier System**
   ```leo
   let nullifier: field = BHP256::hash_to_field(receipt.nonce_seed);
   assert(!used_nullifiers.get_or_use(nullifier, false));
   used_nullifiers.set(nullifier, true);
   ```
   - One-way hash prevents source identification
   - Public check prevents double-spending
   - Cannot determine which receipt was used

4. **Selective Disclosure**
   - `prove_purchase_for_support` reveals only what's needed
   - Salt prevents correlation attacks
   - Receipt not consumed (multiple proofs possible)

### Threat Model

| Threat Actor | What They Cannot Learn |
|--------------|------------------------|
| Merchants | Individual buyer identities, cart contents, purchase frequency |
| Network Observers | Receipt contents, item details, return reasons |
| Other Users | Anything about other users' records |
| Backend Server | Cryptographic data (only stores metadata for UX) |
| Validators | Plaintext of any encrypted record |

**Security Assumptions:**
- User's private/view keys remain secret
- Leo Wallet properly manages key material
- Aleo's ZK system maintains cryptographic guarantees
- User runs frontend on trusted device

---

## 🛠️ Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tooling |
| Tailwind CSS | 3.x | Styling |
| Framer Motion | 10.x | Animations |
| Zustand | 4.x | State management |
| React Router | 6.x | Routing |
| React Hot Toast | 2.x | Notifications |

### Wallet Integration

| Package | Version | Purpose |
|---------|---------|---------|
| `@provablehq/aleo-wallet-adaptor-react` | 0.3.0-alpha.2 | React hooks & context |
| `@provablehq/aleo-wallet-adaptor-leo` | 0.3.0-alpha.2 | Leo Wallet adapter |
| `@provablehq/aleo-wallet-adaptor-base` | 0.3.0-alpha.2 | Base adapter types |
| `@provablehq/sdk` | 0.9.0 | Aleo SDK utilities |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| Express.js | 4.x | HTTP server |
| TypeScript | 5.x | Type safety |
| JSON file | - | Data persistence |
| JWT | 9.x | Authentication |
| CORS | 2.x | Cross-origin support |

### Smart Contract

| Technology | Purpose |
|------------|---------|
| Leo | Contract programming language |
| Aleo VM | Execution environment |
| BHP256 | Cryptographic hashing |
| ChaCha | Random field generation |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18 or higher
- **Leo Wallet** browser extension — [leo.app](https://leo.app)
- **Testnet credits** — [faucet.aleo.org](https://faucet.aleo.org)

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/veilreceipt.git
cd veilreceipt

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Environment Configuration

**Backend** — Create `backend/.env`:
```env
PORT=3001
JWT_SECRET=your-secret-key-change-in-production
CORS_ORIGIN=http://localhost:5173
ALEO_PROGRAM_ID=veilreceipt_v2.aleo
ALEO_NETWORK=testnet
```

**Frontend** — Create `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:3001
VITE_ALEO_PROGRAM_ID=veilreceipt_v2.aleo
VITE_ALEO_NETWORK=testnet
VITE_ENABLE_REAL_PAYMENTS=false
```

### Running the Application

```bash
# Terminal 1: Start backend server
cd backend
npm run dev
# Server runs on http://localhost:3001

# Terminal 2: Start frontend dev server
cd frontend
npm run dev
# App runs on http://localhost:5173
```

### Using the Application

1. Open [http://localhost:5173](http://localhost:5173)
2. Click "Connect Wallet" and approve in Leo Wallet
3. Navigate to Checkout to browse products
4. Add items to cart and complete purchase
5. View receipts and perform operations

### Contract Deployment (Optional)

The contract is already deployed to testnet. To deploy your own version:

```bash
cd contracts

# Create .env with your private key
echo "PRIVATE_KEY=APrivateKey1..." > .env

# Build the contract
leo build

# Deploy to testnet
leo deploy --network testnet
```

---

## 🔮 Future Improvements

### Completed in V2 ✅

| Feature | Description | Status |
|---------|-------------|--------|
| **Real Payment Integration** | `credits.aleo` for actual credit transfers | ✅ **DONE** |
| Two-Step Payment Flow | Secure user-to-merchant transfer | ✅ **DONE** |
| Public Credits Transfer | `transfer_public` support | ✅ **DONE** |
| Private Credits Transfer | `transfer_private` support | ✅ **DONE** |

### Planned Features

| Feature | Description | Priority |
|---------|-------------|----------|
| Multi-Merchant Checkout | Single transaction spanning multiple sellers | Medium |
| Return Approval Workflow | Merchant review before refund processing | Medium |
| Loyalty Auto-Upgrade | Automatic tier promotion based on stamps | Low |
| Mobile Support | React Native or PWA implementation | Medium |

### Infrastructure Improvements

| Improvement | Benefit |
|-------------|---------|
| PostgreSQL migration | Production-grade data persistence |
| Redis caching | Improved API response times |
| IPFS product images | Decentralized catalog storage |
| WebSocket notifications | Real-time transaction updates |

### Privacy Enhancements

| Enhancement | Description |
|-------------|-------------|
| Batch transactions | Multiple operations in single proof |
| Stealth addresses | Per-transaction addresses for merchants |
| Mixer integration | Break transaction graph links |

---

## 📊 Verified On-Chain Transactions

### Contract Deployments

| Version | Transaction ID | Block | Status |
|---------|---------------|-------|--------|
| V1 Deploy | `at1p7d6e7jcppwpnn756jdapjs40v0adahlaxp3p5x45yp9tumedqgs5crclz` | 14,077,747 | ✅ |
| **V2 Deploy** | `at1d4nj46almxfpplvckk5pc6uecdgqp20g3pg4sfp6ahm9tnuluc8q2xst5h` | 14,100,173 | ✅ |

### V2 Real Payment Transactions

| Operation | Description | Status |
|-----------|-------------|--------|
| **credits.aleo/transfer_public** | 3 credits transferred buyer → merchant | ✅ Working |
| **veilreceipt_v2/purchase** | Receipt created after payment | ✅ Working |
| **open_return** | Process return (consumes receipt) | ✅ Working |
| **claim_loyalty** | Claim loyalty stamp (consumes receipt) | ✅ Working |
| **prove_purchase_for_support** | Generate proof token (preserves receipt) | ✅ Working |

### V1 Legacy Transactions

| Operation | Transaction ID | Block | Status |
|-----------|---------------|-------|--------|
| Purchase | `at1hpxn98atxfl3hvka8af3exzmacx43p83l4x7m57mcc6ccxv83v8sah6a59` | 14,078,787 | ✅ |
| Purchase | `at16mjc9eggt3epxwp74986t740xr69qyswzfp5ua5qgml2zf52nggqhl3g0s` | — | ✅ |
| Purchase | `at19pxcn2pjkkwe6dqp4pgm982gq40yn3s6pml5h025hp2ytf8u6gxq3gss68` | — | ✅ |
| Process Return | `at13jkwn78afl6m9us8sdrwv3pxs6jtxu38973ukxkjwnkqj7g6gs8qqf9eyq` | — | ✅ |

---

## 📁 Project Structure

```
VeilReceipt/
├── contracts/                    # Leo smart contract
│   ├── src/
│   │   └── main.leo             # Contract source (278 lines)
│   ├── program.json             # Program configuration
│   └── build/                   # Compiled artifacts
│
├── backend/                      # Express.js API server
│   ├── src/
│   │   ├── index.ts             # Server entry point
│   │   ├── routes/
│   │   │   ├── auth.ts          # Wallet authentication
│   │   │   ├── products.ts      # Product CRUD operations
│   │   │   ├── merchant.ts      # Merchant statistics
│   │   │   ├── receipts.ts      # Receipt storage
│   │   │   └── events.ts        # Transaction events
│   │   ├── services/
│   │   │   └── database.ts      # JSON file persistence
│   │   ├── middleware/
│   │   │   └── auth.ts          # JWT verification
│   │   └── types.ts             # TypeScript definitions
│   └── data/
│       └── database.json        # Persistent storage
│
├── frontend/                     # React application
│   ├── src/
│   │   ├── App.tsx              # Root component with routing
│   │   ├── main.tsx             # Entry point
│   │   ├── pages/
│   │   │   ├── Home.tsx         # Landing page
│   │   │   ├── Checkout.tsx     # Shopping & purchase
│   │   │   ├── Receipts.tsx     # Receipt management
│   │   │   └── Merchant.tsx     # Merchant dashboard
│   │   ├── hooks/
│   │   │   └── useVeilWallet.ts # Wallet integration hook
│   │   ├── components/
│   │   │   ├── providers/       # Context providers
│   │   │   ├── layout/          # Layout components
│   │   │   ├── ui/              # Reusable UI components
│   │   │   └── icons/           # SVG icon components
│   │   ├── lib/
│   │   │   ├── api.ts           # Backend API client
│   │   │   ├── aleo.ts          # Aleo configuration
│   │   │   ├── types.ts         # TypeScript types
│   │   │   └── utils.ts         # Utility functions
│   │   └── stores/
│   │       ├── cartStore.ts     # Shopping cart state
│   │       └── userStore.ts     # Authentication state
│   └── public/                  # Static assets
│
├── README.md                    # This file
└── SUMMARY.md                   # Development documentation
```

---

## 🏆 Technical Achievements

| Achievement | Description |
|-------------|-------------|
| **Real Credits Transfer** | V2 integrates `credits.aleo` for actual on-chain payments |
| **Two-Step Payment Flow** | Secure user-to-merchant transfer pattern |
| **Async/Future Pattern** | Correctly implements Aleo's two-phase execution for mapping updates |
| **Nullifier System** | Deterministic, unlinkable prevention of double-spending |
| **Cart Commitment Scheme** | Proves purchase integrity without revealing contents |
| **Wallet Record Integration** | Discovered and utilized Leo Wallet's `plaintext` property for contract inputs |
| **Dual-Source Receipt Loading** | Backend fallback when wallet permissions unavailable |
| **Non-Consuming Proofs** | Support verification preserves the original receipt |
| **UTXO Privacy Model** | Each receipt used once (return OR loyalty), preventing correlation |

---

<p align="center">
  <strong>VeilReceipt v2</strong> — Privacy-preserving commerce with real payments
</p>

<p align="center">
  <a href="https://testnet.explorer.provable.com/program/veilreceipt_v2.aleo">Explorer</a> •
  <a href="https://veil-receipt.vercel.app">Live App</a> •
  <a href="https://developer.aleo.org">Aleo Docs</a> •
  <a href="https://leo.app">Leo Wallet</a>
</p>

---

## 🌐 Live Deployment

| Service | URL |
|---------|-----|
| **Frontend** | [https://veil-receipt.vercel.app](https://veil-receipt.vercel.app) |
| **Backend API** | [https://veil-receipt-api.onrender.com](https://veil-receipt-api.onrender.com) |
| **Contract** | [veilreceipt_v2.aleo](https://testnet.explorer.provable.com/program/veilreceipt_v2.aleo) |

---

<p align="center">
  <sub>Built on Aleo Testnet Beta • January 2026 • Real Credits Transfer Enabled</sub>
</p>
