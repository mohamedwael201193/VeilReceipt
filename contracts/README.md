# VeilReceipt Smart Contract

## Overview
Privacy-first commerce smart contract on Aleo supporting:
- **Purchase**: Create private receipts with public sales aggregates
- **Returns**: Process returns with nullifier protection against double returns
- **Loyalty**: Claim loyalty stamps without revealing transaction history
- **Support Tokens**: Generate proof tokens for customer support verification

## Contract Design

### Records (Private, Owner-Encrypted)
| Record | Purpose | Key Fields |
|--------|---------|------------|
| `Receipt` | Proof of purchase | owner, merchant, total, cart_commitment, timestamp, nonce_seed |
| `ReturnClaim` | Proof of return processed | owner, original_receipt_hash, return_reason_hash, refund_amount |
| `LoyaltyStamp` | Loyalty tier proof | owner, tier, earned_at, stamp_id |

### Mappings (Public)
| Mapping | Purpose |
|---------|---------|
| `merchant_sales_total` | Public aggregate of merchant sales |
| `used_nullifiers` | Prevents double returns/claims |

### Transitions
| Function | Type | Description |
|----------|------|-------------|
| `purchase` | async | Create receipt, update merchant sales |
| `open_return` | async | Consume receipt, create return claim, set nullifier |
| `claim_loyalty` | async | Consume receipt, create stamp, set nullifier |
| `prove_purchase_for_support` | sync | Generate proof token (non-consuming) |
| `verify_support_token` | sync | Verify a proof token |

## How to Deploy in Leo Playground

1. Go to https://play.leo-lang.org/
2. Create a new project named `veilreceipt_v1`
3. Copy the contents of `src/main.leo` into the editor
4. Click "Build" to compile
5. Click "Deploy" to deploy to testnet
6. Copy the deployed program ID (will be `veilreceipt_v1.aleo`)

## Function Input Formats (for Wallet Adapters)

### purchase
```
Inputs (ordered):
1. merchant: address    - e.g., "aleo1xyz..."
2. total: u64           - e.g., "1000000u64" (1 credit = 1,000,000 microcredits)
3. cart_commitment: field - e.g., "123456789field"
4. timestamp: u64       - e.g., "1706540000u64" (Unix timestamp)

Outputs:
- Receipt record (owned by caller)
- Future (executes finalize_purchase)
```

### open_return
```
Inputs (ordered):
1. receipt: Receipt     - Receipt record plaintext from wallet
2. return_reason_hash: field - e.g., "987654321field"

Outputs:
- ReturnClaim record
- Future (checks/sets nullifier)
```

### claim_loyalty
```
Inputs (ordered):
1. receipt: Receipt     - Receipt record plaintext from wallet
2. tier: u8             - e.g., "2u8" (1=Bronze, 2=Silver, 3=Gold, 4=Platinum)

Outputs:
- LoyaltyStamp record
- Future (checks/sets nullifier)
```

### prove_purchase_for_support
```
Inputs (ordered):
1. receipt: Receipt     - Receipt record (NOT consumed)
2. product_hash: field  - Hash of specific product to prove
3. salt: field          - Random salt for uniqueness

Outputs:
- field (proof token)
```

### verify_support_token
```
Inputs (ordered):
1. merchant: address
2. total: u64
3. product_hash: field
4. timestamp: u64
5. salt: field
6. claimed_token: field

Outputs:
- bool (true if token is valid)
```

## Privacy Model

1. **Records are private by default**: All record fields (except owner for routing) are encrypted with the owner's view key
2. **Mappings are public**: `merchant_sales_total` and `used_nullifiers` are visible to everyone
3. **Nullifiers prevent linkability**: Using a deterministic hash that doesn't reveal the original receipt
4. **Support tokens are selective disclosure**: Prove specific facts without revealing full receipt

## Testing Locally

```bash
# Build
leo build

# Run purchase test
leo run purchase aleo1merchant... 1000000u64 123field 1706540000u64

# Run return test (need receipt record from purchase)
leo run open_return "{owner: aleo1..., ...}" 999field

# Run loyalty test
leo run claim_loyalty "{owner: aleo1..., ...}" 2u8
```
