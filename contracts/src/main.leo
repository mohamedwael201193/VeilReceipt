// VeilReceipt v4 — Privacy-first commerce protocol on Aleo
// Atomic private payments (Credits + USDCx), escrow with refund window,
// Cart Merkle proofs for selective item disclosure, and merchant registration.
// All commitments use BHP256::commit_to_field() with scalar randomizers.
// Shield Wallet compatible (no private fee requirements).

import credits.aleo;
import test_usdcx_stablecoin.aleo;

program veilreceipt_v5.aleo {

    // ========== Lifecycle ==========
    @noupgrade
    async constructor() {}

    // ========== Structs for Commitments ==========

    // Data packed for purchase commitment (used with BHP256::commit_to_field)
    struct PurchaseData {
        merchant: field,
        amount: u64,
    }

    // Cart item leaf data (hashed into Merkle tree)
    struct CartItem {
        product_id: field,
        quantity: u64,
        price: u64,
    }

    // Merkle inclusion proof for depth-2 tree (up to 4 cart items)
    struct CartMerkleProof {
        sibling_0: field,
        sibling_1: field,
        path_bit_0: bool,
        path_bit_1: bool,
    }

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

    // Proof that a specific item was in the buyer's cart
    record CartItemProof {
        owner: address,
        item_commitment: field,
        cart_root: field,
        verified: bool,
        nonce_seed: field
    }

    // Merchant's on-chain registration license
    record MerchantLicense {
        owner: address,
        store_commitment: field,
        nonce_seed: field
    }

    // ========== Mappings (commitment-keyed, boolean-valued for privacy) ==========

    mapping purchase_exists: field => bool;
    mapping escrow_active: field => bool;
    mapping escrow_timestamps: field => u64;
    mapping return_processed: field => bool;
    mapping merchant_active: field => bool;

    // ================================================================
    //  1. ATOMIC PRIVATE PURCHASE — ALEO CREDITS
    //     Single transaction: credits transfer_private + dual receipts.
    //     Uses BHP256::commit_to_field() for proper cryptographic commitments.
    // ================================================================

    async transition purchase_private_credits(
        payment: credits.aleo/credits,
        merchant: address,
        total: u64,
        cart_commitment: field,
        timestamp: u64,
        salt: scalar
    ) -> (BuyerReceipt, MerchantReceipt, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(total > 0u64);
        assert(merchant != self.signer);

        // Atomic private credit transfer (no finalize — purely private)
        let (buyer_change, merchant_payment): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment, merchant, total);

        // Proper cryptographic commitment using built-in commit method
        let data: PurchaseData = PurchaseData {
            merchant: merchant as field,
            amount: total,
        };
        let purchase_commitment: field = BHP256::commit_to_field(data, salt);

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
        salt: scalar,
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

        // Proper cryptographic commitment
        let data: PurchaseData = PurchaseData {
            merchant: merchant as field,
            amount: amount_u64,
        };
        let purchase_commitment: field = BHP256::commit_to_field(data, salt);

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
        salt: scalar
    ) -> (BuyerReceipt, MerchantReceipt, Future) {
        assert(total > 0u64);
        assert(merchant != self.signer);

        // Must use transfer_public_as_signer (not transfer_public) because
        // transfer_public uses self.caller which is the program address, not the user.
        let transfer_f: Future = credits.aleo/transfer_public_as_signer(merchant, total);

        let data: PurchaseData = PurchaseData {
            merchant: merchant as field,
            amount: total,
        };
        let purchase_commitment: field = BHP256::commit_to_field(data, salt);

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
        salt: scalar
    ) -> (BuyerReceipt, EscrowReceipt, credits.aleo/credits, Future) {
        assert(total > 0u64);
        assert(merchant != self.signer);

        // Lock credits: private → public (held by program)
        let (change, transfer_f): (credits.aleo/credits, Future) =
            credits.aleo/transfer_private_to_public(payment, self.address, total);

        let data: PurchaseData = PurchaseData {
            merchant: merchant as field,
            amount: total,
        };
        let purchase_commitment: field = BHP256::commit_to_field(data, salt);

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
    //  7. PROVE CART ITEM — Selective item disclosure via Merkle proof
    //     Proves a specific item was in the buyer's cart without
    //     revealing other items. Verifies Merkle path against
    //     receipt.cart_commitment. Proof sent to verifier address.
    // ================================================================

    transition prove_cart_item(
        receipt: BuyerReceipt,
        item: CartItem,
        proof: CartMerkleProof,
        item_salt: scalar,
        verifier: address
    ) -> (BuyerReceipt, CartItemProof) {
        assert_eq(receipt.owner, self.signer);

        // Compute leaf commitment from item data
        let leaf: field = BHP256::commit_to_field(item, item_salt);

        // Verify Merkle path (depth-2 binary tree)
        let h0: field = proof.path_bit_0 ?
            BHP256::hash_to_field(proof.sibling_0 + leaf) :
            BHP256::hash_to_field(leaf + proof.sibling_0);

        let root: field = proof.path_bit_1 ?
            BHP256::hash_to_field(proof.sibling_1 + h0) :
            BHP256::hash_to_field(h0 + proof.sibling_1);

        // Assert reconstructed root matches receipt's cart_commitment
        assert_eq(root, receipt.cart_commitment);

        let proof_nonce: field = BHP256::hash_to_field(
            leaf + verifier as field
        );

        let cart_proof: CartItemProof = CartItemProof {
            owner: verifier,
            item_commitment: leaf,
            cart_root: receipt.cart_commitment,
            verified: true,
            nonce_seed: proof_nonce
        };

        // Preserve receipt
        let refreshed: BuyerReceipt = BuyerReceipt {
            owner: self.signer,
            merchant: receipt.merchant,
            total: receipt.total,
            cart_commitment: receipt.cart_commitment,
            timestamp: receipt.timestamp,
            purchase_commitment: receipt.purchase_commitment,
            token_type: receipt.token_type,
            nonce_seed: BHP256::hash_to_field(receipt.nonce_seed + 5field)
        };

        return (refreshed, cart_proof);
    }

    // ================================================================
    //  8. PURCHASE SUPPORT PROOF — Non-consuming verification token
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
    //  9. VERIFY SUPPORT TOKEN — Public verification helper
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

    // ================================================================
    //  10. REGISTER MERCHANT — On-chain merchant registration
    //      Creates a MerchantLicense record and registers the store
    //      commitment on-chain. Prevents duplicate registrations.
    // ================================================================

    async transition register_merchant(
        store_name_hash: field,
        salt: scalar
    ) -> (MerchantLicense, Future) {
        let store_commitment: field = BHP256::commit_to_field(
            store_name_hash, salt
        );
        let nonce: field = BHP256::hash_to_field(
            store_commitment + self.signer as field
        );
        let license: MerchantLicense = MerchantLicense {
            owner: self.signer,
            store_commitment: store_commitment,
            nonce_seed: nonce
        };
        return (license, finalize_register(store_commitment));
    }

    async function finalize_register(store_commitment: field) {
        let exists: bool = Mapping::get_or_use(merchant_active, store_commitment, false);
        assert(!exists);
        Mapping::set(merchant_active, store_commitment, true);
    }
}
