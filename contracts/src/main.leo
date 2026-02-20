// VeilReceipt v3 — Privacy-first commerce protocol on Aleo
// Atomic private payments (Credits + USDCx), escrow with refund window,
// ZK loyalty proofs, and purchase verification tokens.
// All mappings use BHP256 commitments with boolean-only values for maximum privacy.
// Shield Wallet compatible (no private fee requirements).

import credits.aleo;
import test_usdcx_stablecoin.aleo;

program veilreceipt_v3.aleo {

    // ========== Lifecycle ==========
    @noupgrade
    async constructor() {}

    // ========== Record Types ==========

    // Buyer's private purchase receipt (encrypted for buyer)
    record BuyerReceipt {
        owner: address,
        merchant: address,
        total: u64,
        cart_commitment: field,
        timestamp: u64,
        purchase_commitment: field,
        token_type: u8,
        nonce_seed: field
    }

    // Merchant's private sale receipt (encrypted for merchant)
    record MerchantReceipt {
        owner: address,
        purchase_commitment: field,
        total: u64,
        token_type: u8,
        nonce_seed: field
    }

    // Escrow lock receipt (held by buyer for release or refund)
    record EscrowReceipt {
        owner: address,
        merchant: address,
        total: u64,
        cart_commitment: field,
        purchase_commitment: field,
        nonce_seed: field
    }

    // Proof of return/refund after escrow refund
    record ReturnClaim {
        owner: address,
        purchase_commitment: field,
        refund_amount: u64,
        return_reason_hash: field,
        nonce_seed: field
    }

    // Private loyalty stamp with accumulated score
    record LoyaltyStamp {
        owner: address,
        score: u64,
        total_spent: u64,
        stamp_commitment: field,
        nonce_seed: field
    }

    // ZK threshold proof sent to a verifier address
    record LoyaltyProof {
        owner: address,
        prover_commitment: field,
        threshold: u64,
        verified: bool,
        nonce_seed: field
    }

    // ========== Mappings (commitment-keyed, boolean-valued for privacy) ==========

    mapping purchase_exists: field => bool;
    mapping escrow_active: field => bool;
    mapping escrow_timestamps: field => u64;
    mapping return_processed: field => bool;
    mapping loyalty_claimed: field => bool;

    // ================================================================
    //  1. ATOMIC PRIVATE PURCHASE — ALEO CREDITS
    //     Single transaction: credits transfer_private + dual receipts.
    //     Finalize receives ONLY the commitment hash (no raw merchant/amount).
    // ================================================================

    async transition purchase_private_credits(
        payment: credits.aleo/credits,
        merchant: address,
        total: u64,
        cart_commitment: field,
        timestamp: u64,
        salt: field
    ) -> (BuyerReceipt, MerchantReceipt, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(total > 0u64);
        assert(merchant != self.signer);

        // Atomic private credit transfer (no finalize — purely private)
        let (buyer_change, merchant_payment): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment, merchant, total);

        // Compute purchase commitment — only this goes on-chain
        let merchant_hash: field = BHP256::hash_to_field(merchant as field);
        let amount_hash: field = BHP256::hash_to_field(total as field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        let purchase_commitment: field = BHP256::hash_to_field(
            merchant_hash + amount_hash + salt_hash
        );

        let nonce_buyer: field = BHP256::hash_to_field(
            purchase_commitment + self.signer as field
        );
        let nonce_merchant: field = BHP256::hash_to_field(
            purchase_commitment + merchant as field
        );

        let buyer_receipt: BuyerReceipt = BuyerReceipt {
            owner: self.signer,
            merchant: merchant,
            total: total,
            cart_commitment: cart_commitment,
            timestamp: timestamp,
            purchase_commitment: purchase_commitment,
            token_type: 0u8,
            nonce_seed: nonce_buyer
        };

        let merchant_receipt: MerchantReceipt = MerchantReceipt {
            owner: merchant,
            purchase_commitment: purchase_commitment,
            total: total,
            token_type: 0u8,
            nonce_seed: nonce_merchant
        };

        return (
            buyer_receipt,
            merchant_receipt,
            buyer_change,
            merchant_payment,
            finalize_priv_credits(purchase_commitment)
        );
    }

    async function finalize_priv_credits(
        purchase_commitment: field
    ) {
        let exists: bool = Mapping::get_or_use(purchase_exists, purchase_commitment, false);
        assert(!exists);
        Mapping::set(purchase_exists, purchase_commitment, true);
    }

    // ================================================================
    //  2. ATOMIC PRIVATE PURCHASE — USDCx STABLECOIN
    //     Single transaction: USDCx transfer_private + dual receipts.
    //     Requires MerkleProof pair for compliance verification.
    // ================================================================

    async transition purchase_private_usdcx(
        payment: test_usdcx_stablecoin.aleo/Token,
        merchant: address,
        amount: u128,
        cart_commitment: field,
        timestamp: u64,
        salt: field,
        private proofs: [MerkleProof; 2]
    ) -> (
        BuyerReceipt,
        MerchantReceipt,
        test_usdcx_stablecoin.aleo/ComplianceRecord,
        test_usdcx_stablecoin.aleo/Token,
        test_usdcx_stablecoin.aleo/Token,
        Future
    ) {
        let amount_u64: u64 = amount as u64;
        assert(amount_u64 > 0u64);
        assert(merchant != self.signer);

        // Atomic USDCx private transfer
        let (compliance, token_merchant, token_change, transfer_f): (
            test_usdcx_stablecoin.aleo/ComplianceRecord,
            test_usdcx_stablecoin.aleo/Token,
            test_usdcx_stablecoin.aleo/Token,
            Future
        ) = test_usdcx_stablecoin.aleo/transfer_private(merchant, amount, payment, proofs);

        // Compute purchase commitment
        let merchant_hash: field = BHP256::hash_to_field(merchant as field);
        let amount_hash: field = BHP256::hash_to_field(amount as field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        let purchase_commitment: field = BHP256::hash_to_field(
            merchant_hash + amount_hash + salt_hash
        );

        let nonce_buyer: field = BHP256::hash_to_field(
            purchase_commitment + self.signer as field
        );
        let nonce_merchant: field = BHP256::hash_to_field(
            purchase_commitment + merchant as field
        );

        let buyer_receipt: BuyerReceipt = BuyerReceipt {
            owner: self.signer,
            merchant: merchant,
            total: amount_u64,
            cart_commitment: cart_commitment,
            timestamp: timestamp,
            purchase_commitment: purchase_commitment,
            token_type: 1u8,
            nonce_seed: nonce_buyer
        };

        let merchant_receipt: MerchantReceipt = MerchantReceipt {
            owner: merchant,
            purchase_commitment: purchase_commitment,
            total: amount_u64,
            token_type: 1u8,
            nonce_seed: nonce_merchant
        };

        let f: Future = finalize_priv_usdcx(purchase_commitment, transfer_f);
        return (buyer_receipt, merchant_receipt, compliance, token_merchant, token_change, f);
    }

    async function finalize_priv_usdcx(
        purchase_commitment: field,
        transfer_f: Future
    ) {
        transfer_f.await();
        let exists: bool = Mapping::get_or_use(purchase_exists, purchase_commitment, false);
        assert(!exists);
        Mapping::set(purchase_exists, purchase_commitment, true);
    }

    // ================================================================
    //  3. PUBLIC PURCHASE — ALEO CREDITS
    //     Uses transfer_public (amounts visible on-chain).
    //     Still produces private dual receipts.
    // ================================================================

    async transition purchase_public_credits(
        merchant: address,
        total: u64,
        cart_commitment: field,
        timestamp: u64,
        salt: field
    ) -> (BuyerReceipt, MerchantReceipt, Future) {
        assert(total > 0u64);
        assert(merchant != self.signer);

        let transfer_f: Future = credits.aleo/transfer_public(merchant, total);

        let merchant_hash: field = BHP256::hash_to_field(merchant as field);
        let amount_hash: field = BHP256::hash_to_field(total as field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        let purchase_commitment: field = BHP256::hash_to_field(
            merchant_hash + amount_hash + salt_hash
        );

        let nonce_buyer: field = BHP256::hash_to_field(
            purchase_commitment + self.signer as field
        );
        let nonce_merchant: field = BHP256::hash_to_field(
            purchase_commitment + merchant as field
        );

        let buyer_receipt: BuyerReceipt = BuyerReceipt {
            owner: self.signer,
            merchant: merchant,
            total: total,
            cart_commitment: cart_commitment,
            timestamp: timestamp,
            purchase_commitment: purchase_commitment,
            token_type: 0u8,
            nonce_seed: nonce_buyer
        };

        let merchant_receipt: MerchantReceipt = MerchantReceipt {
            owner: merchant,
            purchase_commitment: purchase_commitment,
            total: total,
            token_type: 0u8,
            nonce_seed: nonce_merchant
        };

        let f: Future = finalize_pub_credits(purchase_commitment, transfer_f);
        return (buyer_receipt, merchant_receipt, f);
    }

    async function finalize_pub_credits(
        purchase_commitment: field,
        transfer_f: Future
    ) {
        transfer_f.await();
        let exists: bool = Mapping::get_or_use(purchase_exists, purchase_commitment, false);
        assert(!exists);
        Mapping::set(purchase_exists, purchase_commitment, true);
    }

    // ================================================================
    //  4. ESCROW PURCHASE — ALEO CREDITS
    //     Locks credits on-chain (private → public under program).
    //     Buyer can release to merchant or request refund within window.
    //     Block height recorded for timeout enforcement.
    // ================================================================

    async transition purchase_escrow_credits(
        payment: credits.aleo/credits,
        merchant: address,
        total: u64,
        cart_commitment: field,
        timestamp: u64,
        salt: field
    ) -> (BuyerReceipt, EscrowReceipt, credits.aleo/credits, Future) {
        assert(total > 0u64);
        assert(merchant != self.signer);

        // Lock credits: private → public (held by program)
        let (change, transfer_f): (credits.aleo/credits, Future) =
            credits.aleo/transfer_private_to_public(payment, self.address, total);

        let merchant_hash: field = BHP256::hash_to_field(merchant as field);
        let amount_hash: field = BHP256::hash_to_field(total as field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        let purchase_commitment: field = BHP256::hash_to_field(
            merchant_hash + amount_hash + salt_hash
        );

        let nonce_buyer: field = BHP256::hash_to_field(
            purchase_commitment + self.signer as field
        );
        let nonce_escrow: field = BHP256::hash_to_field(
            purchase_commitment + 1field
        );

        let buyer_receipt: BuyerReceipt = BuyerReceipt {
            owner: self.signer,
            merchant: merchant,
            total: total,
            cart_commitment: cart_commitment,
            timestamp: timestamp,
            purchase_commitment: purchase_commitment,
            token_type: 0u8,
            nonce_seed: nonce_buyer
        };

        let escrow: EscrowReceipt = EscrowReceipt {
            owner: self.signer,
            merchant: merchant,
            total: total,
            cart_commitment: cart_commitment,
            purchase_commitment: purchase_commitment,
            nonce_seed: nonce_escrow
        };

        let f: Future = finalize_escrow_lock(purchase_commitment, transfer_f);
        return (buyer_receipt, escrow, change, f);
    }

    async function finalize_escrow_lock(
        purchase_commitment: field,
        transfer_f: Future
    ) {
        transfer_f.await();
        let exists: bool = Mapping::get_or_use(purchase_exists, purchase_commitment, false);
        assert(!exists);
        Mapping::set(purchase_exists, purchase_commitment, true);
        Mapping::set(escrow_active, purchase_commitment, true);
        Mapping::set(escrow_timestamps, purchase_commitment, block.height as u64);
    }

    // ================================================================
    //  5. COMPLETE ESCROW — Release locked funds to merchant
    //     Buyer approves the purchase. Merchant receives private
    //     credits and a MerchantReceipt. Escrow is cleared.
    // ================================================================

    async transition complete_escrow(
        escrow: EscrowReceipt
    ) -> (MerchantReceipt, credits.aleo/credits, Future) {
        assert_eq(escrow.owner, self.signer);

        // Release: public → private (to merchant)
        let (merchant_credits, transfer_f): (credits.aleo/credits, Future) =
            credits.aleo/transfer_public_to_private(escrow.merchant, escrow.total);

        let nonce: field = BHP256::hash_to_field(
            escrow.purchase_commitment + escrow.merchant as field
        );

        let merchant_receipt: MerchantReceipt = MerchantReceipt {
            owner: escrow.merchant,
            purchase_commitment: escrow.purchase_commitment,
            total: escrow.total,
            token_type: 0u8,
            nonce_seed: nonce
        };

        let f: Future = finalize_complete_escrow(escrow.purchase_commitment, transfer_f);
        return (merchant_receipt, merchant_credits, f);
    }

    async function finalize_complete_escrow(
        purchase_commitment: field,
        transfer_f: Future
    ) {
        let active: bool = Mapping::get_or_use(escrow_active, purchase_commitment, false);
        assert(active);
        transfer_f.await();
        Mapping::set(escrow_active, purchase_commitment, false);
        Mapping::set(escrow_timestamps, purchase_commitment, 0u64);
    }

    // ================================================================
    //  6. REFUND ESCROW — Return within block window
    //     Buyer self-refunds within 500 blocks (~8 hours).
    //     After the window closes, only complete_escrow is available.
    //     Nullifier prevents double-refund. Block height enforced.
    // ================================================================

    async transition refund_escrow(
        escrow: EscrowReceipt,
        return_reason_hash: field
    ) -> (ReturnClaim, credits.aleo/credits, Future) {
        assert_eq(escrow.owner, self.signer);

        // Refund: public → private (back to buyer)
        let (refund_credits, transfer_f): (credits.aleo/credits, Future) =
            credits.aleo/transfer_public_to_private(self.signer, escrow.total);

        let return_nonce: field = BHP256::hash_to_field(
            escrow.purchase_commitment + return_reason_hash
        );

        let claim: ReturnClaim = ReturnClaim {
            owner: self.signer,
            purchase_commitment: escrow.purchase_commitment,
            refund_amount: escrow.total,
            return_reason_hash: return_reason_hash,
            nonce_seed: return_nonce
        };

        let f: Future = finalize_refund_escrow(escrow.purchase_commitment, transfer_f);
        return (claim, refund_credits, f);
    }

    async function finalize_refund_escrow(
        purchase_commitment: field,
        transfer_f: Future
    ) {
        let active: bool = Mapping::get_or_use(escrow_active, purchase_commitment, false);
        assert(active);

        // Enforce return window (500 blocks ≈ 8 hours)
        let created_at: u64 = Mapping::get(escrow_timestamps, purchase_commitment);
        assert(created_at > 0u64);
        assert((block.height as u64) < created_at + 500u64);

        // Prevent double refund
        let returned: bool = Mapping::get_or_use(return_processed, purchase_commitment, false);
        assert(!returned);

        transfer_f.await();

        Mapping::set(escrow_active, purchase_commitment, false);
        Mapping::set(return_processed, purchase_commitment, true);
        Mapping::set(escrow_timestamps, purchase_commitment, 0u64);
    }

    // ================================================================
    //  7. CLAIM LOYALTY — First loyalty stamp from a receipt
    //     Receipt is preserved (returned with new nonce).
    //     Nullifier prevents double-claim on the same receipt.
    // ================================================================

    async transition claim_loyalty(
        receipt: BuyerReceipt
    ) -> (BuyerReceipt, LoyaltyStamp, Future) {
        assert_eq(receipt.owner, self.signer);

        // Domain-separated nullifier for loyalty
        let loyalty_nullifier: field = BHP256::hash_to_field(
            receipt.purchase_commitment + 1field
        );

        // Preserve receipt (recreate with new nonce)
        let refreshed: BuyerReceipt = BuyerReceipt {
            owner: self.signer,
            merchant: receipt.merchant,
            total: receipt.total,
            cart_commitment: receipt.cart_commitment,
            timestamp: receipt.timestamp,
            purchase_commitment: receipt.purchase_commitment,
            token_type: receipt.token_type,
            nonce_seed: BHP256::hash_to_field(receipt.nonce_seed + 1field)
        };

        let stamp_commitment: field = BHP256::hash_to_field(
            self.signer as field + 1field
        );

        let stamp: LoyaltyStamp = LoyaltyStamp {
            owner: self.signer,
            score: 1u64,
            total_spent: receipt.total,
            stamp_commitment: stamp_commitment,
            nonce_seed: BHP256::hash_to_field(loyalty_nullifier + self.signer as field)
        };

        return (refreshed, stamp, finalize_claim_loyalty(loyalty_nullifier));
    }

    async function finalize_claim_loyalty(loyalty_nullifier: field) {
        let already: bool = Mapping::get_or_use(loyalty_claimed, loyalty_nullifier, false);
        assert(!already);
        Mapping::set(loyalty_claimed, loyalty_nullifier, true);
    }

    // ================================================================
    //  8. MERGE LOYALTY — Combine new receipt into existing stamp
    //     Score and total_spent accumulate. Receipt is preserved.
    //     Nullifier prevents double-merge of the same receipt.
    // ================================================================

    async transition merge_loyalty(
        receipt: BuyerReceipt,
        existing: LoyaltyStamp
    ) -> (BuyerReceipt, LoyaltyStamp, Future) {
        assert_eq(receipt.owner, self.signer);
        assert_eq(existing.owner, self.signer);

        let loyalty_nullifier: field = BHP256::hash_to_field(
            receipt.purchase_commitment + 1field
        );

        // Preserve receipt
        let refreshed: BuyerReceipt = BuyerReceipt {
            owner: self.signer,
            merchant: receipt.merchant,
            total: receipt.total,
            cart_commitment: receipt.cart_commitment,
            timestamp: receipt.timestamp,
            purchase_commitment: receipt.purchase_commitment,
            token_type: receipt.token_type,
            nonce_seed: BHP256::hash_to_field(receipt.nonce_seed + 2field)
        };

        let new_score: u64 = existing.score + 1u64;
        let new_total: u64 = existing.total_spent + receipt.total;
        let new_commitment: field = BHP256::hash_to_field(
            self.signer as field + new_score as field
        );

        let merged: LoyaltyStamp = LoyaltyStamp {
            owner: self.signer,
            score: new_score,
            total_spent: new_total,
            stamp_commitment: new_commitment,
            nonce_seed: BHP256::hash_to_field(
                loyalty_nullifier + existing.stamp_commitment
            )
        };

        return (refreshed, merged, finalize_merge_loyalty(loyalty_nullifier));
    }

    async function finalize_merge_loyalty(loyalty_nullifier: field) {
        let already: bool = Mapping::get_or_use(loyalty_claimed, loyalty_nullifier, false);
        assert(!already);
        Mapping::set(loyalty_claimed, loyalty_nullifier, true);
    }

    // ================================================================
    //  9. PROVE LOYALTY TIER — ZK threshold proof
    //     Proves "I purchased ≥ threshold items" without revealing
    //     exact count. Proof record is sent to the verifier address.
    //     Stamp is preserved (returned with new nonce).
    // ================================================================

    transition prove_loyalty_tier(
        stamp: LoyaltyStamp,
        threshold: u64,
        verifier: address
    ) -> (LoyaltyStamp, LoyaltyProof) {
        assert_eq(stamp.owner, self.signer);
        assert(stamp.score >= threshold);

        let prover_commitment: field = BHP256::hash_to_field(
            self.signer as field + stamp.score as field
        );

        let proof_nonce: field = BHP256::hash_to_field(
            prover_commitment + threshold as field + verifier as field
        );

        let proof: LoyaltyProof = LoyaltyProof {
            owner: verifier,
            prover_commitment: prover_commitment,
            threshold: threshold,
            verified: true,
            nonce_seed: proof_nonce
        };

        // Preserve stamp
        let updated_stamp: LoyaltyStamp = LoyaltyStamp {
            owner: self.signer,
            score: stamp.score,
            total_spent: stamp.total_spent,
            stamp_commitment: stamp.stamp_commitment,
            nonce_seed: BHP256::hash_to_field(stamp.nonce_seed + 3field)
        };

        return (updated_stamp, proof);
    }

    // ================================================================
    //  10. PURCHASE SUPPORT PROOF — Non-consuming verification token
    //      Generates a proof token for customer support without
    //      revealing full receipt details. Receipt is preserved.
    // ================================================================

    transition prove_purchase_support(
        receipt: BuyerReceipt,
        product_hash: field,
        salt: field
    ) -> (BuyerReceipt, field) {
        // Preserve receipt
        let refreshed: BuyerReceipt = BuyerReceipt {
            owner: receipt.owner,
            merchant: receipt.merchant,
            total: receipt.total,
            cart_commitment: receipt.cart_commitment,
            timestamp: receipt.timestamp,
            purchase_commitment: receipt.purchase_commitment,
            token_type: receipt.token_type,
            nonce_seed: BHP256::hash_to_field(receipt.nonce_seed + 4field)
        };

        // Generate proof token from commitment + product + salt
        let base_hash: field = BHP256::hash_to_field(
            receipt.purchase_commitment + product_hash
        );
        let proof_token: field = BHP256::hash_to_field(base_hash + salt);

        return (refreshed, proof_token);
    }

    // ================================================================
    //  11. VERIFY SUPPORT TOKEN — Public verification helper
    //      Anyone can verify a claimed proof token matches expected values.
    // ================================================================

    transition verify_support_token(
        purchase_commitment: field,
        product_hash: field,
        salt: field,
        claimed_token: field
    ) -> bool {
        let base_hash: field = BHP256::hash_to_field(
            purchase_commitment + product_hash
        );
        let expected_token: field = BHP256::hash_to_field(base_hash + salt);
        return expected_token == claimed_token;
    }
}
