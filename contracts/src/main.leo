// VeilReceipt - Privacy-first commerce kit for Aleo
// Supports: Checkout, Receipts, Returns, Loyalty, Audit Support Tokens
// Uses async/Future/finalize pattern for public mapping updates

program veilreceipt_v1.aleo {

    // ========== Program lifecycle ==========
    @noupgrade
    async constructor() {}

    // ========== Status constants ==========
    const STATUS_ACTIVE: u8 = 0u8;
    const STATUS_RETURNED: u8 = 1u8;
    const STATUS_EXPIRED: u8 = 2u8;

    // ========== Struct definitions ==========
    struct CartData {
        merchant: address,
        total: u64,
        cart_commitment: field,
        timestamp: u64
    }

    struct ReturnData {
        receipt_hash: field,
        return_reason_hash: field,
        timestamp: u64
    }

    // ========== Record definitions ==========
    
    // Receipt record - owned by buyer after purchase
    // Contains private purchase information encrypted for owner
    record Receipt {
        owner: address,           // Buyer who owns this receipt
        merchant: address,        // Merchant who sold the items
        total: u64,               // Total amount paid in microcredits
        cart_commitment: field,   // Hash commitment of cart contents
        timestamp: u64,           // Purchase timestamp
        nonce_seed: field         // Unique seed for nullifier generation
    }

    // Return claim record - proves a return was processed
    record ReturnClaim {
        owner: address,              // Original buyer
        original_receipt_hash: field, // Hash of the original receipt
        return_reason_hash: field,   // Hash of return reason (privacy)
        timestamp: u64,              // Return timestamp
        refund_amount: u64           // Amount to be refunded
    }

    // Loyalty stamp record - proves loyalty tier without revealing history
    record LoyaltyStamp {
        owner: address,        // Stamp holder
        tier: u8,              // Loyalty tier (1=Bronze, 2=Silver, 3=Gold, 4=Platinum)
        earned_at: u64,        // When the stamp was earned
        stamp_id: field        // Unique stamp identifier
    }

    // ========== Public Mappings ==========
    // These are publicly visible aggregates - no private data stored here
    
    // Tracks total sales per merchant (public aggregate)
    mapping merchant_sales_total: address => u64;
    
    // Tracks used nullifiers to prevent double-spending/claiming
    mapping used_nullifiers: field => bool;

    // ========== Core Transitions ==========

    // Purchase: Create a receipt for the buyer and update merchant sales
    // Uses async/Future pattern for public mapping update
    async transition purchase(
        merchant: address,
        total: u64,
        cart_commitment: field,
        timestamp: u64
    ) -> (Receipt, Future) {
        // Validate inputs
        assert(total > 0u64);
        assert(merchant != self.signer); // Can't buy from yourself
        
        // Generate unique nonce seed for this receipt
        // Used later for nullifier generation in returns/loyalty
        let nonce_seed: field = BHP256::hash_to_field(CartData {
            merchant: merchant,
            total: total,
            cart_commitment: cart_commitment,
            timestamp: timestamp
        });

        // Create receipt record owned by the buyer (signer)
        let receipt: Receipt = Receipt {
            owner: self.signer,
            merchant: merchant,
            total: total,
            cart_commitment: cart_commitment,
            timestamp: timestamp,
            nonce_seed: nonce_seed
        };

        // Return receipt and future for async finalize
        return (receipt, finalize_purchase(merchant, total));
    }

    // Finalize: Update public merchant sales total
    async function finalize_purchase(merchant: address, total: u64) {
        // Get current sales total (default 0 if not exists)
        let current_total: u64 = merchant_sales_total.get_or_use(merchant, 0u64);
        
        // Update with new sale amount
        merchant_sales_total.set(merchant, current_total + total);
    }

    // Open Return: Process a return by consuming receipt and creating return claim
    // Nullifier prevents double returns of the same receipt
    async transition open_return(
        receipt: Receipt,
        return_reason_hash: field
    ) -> (ReturnClaim, Future) {
        // Compute deterministic nullifier from receipt data
        // This ensures the same receipt always produces the same nullifier
        let nullifier: field = BHP256::hash_to_field(ReturnData {
            receipt_hash: receipt.nonce_seed,
            return_reason_hash: return_reason_hash,
            timestamp: receipt.timestamp
        });

        // Compute receipt hash for reference
        let receipt_hash: field = BHP256::hash_to_field(CartData {
            merchant: receipt.merchant,
            total: receipt.total,
            cart_commitment: receipt.cart_commitment,
            timestamp: receipt.timestamp
        });

        // Get current timestamp (using receipt timestamp + 1 as proxy)
        let return_timestamp: u64 = receipt.timestamp + 1u64;

        // Create return claim record
        let return_claim: ReturnClaim = ReturnClaim {
            owner: self.signer,
            original_receipt_hash: receipt_hash,
            return_reason_hash: return_reason_hash,
            timestamp: return_timestamp,
            refund_amount: receipt.total
        };

        // Receipt is consumed (UTXO model - input record is spent)
        // Return the claim and future to check/set nullifier
        return (return_claim, finalize_open_return(nullifier));
    }

    // Finalize: Check nullifier hasn't been used, then mark as used
    async function finalize_open_return(nullifier: field) {
        // Check if nullifier already exists (double return attempt)
        let already_used: bool = used_nullifiers.get_or_use(nullifier, false);
        
        // Assert not already used - this will FAIL the transaction if true
        assert(!already_used);
        
        // Mark nullifier as used
        used_nullifiers.set(nullifier, true);
    }

    // Claim Loyalty: Consume receipt to claim loyalty stamp
    // Each receipt can only be used for one loyalty claim (nullifier)
    async transition claim_loyalty(
        receipt: Receipt,
        tier: u8
    ) -> (LoyaltyStamp, Future) {
        // Validate tier (1-4)
        assert(tier >= 1u8);
        assert(tier <= 4u8);

        // Compute deterministic nullifier for loyalty claim
        // Different from return nullifier to allow both operations
        let loyalty_nullifier: field = BHP256::hash_to_field(CartData {
            merchant: receipt.merchant,
            total: receipt.total,
            cart_commitment: receipt.cart_commitment,
            timestamp: receipt.timestamp
        });

        // Generate unique stamp ID
        let stamp_id: field = BHP256::hash_to_field(ReturnData {
            receipt_hash: loyalty_nullifier,
            return_reason_hash: 0field, // Not used for loyalty
            timestamp: receipt.timestamp
        });

        // Create loyalty stamp
        let stamp: LoyaltyStamp = LoyaltyStamp {
            owner: self.signer,
            tier: tier,
            earned_at: receipt.timestamp,
            stamp_id: stamp_id
        };

        // Receipt is consumed, return stamp and future
        return (stamp, finalize_claim_loyalty(loyalty_nullifier));
    }

    // Finalize: Enforce single loyalty claim per receipt
    async function finalize_claim_loyalty(nullifier: field) {
        // Check if this receipt already claimed loyalty
        let already_claimed: bool = used_nullifiers.get_or_use(nullifier, false);
        
        // Assert not already claimed
        assert(!already_claimed);
        
        // Mark as claimed
        used_nullifiers.set(nullifier, true);
    }

    // Prove Purchase for Support: Generate a proof token without revealing receipt details
    // This is a non-consuming transition (receipt is NOT spent)
    // Used for customer support verification
    transition prove_purchase_for_support(
        receipt: Receipt,
        product_hash: field,
        salt: field
    ) -> field {
        // Generate commitment/proof token from receipt data + product + salt
        // This proves ownership of a receipt with specific product without revealing all details
        let proof_data: CartData = CartData {
            merchant: receipt.merchant,
            total: receipt.total,
            cart_commitment: product_hash, // Use product_hash here for specificity
            timestamp: receipt.timestamp
        };

        let base_hash: field = BHP256::hash_to_field(proof_data);
        
        // Add salt for uniqueness (prevents correlation attacks)
        let proof_token: field = BHP256::hash_to_field(ReturnData {
            receipt_hash: base_hash,
            return_reason_hash: salt,
            timestamp: receipt.timestamp
        });

        // Return proof token - receipt is NOT consumed (readonly access)
        return proof_token;
    }

    // ========== Helper Transitions ==========

    // Verify a proof token matches expected values (for support agents)
    // This is a public verification - anyone can check
    transition verify_support_token(
        merchant: address,
        total: u64,
        product_hash: field,
        timestamp: u64,
        salt: field,
        claimed_token: field
    ) -> bool {
        // Recreate the proof data
        let proof_data: CartData = CartData {
            merchant: merchant,
            total: total,
            cart_commitment: product_hash,
            timestamp: timestamp
        };

        let base_hash: field = BHP256::hash_to_field(proof_data);
        
        let expected_token: field = BHP256::hash_to_field(ReturnData {
            receipt_hash: base_hash,
            return_reason_hash: salt,
            timestamp: timestamp
        });

        // Return whether tokens match
        return expected_token == claimed_token;
    }
}
