<div align="center">

#  VeilReceipt

### Privacy-First Commerce Protocol on Aleo

**Atomic private payments  Escrow with refund window  ZK loyalty proofs  Purchase verification tokens**

[![Aleo Testnet](https://img.shields.io/badge/Aleo-Testnet-6366f1?style=flat-square)](https://explorer.provable.com/testnet)
[![Program](https://img.shields.io/badge/Program-veilreceipt__v3.aleo-8b5cf6?style=flat-square)](https://explorer.provable.com/testnet)
[![MIT License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Leo](https://img.shields.io/badge/Leo-latest-a855f7?style=flat-square)](https://leo-lang.org/)

[Smart Contract](contracts/src/main.leo)  [Backend API](backend/)  [Frontend](frontend/)

</div>

---

##  What is VeilReceipt?

VeilReceipt is a **zero-knowledge commerce protocol** built on the [Aleo](https://aleo.org) blockchain. It enables completely private online shopping where:

-  **What you bought, how much you paid, and who you paid** are never revealed on-chain
-  **Receipts are encrypted records** only you (and the merchant) can decrypt and verify
-  **Escrow is trustless**  funds lock on-chain and auto-enforce a return window without any intermediary
-  **Loyalty stamps accumulate privately**  prove customer status to merchants without exposing your purchase history
-  **Support proofs are non-revealing**  resolve disputes without handing merchants your full receipt

Everything runs through a single Leo smart contract (`veilreceipt_v3.aleo`) deployed on Aleo Testnet, with a React frontend and Express API backend.

---

##  Architecture

```

                        USER BROWSER                                  
                                                                       
      
                React Frontend  (Vite + Tailwind)                   
                                                                     
     Shop Page       Receipts Page      Merchant Dashboard          
                            
     Product cards   Buyer receipts     Revenue analytics           
     Cart sidebar    Escrow mgmt        Sales history               
     Pay mode        Loyalty stamps     Token breakdown             
                     TX activity                                    
                                                                     
                useVeilWallet hook (Shield Wallet SDK)              
      
                        wallet calls            REST API              

                                                
                                                
           
           Shield Wallet SDK         Express Backend API      
           (ZK proof gen +           (Node.js + TypeScript)   
            transaction sign)                                 
             /auth   /products         
                                     /receipts  /merchant      
                                     /escrow   /loyalty        
                                     /tx/:id/status            
                
          Aleo Testnet                       
                     
          veilreceipt                PostgreSQL (prod)         
          _v3.aleo                   JSON file (dev)           
                                                               
          test_usdcx_                Stores: receipts,         
          stablecoin.aleo            products, merchants,      
                   loyalty logs              
                                    
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

##  End-to-End Flows

### Private Purchase (ALEO Credits)

```
Buyer                    Shield Wallet             Aleo Testnet             Backend
                                                                            
    Add to cart                                                             
    Select "Private"                                                        
    Click Pay                                                
                               Generate ZK proof                            
                               purchase_private_                            
                               credits transition                           
                                                   
                                                        finalize:           
                                                        purchase_exists     
                                                        [commitment]=true   
                               at1xyz... TX ID                              
                                                   
    BuyerReceipt (encrypted)                                                
    MerchantReceipt                                     storeReceipt() 
                                                 
    TX shown  DONE                                                         
```

### Escrow Purchase + Refund

```
Buyer clicks "Escrow"
  
   purchase_escrow_credits()
       Credits  transfer_private_to_public (locked under veilreceipt_v3.aleo)
       escrow_active[commitment] = true
       escrow_timestamps[commitment] = block.height
       Returns: BuyerReceipt + EscrowReceipt
  
   Within 500 blocks (~8h) 
       refund_escrow()
         assert block.height < created_at + 500
         assert !return_processed[commitment]
         Credits  transfer_public_to_private (back to buyer)
         Returns: ReturnClaim + buyer's credits
  
   OR buyer satisfied 
        complete_escrow()
          Credits  transfer_public_to_private (to merchant)
          Returns: MerchantReceipt + merchant's credits
```

### Loyalty Stamp Flow

```
Purchase receipt
  
  [1st receipt] claim_loyalty()   LoyaltyStamp { score: 1, total_spent: X }
  [2nd receipt] merge_loyalty()   LoyaltyStamp { score: 2, total_spent: X+Y }
  [Nth receipt] merge_loyalty()   LoyaltyStamp { score: N }

Unlock merchant benefit:
  LoyaltyStamp { score: 5 }
    
     prove_loyalty_tier(threshold=3, verifier=merchant_addr)
           Circuit asserts: 5 >= 3  
           Sends to merchant: LoyaltyProof { verified: true, threshold: 3 }
           Merchant never sees: score=5 or purchase history
```

---

##  Payment Modes

| Mode | Privacy | Token | On-chain state | Best for |
|------|---------|-------|----------------|---------|
| **Private** |  Full ZK | ALEO or USDCx | Commitment hash only | Default  maximum privacy |
| **Public** |  Amount visible | ALEO | Amount + addresses | Auditable transactions |
| **Escrow** |  Full ZK | ALEO | Commitment + locked funds | Buyer protection |

---

##  Project Structure

```
VeilReceipt/
 contracts/
    src/main.leo              # Full protocol (11 transitions, 669 lines)
    build/                   # Compiled .aleo bytecode

 backend/
    src/
       index.ts              # Express server + routes
       types.ts              # Shared types + Zod validation schemas
       routes/
          auth.ts           # Nonce-based wallet auth
          products.ts       # Product catalog CRUD
          merchant.ts       # Dashboard + revenue analytics by token
          receipts.ts       # Off-chain receipt metadata storage
          escrow.ts         # Escrow record management
          loyalty.ts        # Loyalty event logging
       services/
           database.ts       # PostgreSQL (prod) / JSON (dev) adapter
           aleo.ts           # Transaction status + block height RPC
    package.json

 frontend/
     src/
        pages/
           Home.tsx          # Landing + wallet connect
           Checkout.tsx      # Shop, cart, payment mode selector
           Merchant.tsx      # Revenue dashboard + analytics
           Receipts.tsx      # Receipts, escrow, loyalty, TX history
        hooks/
           useVeilWallet.ts  # All wallet ops + proof gen + TX polling
        stores/
           cartStore.ts      # Zustand cart state
           txStore.ts        # TX tracker (shieldat1 ID update + RPC confirm)
           userStore.ts      # Auth + session
        lib/
           api.ts            # Backend REST client
           chain.ts          # Constants (escrow window, program ID)
           stablecoin.ts     # USDCx / Credits formatting
        components/
            ui/Components.tsx  # Design system (Card, Badge, Button, Modal)
            icons/Icons.tsx    # Token icons (ALEO + USDCx) + TokenAmount
            layout/Header.tsx  # Navigation
     package.json
```

---

##  Key Design Decisions

### BHP256 Commitments in All Mappings

On Aleo, mappings are public state. Rather than `merchant_address  sale_count`, VeilReceipt stores `BHP256(merchant + amount + salt)  bool`. A blockchain observer sees only commitment hashes  the purchase relationship is hidden.

### Atomic Dual Records

Each purchase atomically creates both a `BuyerReceipt` (encrypted for buyer) and `MerchantReceipt` (encrypted for merchant) in the **same transaction**. The ZK proof guarantees both parties receive their records simultaneously with no race condition.

### Non-Destructive Record Operations

`claim_loyalty`, `merge_loyalty`, and `prove_loyalty_tier` return a **refreshed copy** of the input record (nonce rotated). The buyer keeps their receipt after claiming loyalty and keeps their stamp after generating a proof. Domain-separated nullifiers prevent replay.

### Backend as Metadata Index Only

The backend stores only commitment hashes and non-sensitive metadata (token_type, purchase_type). No amounts, addresses, or identities are sent to or stored by the backend. Private data never leaves the user's wallet.

---

##  Local Development

### Prerequisites

- Node.js 18+
- Leo CLI: `curl -sSf https://install.leo-lang.org | sh`
- [Shield Wallet](https://chromewebstore.google.com) browser extension

### Setup

```bash
git clone https://github.com/mohamedwael201193/VeilReceipt
cd VeilReceipt

# Backend
cd backend && npm install && npm run dev   # :3001

# Frontend (new terminal)
cd frontend && npm install && npm run dev  # :5173
```

---

##  Roadmap

**Already shipped**
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

**Self-service merchant onboarding**
- [ ] Merchant registration flow with on-chain commitment-keyed registry
- [ ] Per-merchant product catalogs with category tagging
- [ ] Merchant reputation score derived from loyalty badge counts

**Advanced privacy primitives**
- [ ] Merkle root cart commitments — prove individual items without revealing the full cart
- [ ] Partial category disclosure — prove purchase category, not specific product
- [ ] Third-party escrow arbitration with ZK evidence submission
- [ ] Recurring subscription receipts with time-locked on-chain commitments
- [ ] Cross-merchant loyalty aggregation into a single global private score

**Ecosystem & integrations**
- [ ] Verifier SDK (npm package) so any merchant can check loyalty badges in their own platform
- [ ] Mobile wallet support (iOS / Android)
- [ ] Private voucher records — merchant issues discount tokens to loyalty badge holders
- [ ] Gift card protocol — transferable credit records with merchant redemption
- [ ] Private order tracking — shipping status committed on-chain, recipient address never revealed
- [ ] B2B invoicing — dual-record private invoices with integrated escrow payment rails
- [ ] Decentralized backend — replace Express with Aleo program records + IPFS metadata

**Mainnet**
- [ ] Deploy `veilreceipt_v3.aleo` to Aleo Mainnet
- [ ] Integrate mainnet USDCx / USDC.aleo stablecoin
- [ ] Frontend + backend switch to mainnet RPC endpoints
- [ ] Production hardening: rate limiting, monitoring, audit

---

##  Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit with descriptive messages
4. Open a Pull Request

---

##  License

MIT

---

<div align="center">

Built on [Aleo](https://aleo.org)  *The future of private commerce*

</div>
