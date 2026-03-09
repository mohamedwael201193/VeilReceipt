// useVeilWallet — Core wallet hook for VeilReceipt v4
// Full Shield Wallet integration: decrypt records via wallet.decrypt(),
// proper record plaintext extraction, private-first payment architecture.
// Uses BHP256::commit_to_field() with scalar salts for commitments.

import { useCallback, useState, useEffect, useRef } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import type { TransactionOptions } from '@provablehq/aleo-types';
import toast from 'react-hot-toast';
import { ALEO_CONFIG, TRANSITIONS, DEFAULT_FEE, type PaymentPrivacy, type TokenType } from '@/lib/chain';
import { buildUsdcxMerkleProofs } from '@/lib/stablecoin';
import { getCurrentTimestamp, sleep, toAleoU64, toAleoField, generateAleoScalar } from '@/lib/utils';
import { getCurrentBlockHeight } from '@/lib/aleoNetwork';
import { buildCartMerkleTree, skuToField, storeMerkleTree, loadMerkleTree, formatMerkleProofInput, formatCartItemInput, type MerkleCartItem } from '@/lib/merkle';
import { useUserStore } from '@/stores/userStore';
import { usePendingTxStore } from '@/stores/txStore';
import { api } from '@/lib/api';
import type { BuyerReceiptRecord, MerchantReceiptRecord, EscrowReceiptRecord, MerchantLicenseRecord } from '@/lib/types';

// Program IDs
const PROGRAM_ID = ALEO_CONFIG.programId;
const CREDITS_PROGRAM = ALEO_CONFIG.creditsProgramId;
const USDCX_PROGRAM = ALEO_CONFIG.usdcxProgramId;
const RPC = ALEO_CONFIG.rpcUrl;

/**
 * Parse Leo record plaintext string into key-value pairs.
 * Handles format: { owner: aleo1xxx.private, microcredits: 123456u64.private, _nonce: ... }
 */
function parseRecordPlaintext(plaintext: string): Record<string, string> {
  const result: Record<string, string> = {};
  const inner = plaintext.replace(/^\s*\{/, '').replace(/\}\s*$/, '');
  const lines = inner.split(',');
  for (const line of lines) {
    const match = line.trim().match(/^(\w+)\s*:\s*(.+)$/);
    if (match) {
      result[match[1].trim()] = match[2].trim().replace(/\.private$|\.public$/, '');
    }
  }
  return result;
}

/**
 * Strip Aleo type suffixes (u64, u128, field, etc.) from values
 */
function stripSuffix(val: string): string {
  return val.replace(/(u8|u16|u32|u64|u128|i8|i16|i32|i64|i128|field|scalar|group|boolean)$/, '');
}

/**
 * Parse microcredits from various record formats.
 * Handles: plaintext string, structured data object, direct properties.
 */
function parseMicrocredits(record: unknown): number {
  if (typeof record === 'string') {
    const match = record.match(/microcredits\s*:\s*([\d_]+)u64/);
    return match ? parseInt(match[1].replace(/_/g, ''), 10) : 0;
  }
  if (!record || typeof record !== 'object') return 0;
  const rec = record as Record<string, unknown>;
  const data = rec.data as Record<string, unknown> | undefined;
  if (data?.microcredits) {
    return parseInt(String(data.microcredits).replace(/u64|\.private/g, ''), 10) || 0;
  }
  if (rec.microcredits !== undefined) {
    if (typeof rec.microcredits === 'number') return rec.microcredits;
    return parseInt(String(rec.microcredits).replace(/u64|\.private/g, ''), 10) || 0;
  }
  const pt = (rec.plaintext || rec._plaintext) as string | undefined;
  if (pt && typeof pt === 'string') {
    const match = pt.match(/microcredits\s*:\s*([\d_]+)u64/);
    if (match) return parseInt(match[1].replace(/_/g, ''), 10);
  }
  return 0;
}

/**
 * Parse USDCx token amount from various record formats
 */
function parseTokenAmount(record: unknown): bigint {
  if (typeof record === 'string') {
    const match = record.match(/amount\s*:\s*([\d_]+)u128/);
    return match ? BigInt(match[1].replace(/_/g, '')) : BigInt(0);
  }
  if (!record || typeof record !== 'object') return BigInt(0);
  const rec = record as Record<string, unknown>;
  const data = rec.data as Record<string, string> | undefined;
  if (data?.amount) {
    return BigInt(String(data.amount).replace(/u128|\.private/g, ''));
  }
  if (rec.amount !== undefined) {
    return BigInt(String(rec.amount).replace(/u128|\.private/g, ''));
  }
  const pt = (rec.plaintext || rec._plaintext) as string | undefined;
  if (pt && typeof pt === 'string') {
    const match = pt.match(/amount\s*:\s*([\d_]+)u128/);
    if (match) return BigInt(match[1].replace(/_/g, ''));
  }
  return BigInt(0);
}

export function useVeilWallet() {
  const {
    address,
    wallet,
    connected,
    connecting,
    disconnect: walletDisconnect,
    requestRecords,
    executeTransaction: walletExecute,
    transactionStatus,
    signMessage,
    decrypt,
  } = useWallet();

  const userStore = useUserStore();
  const pendingTxStore = usePendingTxStore();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'buyer' | 'merchant'>('buyer');
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync address to user store
  useEffect(() => {
    if (address) {
      userStore.setAddress(address);
    }
  }, [address]);

  // Disconnect handler
  const disconnect = useCallback(async () => {
    try {
      await walletDisconnect();
      userStore.logout();
    } catch (e) {
      console.error('Disconnect error:', e);
    }
  }, [walletDisconnect]);

  // ============================
  // AUTH — Nonce-based wallet authentication
  // ============================
  const authenticate = useCallback(async (asRole: 'buyer' | 'merchant' = 'buyer') => {
    if (!address || !wallet) throw new Error('Wallet not connected');
    try {
      const { nonce, message } = await api.getNonce(address);
      let signature: string;
      if (signMessage) {
        try {
          const sig = await signMessage(message);
          signature = sig ? btoa(String.fromCharCode(...new Uint8Array(sig))) : `sig_${address}_${nonce}`;
        } catch {
          signature = `sig_${address}_${nonce}`;
        }
      } else {
        signature = `sig_${address}_${nonce}`;
      }
      const result = await api.verifySignature(address, nonce, signature, asRole);
      userStore.setToken(result.token);
      api.setToken(result.token);
      setRole(asRole);
      if (asRole === 'merchant') {
        userStore.setMerchant(address);
      }
      return result;
    } catch (e: any) {
      console.error('Auth error:', e);
      throw e;
    }
  }, [address, wallet, signMessage]);

  // ============================
  // RECORD DECRYPTION — Shield Wallet Native
  // ============================

  /**
   * Fetch records from wallet and return raw record objects.
   * Shield wallet returns metadata objects with recordCiphertext field.
   * We pass includePlaintext=true to request decrypted data when available.
   */
  const fetchRawRecords = useCallback(async (programId: string): Promise<any[]> => {
    if (!connected || !address) return [];

    try {
      if (requestRecords) {
        const records = await requestRecords(programId, true);
        console.log(`[VeilWallet] requestRecords(${programId}):`, records?.length ?? 0, 'records');
        if (Array.isArray(records) && records.length > 0) {
          return records;
        }
      }
    } catch (e) {
      console.warn(`[VeilWallet] requestRecords(${programId}) failed:`, e);
    }

    return [];
  }, [connected, address, requestRecords]);

  /**
   * Decrypt a single record's ciphertext via wallet.decrypt().
   * Shield wallet returns records with recordCiphertext field (starts with 'record1').
   * wallet.decrypt() converts this to Leo plaintext like:
   * "{ owner: aleo1xxx.private, microcredits: 123456u64.private, _nonce: ... }"
   */
  const decryptRecord = useCallback(async (record: any): Promise<string | null> => {
    if (!record || typeof record !== 'object') return null;

    // Priority 1: plaintext already provided by wallet
    if (typeof record.plaintext === 'string' && record.plaintext.includes('{')) {
      return record.plaintext;
    }

    // Priority 2: Decrypt recordCiphertext via wallet.decrypt()
    if (typeof record.recordCiphertext === 'string' && record.recordCiphertext.startsWith('record1')) {
      if (decrypt) {
        try {
          const plaintext = await decrypt(record.recordCiphertext);
          if (plaintext && typeof plaintext === 'string') {
            console.log('[VeilWallet] Decrypted record:', plaintext.slice(0, 200));
            return plaintext;
          }
        } catch (err) {
          console.warn('[VeilWallet] wallet.decrypt() failed:', err);
        }
      }
    }

    // Priority 3: ciphertext field (some wallets use this name)
    if (typeof record.ciphertext === 'string' && record.ciphertext.startsWith('record1')) {
      if (decrypt) {
        try {
          const plaintext = await decrypt(record.ciphertext);
          if (plaintext && typeof plaintext === 'string') return plaintext;
        } catch {
          // ignore
        }
      }
    }

    return null;
  }, [decrypt]);

  /**
   * Find a credits.aleo record with sufficient microcredits balance.
   * Decrypts each record via wallet.decrypt() and parses the plaintext.
   * Returns the plaintext string ready to pass as transaction input.
   */
  const findCreditsRecord = useCallback(async (minAmount: number): Promise<string | null> => {
    const records = await fetchRawRecords(CREDITS_PROGRAM);
    console.log(`[findCreditsRecord] Found ${records.length} raw records, need ${minAmount} microcredits`);

    let fallbackRecord: string | null = null;
    let anyKnownBalance = false;

    for (const record of records) {
      if (!record || typeof record !== 'object') continue;
      if (record.spent === true) continue;

      let mc = parseMicrocredits(record);
      let plaintext: string | null = null;

      // Try plaintext if already available
      if (typeof record.plaintext === 'string' && record.plaintext.includes('{')) {
        plaintext = record.plaintext;
        if (mc === 0) mc = parseMicrocredits(plaintext);
      }

      // Decrypt ciphertext via wallet.decrypt()
      if (!plaintext) {
        plaintext = await decryptRecord(record);
        if (plaintext && mc === 0) {
          mc = parseMicrocredits(plaintext);
          console.log(`[findCreditsRecord] Decrypted → microcredits: ${mc}`);
        }
      }

      if (!plaintext) continue;

      if (mc > 0) anyKnownBalance = true;
      if (!fallbackRecord) fallbackRecord = plaintext;

      if (mc >= minAmount) {
        console.log(`[findCreditsRecord] ✓ Found record with ${mc} microcredits (need ${minAmount})`);
        return plaintext;
      }
    }

    // If no balance could be parsed but we have records, use first as fallback
    if (fallbackRecord && !anyKnownBalance) {
      console.warn('[findCreditsRecord] No balance could be parsed — using fallback record');
      return fallbackRecord;
    }

    if (anyKnownBalance) {
      console.warn('[findCreditsRecord] All records have insufficient balance');
    }
    return null;
  }, [fetchRawRecords, decryptRecord]);

  /**
   * Find a USDCx Token record with sufficient balance.
   * Token records have { owner: address, amount: u128 }.
   * Returns plaintext string.
   */
  const findTokenRecord = useCallback(async (minAmount: bigint): Promise<string | null> => {
    const records = await fetchRawRecords(USDCX_PROGRAM);
    console.log(`[findTokenRecord] Found ${records.length} USDCx records, need ${minAmount}`);

    for (const record of records) {
      if (!record || typeof record !== 'object') continue;
      if (record.spent === true) continue;

      let plaintext: string | null = null;
      let amount = BigInt(0);

      if (typeof record.plaintext === 'string' && record.plaintext.includes('{')) {
        plaintext = record.plaintext;
      }

      if (!plaintext) {
        plaintext = await decryptRecord(record);
      }

      if (!plaintext) continue;

      const amountMatch = plaintext.match(/amount\s*:\s*([\d_]+)u128/);
      if (amountMatch) {
        amount = BigInt(amountMatch[1].replace(/_/g, ''));
      }

      if (amount === BigInt(0)) {
        amount = parseTokenAmount(record);
      }

      if (amount >= minAmount) {
        console.log(`[findTokenRecord] ✓ Found USDCx record with ${amount} (need ${minAmount})`);
        return plaintext;
      }
    }

    console.warn('[findTokenRecord] No USDCx record with sufficient balance');
    return null;
  }, [fetchRawRecords, decryptRecord]);

  /**
   * Find a record from the main program by metadata criteria.
   * Used for BuyerReceipt, EscrowReceipt, CartItemProof etc.
   */
  const findRecord = useCallback(async (
    criteria: { functionName?: string; programName?: string },
    programId?: string,
    contentFilter?: (plaintext: string) => boolean,
  ): Promise<string | null> => {
    const pid = programId || PROGRAM_ID;
    const records = await fetchRawRecords(pid);
    console.log(`[findRecord] Found ${records.length} records for ${pid}`);

    const reversed = [...records].reverse();

    for (const record of reversed) {
      if (!record || typeof record !== 'object') continue;
      if (record.spent === true) continue;
      if (criteria.functionName && record.functionName !== criteria.functionName) continue;
      if (criteria.programName && record.programName !== criteria.programName) continue;

      let plaintext: string | null = null;

      if (typeof record.plaintext === 'string' && record.plaintext.includes('{')) {
        plaintext = record.plaintext;
      }

      if (!plaintext) {
        plaintext = await decryptRecord(record);
      }

      if (!plaintext) continue;
      if (contentFilter && !contentFilter(plaintext)) continue;

      console.log('[findRecord] ✓ Matched record:', plaintext.slice(0, 300));
      return plaintext;
    }

    console.warn('[findRecord] No matching record found');
    return null;
  }, [fetchRawRecords, decryptRecord]);

  /**
   * Find all matching records (for listing buyer receipts, etc.)
   */
  const findAllRecords = useCallback(async (
    criteria: { functionName?: string; programName?: string },
    programId?: string,
    contentFilter?: (plaintext: string) => boolean,
  ): Promise<string[]> => {
    const pid = programId || PROGRAM_ID;
    const records = await fetchRawRecords(pid);
    const reversed = [...records].reverse();
    const results: string[] = [];

    for (const record of reversed) {
      if (!record || typeof record !== 'object') continue;
      if (record.spent === true) continue;
      if (criteria.functionName && record.functionName !== criteria.functionName) continue;
      if (criteria.programName && record.programName !== criteria.programName) continue;

      let plaintext: string | null = null;
      if (typeof record.plaintext === 'string' && record.plaintext.includes('{')) {
        plaintext = record.plaintext;
      }
      if (!plaintext) {
        plaintext = await decryptRecord(record);
      }
      if (!plaintext) continue;
      if (contentFilter && !contentFilter(plaintext)) continue;
      results.push(plaintext);
    }
    return results;
  }, [fetchRawRecords, decryptRecord]);

  /**
   * Find a record with retry — waits for Shield wallet to sync new records after TX.
   */
  const findRecordWithRetry = useCallback(async (
    criteria: { functionName?: string; programName?: string },
    programId?: string,
    contentFilter?: (plaintext: string) => boolean,
    maxRetries = 5,
    delayMs = 4000,
  ): Promise<string | null> => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        console.log(`[findRecordWithRetry] Attempt ${attempt + 1}/${maxRetries + 1}, waiting ${delayMs}ms...`);
        await sleep(delayMs);
      }
      const result = await findRecord(criteria, programId, contentFilter);
      if (result) return result;
    }
    return null;
  }, [findRecord]);

  // ============================
  // TYPED RECORD ACCESSORS
  // ============================

  const getBuyerReceipts = useCallback(async (): Promise<BuyerReceiptRecord[]> => {
    const plaintexts = await findAllRecords(
      {},
      PROGRAM_ID,
      (pt) => pt.includes('token_type') && pt.includes('cart_commitment') && pt.includes('merchant'),
    );

    return plaintexts.map((pt) => {
      const parsed = parseRecordPlaintext(pt);
      return {
        owner: parsed.owner || address!,
        merchant: parsed.merchant || '',
        total: parseInt(stripSuffix(parsed.total || '0')),
        cart_commitment: parsed.cart_commitment || '0field',
        timestamp: parseInt(stripSuffix(parsed.timestamp || '0')),
        purchase_commitment: parsed.purchase_commitment || '0field',
        token_type: parseInt(stripSuffix(parsed.token_type || '0')),
        nonce_seed: parsed.nonce_seed || '0field',
        _plaintext: pt,
        _fromWallet: true,
      } as BuyerReceiptRecord;
    });
  }, [findAllRecords, address]);

  const getEscrowReceipts = useCallback(async (): Promise<EscrowReceiptRecord[]> => {
    const plaintexts = await findAllRecords(
      {},
      PROGRAM_ID,
      (pt) => pt.includes('purchase_commitment') && pt.includes('merchant') && !pt.includes('token_type'),
    );

    return plaintexts.map((pt) => {
      const parsed = parseRecordPlaintext(pt);
      return {
        owner: parsed.owner || address!,
        merchant: parsed.merchant || '',
        total: parseInt(stripSuffix(parsed.total || '0')),
        cart_commitment: parsed.cart_commitment || '0field',
        purchase_commitment: parsed.purchase_commitment || '0field',
        nonce_seed: parsed.nonce_seed || '0field',
        _plaintext: pt,
        _fromWallet: true,
      } as EscrowReceiptRecord;
    });
  }, [findAllRecords, address]);

  const getCartItemProofs = useCallback(async () => {
    const plaintexts = await findAllRecords(
      {},
      PROGRAM_ID,
      (pt) => pt.includes('item_commitment') && pt.includes('verified_by'),
    );

    return plaintexts.map((pt) => {
      const parsed = parseRecordPlaintext(pt);
      return {
        owner: parsed.owner || address!,
        item_commitment: parsed.item_commitment || '0field',
        verified_by: parsed.verified_by || '',
        _plaintext: pt,
        _fromWallet: true,
      };
    });
  }, [findAllRecords, address]);

  const getMerchantLicense = useCallback(async (): Promise<MerchantLicenseRecord | null> => {
    const plaintexts = await findAllRecords(
      {},
      PROGRAM_ID,
      (pt) => pt.includes('store_name_hash') && !pt.includes('purchase_commitment'),
    );

    if (plaintexts.length === 0) return null;
    const pt = plaintexts[0];
    const parsed = parseRecordPlaintext(pt);
    return {
      owner: parsed.owner || address!,
      store_commitment: parsed.store_commitment || parsed.store_name_hash || '0field',
      nonce_seed: parsed.nonce_seed || '0field',
      _plaintext: pt,
      _fromWallet: true,
    } as MerchantLicenseRecord;
  }, [findAllRecords, address]);

  /**
   * Get MerchantReceipt records — these go to the merchant's wallet.
   * Simpler than BuyerReceipt: only has purchase_commitment, total, token_type.
   */
  const getMerchantReceipts = useCallback(async (): Promise<MerchantReceiptRecord[]> => {
    const plaintexts = await findAllRecords(
      {},
      PROGRAM_ID,
      (pt) => pt.includes('purchase_commitment') && pt.includes('token_type') && !pt.includes('merchant') && !pt.includes('cart_commitment'),
    );

    return plaintexts.map((pt) => {
      const parsed = parseRecordPlaintext(pt);
      return {
        owner: parsed.owner || address!,
        purchase_commitment: parsed.purchase_commitment || '0field',
        total: parseInt(stripSuffix(parsed.total || '0')),
        token_type: parseInt(stripSuffix(parsed.token_type || '0')),
        nonce_seed: parsed.nonce_seed || '0field',
        _plaintext: pt,
        _fromWallet: true,
      } as MerchantReceiptRecord;
    });
  }, [findAllRecords, address]);

  /**
   * Get credit records with parsed balances.
   * Uses wallet.decrypt() to decode recordCiphertext.
   */
  const getCreditRecords = useCallback(async () => {
    const records = await fetchRawRecords(CREDITS_PROGRAM);
    console.log('[VeilWallet] Raw credit records:', records.length);

    const results: any[] = [];
    for (const record of records) {
      if (!record || typeof record !== 'object') continue;
      if (record.spent === true) continue;

      const plaintext = await decryptRecord(record);
      let mc = BigInt(0);

      if (plaintext) {
        const match = plaintext.match(/microcredits\s*:\s*([\d_]+)u64/);
        if (match) mc = BigInt(match[1].replace(/_/g, ''));
      }

      if (mc === BigInt(0)) {
        mc = BigInt(parseMicrocredits(record));
      }

      console.log(`[VeilWallet] Credit record: ${mc} microcredits`);
      results.push({
        ...record,
        microcredits: mc,
        _plaintext: plaintext || '',
        owner: record.owner || address,
      });
    }
    return results;
  }, [fetchRawRecords, decryptRecord, address]);

  /**
   * Get USDCx token records with parsed amounts.
   */
  const getUsdcxTokens = useCallback(async () => {
    const records = await fetchRawRecords(USDCX_PROGRAM);
    console.log('[VeilWallet] Raw USDCx records:', records.length);

    const results: any[] = [];
    for (const record of records) {
      if (!record || typeof record !== 'object') continue;
      if (record.spent === true) continue;

      const plaintext = await decryptRecord(record);
      let amt = BigInt(0);

      if (plaintext) {
        const match = plaintext.match(/amount\s*:\s*([\d_]+)u128/);
        if (match) amt = BigInt(match[1].replace(/_/g, ''));
      }

      if (amt === BigInt(0)) {
        amt = parseTokenAmount(record);
      }

      console.log(`[VeilWallet] USDCx record: ${amt} micro`);
      results.push({
        ...record,
        amount: amt,
        _plaintext: plaintext || '',
        owner: record.owner || address,
      });
    }
    return results;
  }, [fetchRawRecords, decryptRecord, address]);

  // ============================
  // TRANSACTION EXECUTION
  // ============================

  /**
   * Execute an Aleo transition and return the transaction ID.
   * Always uses privateFee: false for Shield wallet compatibility.
   */
  const executeTransaction = useCallback(async (
    programId: string,
    functionName: string,
    inputs: string[],
    fee: number = DEFAULT_FEE,
  ): Promise<string> => {
    if (!walletExecute) throw new Error('Wallet does not support transactions');

    console.log(`[VeilWallet] Executing ${programId}/${functionName} with ${inputs.length} inputs, fee: ${fee}`);

    const options: TransactionOptions = {
      program: programId,
      function: functionName,
      inputs,
      fee,
      privateFee: false,
    };

    const result = await walletExecute(options);
    if (!result?.transactionId) throw new Error('No transaction ID returned');

    console.log(`[VeilWallet] Transaction submitted: ${result.transactionId}`);
    return result.transactionId;
  }, [walletExecute]);

  // ============================
  // TRANSACTION POLLING
  // ============================

  /**
   * Poll transaction status until terminal state.
   * Handles Shield's temporary IDs by checking for real on-chain txId.
   */
  const pollTransaction = useCallback(async (txId: string, maxAttempts: number = 120): Promise<boolean> => {
    let currentId = txId;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        if (transactionStatus) {
          const response = await transactionStatus(currentId);
          const status = (typeof response === 'string'
            ? response
            : (response as any)?.status ?? ''
          ).toLowerCase();

          // Shield wallet returns real on-chain ID — replace in-place instead of adding new entry
          const realTxId = (response as any)?.transactionId;
          if (realTxId && realTxId !== currentId && realTxId.startsWith('at1')) {
            console.log(`[Poll] Real TX ID: ${realTxId}`);
            pendingTxStore.updateTransactionId(currentId, realTxId);
            currentId = realTxId;
          }

          if (status === 'finalized' || status === 'completed' || status === 'accepted') {
            pendingTxStore.confirmTransaction(currentId);
            return true;
          }
          if (status === 'failed' || status === 'rejected') {
            pendingTxStore.failTransaction(currentId);
            return false;
          }
        }

        // Fallback: check via RPC if we have a real on-chain ID
        if (currentId.startsWith('at1')) {
          try {
            const urls = [
              `${RPC}/${ALEO_CONFIG.network}/transaction/${currentId}`,
              `https://api.explorer.provable.com/v1/${ALEO_CONFIG.network}/transaction/${currentId}`,
            ];
            for (const url of urls) {
              try {
                const resp = await fetch(url);
                if (resp.ok) {
                  console.log(`[Poll] Confirmed via RPC: ${currentId}`);
                  pendingTxStore.confirmTransaction(currentId);
                  return true;
                }
              } catch { /* try next */ }
            }
          } catch {
            // Not yet confirmed, keep polling
          }
        }
      } catch {
        // Status check failed, keep trying
      }
      await sleep(5000);
    }
    return false;
  }, [transactionStatus]);

  // ============================
  // PURCHASE OPERATIONS — ALL PRIVATE FIRST
  // ============================

  /**
   * Private purchase with Aleo Credits.
   * Uses wallet.decrypt() to find a record with sufficient balance,
   * then passes the plaintext record directly as transaction input.
   */
  const purchasePrivateCredits = useCallback(async (
    merchantAddress: string,
    totalMicrocredits: number,
    cartItems: { sku: string; quantity: number }[],
  ) => {
    if (!address) throw new Error('Wallet not connected');
    setLoading(true);

    try {
      const creditRecord = await findCreditsRecord(totalMicrocredits);

      if (!creditRecord) {
        const rawRecords = await fetchRawRecords(CREDITS_PROGRAM);
        const unspent = rawRecords.filter((r: any) => r.spent !== true);

        if (unspent.length === 0) {
          throw new Error(
            'No private credit records found. Please ensure you have Aleo credits in your wallet. ' +
            'If you only have public balance, convert some credits to private using transfer_public_to_private.'
          );
        }

        throw new Error(
          `Insufficient private balance. Need ${(totalMicrocredits / 1_000_000).toFixed(2)} ALEO. ` +
          `Found ${unspent.length} record(s) but none with sufficient balance. ` +
          'Try converting more public credits to private.'
        );
      }

      const timestamp = getCurrentTimestamp();
      const salt = generateAleoScalar();

      // Build Merkle tree for cart items
      const merkleItems: MerkleCartItem[] = cartItems.map(ci => ({
        product_id: skuToField(ci.sku),
        quantity: ci.quantity,
        price: 0, // price tracked in receipt total, not per-item leaf
      }));
      const merkleTree = buildCartMerkleTree(merkleItems);
      const merkleRoot = merkleTree.root;

      const inputs = [
        creditRecord,
        merchantAddress,
        toAleoU64(totalMicrocredits),
        toAleoField(merkleRoot),
        toAleoU64(timestamp),
        salt,
      ];

      const txId = await executeTransaction(
        PROGRAM_ID,
        TRANSITIONS.purchase_private_credits,
        inputs,
      );

      pendingTxStore.addTransaction({
        txId,
        type: 'purchase',
        data: { merchant: merchantAddress, total: totalMicrocredits, tokenType: 'credits', privacy: 'private' },
      });

      toast.success('Private credit purchase submitted!');

      pollTransaction(txId).then(async (confirmed) => {
        if (confirmed) {
          pendingTxStore.confirmTransaction(txId);
          toast.success('Purchase confirmed on-chain!');
          // Store Merkle tree for later item proofs
          storeMerkleTree(txId, merkleTree, address);
          try {
            await api.storeReceipt({
              txId,
              merchantAddress,
              buyerAddress: address,
              total: totalMicrocredits,
              tokenType: 'credits',
              purchaseType: 'private',
              cartCommitment: merkleRoot,
              timestamp,
            });
          } catch { /* non-critical */ }
        } else {
          pendingTxStore.failTransaction(txId);
          toast.error('Transaction may have failed. Check explorer.');
        }
      });

      return txId;
    } finally {
      setLoading(false);
    }
  }, [address, findCreditsRecord, fetchRawRecords, executeTransaction, pollTransaction]);

  /**
   * Public purchase with Aleo Credits.
   * No record input needed — uses transfer_public (amounts visible on-chain).
   */
  const purchasePublicCredits = useCallback(async (
    merchantAddress: string,
    totalMicrocredits: number,
    cartItems: { sku: string; quantity: number }[],
  ) => {
    if (!address) throw new Error('Wallet not connected');
    setLoading(true);

    try {
      // Public purchase uses transfer_public which requires public balance on-chain.
      // Check if user has public balance by querying the mapping.
      try {
        const balanceUrl = `${RPC}/${ALEO_CONFIG.network}/program/credits.aleo/mapping/account/${address}`;
        const resp = await fetch(balanceUrl);
        if (resp.ok) {
          const balText = await resp.text();
          const balMatch = balText.match(/(\d+)u64/);
          const publicBalance = balMatch ? parseInt(balMatch[1]) : 0;
          if (publicBalance < totalMicrocredits) {
            throw new Error(
              `Insufficient public balance. You have ${(publicBalance / 1_000_000).toFixed(2)} ALEO public but need ${(totalMicrocredits / 1_000_000).toFixed(2)} ALEO. ` +
              'Use "Private" mode instead, or convert credits to public using transfer_private_to_public.'
            );
          }
        }
      } catch (balErr: any) {
        // If balance check itself throws our insufficient error, rethrow it
        if (balErr.message?.includes('Insufficient public')) throw balErr;
        // Otherwise just log and continue (RPC may be down)
        console.warn('[VeilWallet] Could not check public balance:', balErr);
      }

      const timestamp = getCurrentTimestamp();
      const salt = generateAleoScalar();

      // Build Merkle tree for cart items
      const merkleItems: MerkleCartItem[] = cartItems.map(ci => ({
        product_id: skuToField(ci.sku),
        quantity: ci.quantity,
        price: 0,
      }));
      const merkleTree = buildCartMerkleTree(merkleItems);
      const merkleRoot = merkleTree.root;

      const inputs = [
        merchantAddress,
        toAleoU64(totalMicrocredits),
        toAleoField(merkleRoot),
        toAleoU64(timestamp),
        salt,
      ];

      const txId = await executeTransaction(
        PROGRAM_ID,
        TRANSITIONS.purchase_public_credits,
        inputs,
      );

      pendingTxStore.addTransaction({
        txId,
        type: 'purchase',
        data: { merchant: merchantAddress, total: totalMicrocredits, tokenType: 'credits', privacy: 'public' },
      });

      toast.success('Public credit purchase submitted!');

      pollTransaction(txId).then(async (confirmed) => {
        if (confirmed) {
          pendingTxStore.confirmTransaction(txId);
          toast.success('Public purchase confirmed!');
          storeMerkleTree(txId, merkleTree, address);
          try {
            await api.storeReceipt({
              txId,
              merchantAddress,
              buyerAddress: address,
              total: totalMicrocredits,
              tokenType: 'credits',
              purchaseType: 'public',
              cartCommitment: merkleRoot,
              timestamp,
            });
          } catch { /* non-critical */ }
        } else {
          pendingTxStore.failTransaction(txId);
          toast.error('Transaction may have failed.');
        }
      });

      return txId;
    } finally {
      setLoading(false);
    }
  }, [address, executeTransaction, pollTransaction]);

  /**
   * Private purchase with USDCx stablecoin.
   * Finds a USDCx Token record via wallet.decrypt(), builds MerkleProofs,
   * and executes the private transfer.
   */
  const purchasePrivateUsdcx = useCallback(async (
    merchantAddress: string,
    amountMicro: number,
    cartItems: { sku: string; quantity: number }[],
  ) => {
    if (!address) throw new Error('Wallet not connected');
    setLoading(true);

    try {
      const tokenRecord = await findTokenRecord(BigInt(amountMicro));

      if (!tokenRecord) {
        const rawRecords = await fetchRawRecords(USDCX_PROGRAM);
        const unspent = rawRecords.filter((r: any) => r.spent !== true);

        if (unspent.length === 0) {
          throw new Error(
            'No private USDCx token records found. Please ensure you have USDCx tokens in your wallet.'
          );
        }

        throw new Error(
          `Insufficient USDCx balance. Need ${(amountMicro / 1_000_000).toFixed(2)} USDCx. ` +
          `Found ${unspent.length} record(s) but none with sufficient balance.`
        );
      }

      const timestamp = getCurrentTimestamp();
      const salt = generateAleoScalar();
      const proofs = buildUsdcxMerkleProofs();

      // Build Merkle tree for cart items
      const merkleItems: MerkleCartItem[] = cartItems.map(ci => ({
        product_id: skuToField(ci.sku),
        quantity: ci.quantity,
        price: 0,
      }));
      const merkleTree = buildCartMerkleTree(merkleItems);
      const merkleRoot = merkleTree.root;

      const inputs = [
        tokenRecord,
        merchantAddress,
        `${amountMicro}u128`,
        toAleoField(merkleRoot),
        toAleoU64(timestamp),
        salt,
        proofs,
      ];

      const txId = await executeTransaction(
        PROGRAM_ID,
        TRANSITIONS.purchase_private_usdcx,
        inputs,
      );

      pendingTxStore.addTransaction({
        txId,
        type: 'purchase',
        data: { merchant: merchantAddress, total: amountMicro, tokenType: 'usdcx', privacy: 'private' },
      });

      toast.success('Private USDCx purchase submitted!');

      pollTransaction(txId).then(async (confirmed) => {
        if (confirmed) {
          pendingTxStore.confirmTransaction(txId);
          toast.success('USDCx purchase confirmed!');
          storeMerkleTree(txId, merkleTree, address);
          try {
            await api.storeReceipt({
              txId,
              merchantAddress,
              buyerAddress: address,
              total: amountMicro,
              tokenType: 'usdcx',
              purchaseType: 'private',
              cartCommitment: merkleRoot,
              timestamp,
            });
          } catch { /* non-critical */ }
        } else {
          pendingTxStore.failTransaction(txId);
          toast.error('Transaction may have failed.');
        }
      });

      return txId;
    } finally {
      setLoading(false);
    }
  }, [address, findTokenRecord, fetchRawRecords, executeTransaction, pollTransaction]);

  /**
   * Escrow purchase with Aleo Credits.
   * Locks credits on-chain with a refund window.
   */
  const purchaseEscrowCredits = useCallback(async (
    merchantAddress: string,
    totalMicrocredits: number,
    cartItems: { sku: string; quantity: number }[],
  ) => {
    if (!address) throw new Error('Wallet not connected');
    setLoading(true);

    try {
      const creditRecord = await findCreditsRecord(totalMicrocredits);

      if (!creditRecord) {
        const rawRecords = await fetchRawRecords(CREDITS_PROGRAM);
        const unspent = rawRecords.filter((r: any) => r.spent !== true);

        if (unspent.length === 0) {
          throw new Error(
            'No private credit records found for escrow. Convert public credits to private first.'
          );
        }

        throw new Error(
          `Insufficient private balance for escrow. Need ${(totalMicrocredits / 1_000_000).toFixed(2)} ALEO.`
        );
      }

      const timestamp = getCurrentTimestamp();
      const salt = generateAleoScalar();

      // Build Merkle tree for cart items
      const merkleItems: MerkleCartItem[] = cartItems.map(ci => ({
        product_id: skuToField(ci.sku),
        quantity: ci.quantity,
        price: 0,
      }));
      const merkleTree = buildCartMerkleTree(merkleItems);
      const merkleRoot = merkleTree.root;

      const inputs = [
        creditRecord,
        merchantAddress,
        toAleoU64(totalMicrocredits),
        toAleoField(merkleRoot),
        toAleoU64(timestamp),
        salt,
      ];

      const txId = await executeTransaction(
        PROGRAM_ID,
        TRANSITIONS.purchase_escrow_credits,
        inputs,
      );

      pendingTxStore.addTransaction({
        txId,
        type: 'escrow',
        data: { merchant: merchantAddress, total: totalMicrocredits, tokenType: 'credits', privacy: 'escrow' },
      });

      toast.success('Escrow purchase submitted! Funds locked on-chain.');

      pollTransaction(txId).then(async (confirmed) => {
        if (confirmed) {
          pendingTxStore.confirmTransaction(txId);
          toast.success('Escrow confirmed! You can release or refund within the return window.');
          storeMerkleTree(txId, merkleTree, address);
          // Save block height for refund verification
          try {
            const blockHeight = await getCurrentBlockHeight();
            localStorage.setItem(`escrow_block_${txId}`, String(blockHeight));
          } catch { /* non-critical */ }
          try {
            await api.storeReceipt({
              txId,
              merchantAddress,
              buyerAddress: address,
              total: totalMicrocredits,
              tokenType: 'credits',
              purchaseType: 'escrow',
              status: 'escrowed',
              cartCommitment: merkleRoot,
              timestamp,
            });
          } catch { /* non-critical */ }
        } else {
          pendingTxStore.failTransaction(txId);
          toast.error('Escrow transaction may have failed.');
        }
      });

      return txId;
    } finally {
      setLoading(false);
    }
  }, [address, findCreditsRecord, fetchRawRecords, executeTransaction, pollTransaction]);

  // ============================
  // ESCROW OPERATIONS
  // ============================

  const completeEscrow = useCallback(async (escrowRecord: EscrowReceiptRecord) => {
    if (!address) throw new Error('Wallet not connected');
    setLoading(true);

    try {
      if (!escrowRecord._plaintext) throw new Error('Missing escrow record plaintext');

      const txId = await executeTransaction(
        PROGRAM_ID,
        TRANSITIONS.complete_escrow,
        [escrowRecord._plaintext],
      );

      pendingTxStore.addTransaction({
        txId,
        type: 'complete',
        data: { total: escrowRecord.total, merchant: escrowRecord.merchant },
      });

      toast.success('Escrow release submitted! Merchant will receive funds.');

      pollTransaction(txId).then((confirmed) => {
        if (confirmed) {
          pendingTxStore.confirmTransaction(txId);
          toast.success('Escrow completed — merchant paid!');
        } else {
          pendingTxStore.failTransaction(txId);
          toast.error('Escrow release may have failed.');
        }
      });

      return txId;
    } finally {
      setLoading(false);
    }
  }, [address, executeTransaction, pollTransaction]);

  const refundEscrow = useCallback(async (escrowRecord: EscrowReceiptRecord, reasonHash: string, createdBlock: number) => {
    if (!address) throw new Error('Wallet not connected');
    setLoading(true);

    try {
      if (!escrowRecord._plaintext) throw new Error('Missing escrow record plaintext');

      const txId = await executeTransaction(
        PROGRAM_ID,
        TRANSITIONS.refund_escrow,
        [escrowRecord._plaintext, toAleoField(reasonHash), toAleoU64(createdBlock)],
      );

      pendingTxStore.addTransaction({
        txId,
        type: 'refund',
        data: { total: escrowRecord.total, reason: reasonHash },
      });

      toast.success('Refund requested! Processing on-chain.');

      pollTransaction(txId).then((confirmed) => {
        if (confirmed) {
          pendingTxStore.confirmTransaction(txId);
          toast.success('Refund confirmed — credits returned!');
        } else {
          pendingTxStore.failTransaction(txId);
          toast.error('Refund may have failed — check return window.');
        }
      });

      return txId;
    } finally {
      setLoading(false);
    }
  }, [address, executeTransaction, pollTransaction]);

  // ============================
  // CART ITEM PROOF
  // ============================

  const proveCartItem = useCallback(async (
    receiptRecord: BuyerReceiptRecord,
    itemIndex: number,
    verifierAddress: string,
  ) => {
    if (!address) throw new Error('Wallet not connected');
    setLoading(true);

    try {
      if (!receiptRecord._plaintext) throw new Error('Missing receipt plaintext');

      // Load the stored Merkle tree for this receipt
      const treeData = loadMerkleTree(receiptRecord.cart_commitment, address);
      if (!treeData) throw new Error('Merkle tree data not found for this receipt. Cannot generate proof.');

      const proofInput = formatMerkleProofInput(treeData.proofs[itemIndex]);
      const itemInput = formatCartItemInput(treeData.items[itemIndex]);

      const resultTxId = await executeTransaction(
        PROGRAM_ID,
        TRANSITIONS.prove_cart_item,
        [receiptRecord._plaintext, itemInput, proofInput, verifierAddress],
      );

      pendingTxStore.addTransaction({
        txId: resultTxId,
        type: 'proof',
        data: { action: 'cart_item_proof', itemIndex },
      });

      toast.success('Cart item proof submitted!');

      pollTransaction(resultTxId).then((confirmed) => {
        if (confirmed) {
          pendingTxStore.confirmTransaction(resultTxId);
          toast.success('Cart item proof verified on-chain!');
        } else {
          pendingTxStore.failTransaction(resultTxId);
        }
      });

      return resultTxId;
    } finally {
      setLoading(false);
    }
  }, [address, executeTransaction, pollTransaction]);

  // ============================
  // MERCHANT REGISTRATION
  // ============================

  const registerMerchant = useCallback(async (storeNameHash: string) => {
    if (!address) throw new Error('Wallet not connected');
    setLoading(true);

    try {
      const txId = await executeTransaction(
        PROGRAM_ID,
        TRANSITIONS.register_merchant,
        [toAleoField(storeNameHash)],
      );

      pendingTxStore.addTransaction({
        txId,
        type: 'merchant',
        data: { action: 'register', storeNameHash },
      });

      toast.success('Merchant registration submitted!');

      pollTransaction(txId).then((confirmed) => {
        if (confirmed) {
          pendingTxStore.confirmTransaction(txId);
          toast.success('Merchant registered on-chain!');
        } else {
          pendingTxStore.failTransaction(txId);
          toast.error('Merchant registration may have failed.');
        }
      });

      return txId;
    } finally {
      setLoading(false);
    }
  }, [address, executeTransaction, pollTransaction]);

  // ============================
  // PURCHASE SUPPORT PROOF
  // ============================
  const provePurchaseSupport = useCallback(async (receiptRecord: BuyerReceiptRecord, productHash: string) => {
    if (!address) throw new Error('Wallet not connected');
    setLoading(true);

    try {
      if (!receiptRecord._plaintext) throw new Error('Missing receipt plaintext');
      // Contract expects salt as field type, not scalar
      const saltBytes = new Uint8Array(16);
      crypto.getRandomValues(saltBytes);
      let saltVal = 0n;
      for (const b of saltBytes) saltVal = (saltVal << 8n) | BigInt(b);
      const salt = `${saltVal}field`;

      const txId = await executeTransaction(
        PROGRAM_ID,
        TRANSITIONS.prove_purchase_support,
        [receiptRecord._plaintext, toAleoField(productHash), salt],
      );

      toast.success('Support proof submitted!');
      return txId;
    } finally {
      setLoading(false);
    }
  }, [address, executeTransaction]);

  // ============================
  // MINT ACCESS TOKEN — Receipt-gated access
  // ============================
  const mintAccessToken = useCallback(async (receiptRecord: BuyerReceiptRecord, gateId: string, tier: number = 1) => {
    if (!address) throw new Error('Wallet not connected');
    setLoading(true);

    try {
      if (!receiptRecord._plaintext) throw new Error('Missing receipt plaintext');

      const txId = await executeTransaction(
        PROGRAM_ID,
        TRANSITIONS.mint_access_token,
        [receiptRecord._plaintext, toAleoField(gateId), `${tier}u8`],
      );

      pendingTxStore.addTransaction({
        txId,
        type: 'proof',
        data: { action: 'access_token', gateId, tier },
      });

      toast.success('Access token minting submitted!');

      pollTransaction(txId).then((confirmed) => {
        if (confirmed) {
          pendingTxStore.confirmTransaction(txId);
          toast.success('Access token minted — you can now unlock gated content!');
        } else {
          pendingTxStore.failTransaction(txId);
          toast.error('Access token minting may have failed.');
        }
      });

      return txId;
    } finally {
      setLoading(false);
    }
  }, [address, executeTransaction, pollTransaction]);

  // ============================
  // SUBMIT ANONYMOUS REVIEW
  // ============================
  const submitAnonymousReview = useCallback(async (receiptRecord: BuyerReceiptRecord, productHash: string, rating: number) => {
    if (!address) throw new Error('Wallet not connected');
    if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5');
    setLoading(true);

    try {
      if (!receiptRecord._plaintext) throw new Error('Missing receipt plaintext');

      const txId = await executeTransaction(
        PROGRAM_ID,
        TRANSITIONS.submit_anonymous_review,
        [receiptRecord._plaintext, toAleoField(productHash), `${rating}u8`],
      );

      pendingTxStore.addTransaction({
        txId,
        type: 'proof',
        data: { action: 'anonymous_review', productHash, rating },
      });

      toast.success('Anonymous review submitted!');

      pollTransaction(txId).then((confirmed) => {
        if (confirmed) {
          pendingTxStore.confirmTransaction(txId);
          toast.success('Review verified and counted on-chain!');
        } else {
          pendingTxStore.failTransaction(txId);
          toast.error('Review submission may have failed.');
        }
      });

      return txId;
    } finally {
      setLoading(false);
    }
  }, [address, executeTransaction, pollTransaction]);

  // ============================
  // FETCH ACCESS TOKENS
  // ============================
  const getAccessTokens = useCallback(async () => {
    const records = await fetchRawRecords(PROGRAM_ID);
    const tokens: any[] = [];
    for (const rec of records) {
      const pt = rec.plaintext || rec._plaintext || (typeof rec === 'string' ? rec : '');
      if (typeof pt === 'string' && pt.includes('gate_commitment') && pt.includes('token_tier')) {
        const parsed = parseRecordPlaintext(pt);
        tokens.push({
          owner: parsed.owner || address,
          merchant: parsed.merchant || '',
          gate_commitment: stripSuffix(parsed.gate_commitment || ''),
          token_tier: parseInt(stripSuffix(parsed.token_tier || '0'), 10),
          nonce_seed: stripSuffix(parsed.nonce_seed || ''),
          _plaintext: pt,
          _fromWallet: true,
        });
      }
    }
    return tokens;
  }, [fetchRawRecords, address]);

  // ============================
  // FETCH REVIEW TOKENS
  // ============================
  const getReviewTokens = useCallback(async () => {
    const records = await fetchRawRecords(PROGRAM_ID);
    const tokens: any[] = [];
    for (const rec of records) {
      const pt = rec.plaintext || rec._plaintext || (typeof rec === 'string' ? rec : '');
      if (typeof pt === 'string' && pt.includes('review_commitment') && pt.includes('rating')) {
        const parsed = parseRecordPlaintext(pt);
        tokens.push({
          owner: parsed.owner || address,
          product_hash: stripSuffix(parsed.product_hash || ''),
          rating: parseInt(stripSuffix(parsed.rating || '0'), 10),
          review_commitment: stripSuffix(parsed.review_commitment || ''),
          nonce_seed: stripSuffix(parsed.nonce_seed || ''),
          _plaintext: pt,
          _fromWallet: true,
        });
      }
    }
    return tokens;
  }, [fetchRawRecords, address]);

  // ============================
  // UNIFIED PURCHASE FUNCTION
  // ============================
  const purchase = useCallback(async (
    merchantAddress: string,
    totalMicro: number,
    cartItems: { sku: string; quantity: number }[],
    privacy: PaymentPrivacy,
    tokenType: TokenType,
  ) => {
    if (tokenType === 'usdcx' && privacy === 'private') {
      return purchasePrivateUsdcx(merchantAddress, totalMicro, cartItems);
    }
    if (privacy === 'escrow') {
      return purchaseEscrowCredits(merchantAddress, totalMicro, cartItems);
    }
    if (privacy === 'public') {
      return purchasePublicCredits(merchantAddress, totalMicro, cartItems);
    }
    // Default: private credits
    return purchasePrivateCredits(merchantAddress, totalMicro, cartItems);
  }, [purchasePrivateCredits, purchasePrivateUsdcx, purchasePublicCredits, purchaseEscrowCredits]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  return {
    // Connection
    address,
    connected,
    connecting,
    disconnect,
    role,

    // Auth
    authenticate,

    // Purchase operations
    purchase,
    purchasePrivateCredits,
    purchasePrivateUsdcx,
    purchasePublicCredits,
    purchaseEscrowCredits,

    // Escrow operations
    completeEscrow,
    refundEscrow,

    // Cart item proof
    proveCartItem,

    // Merchant registration
    registerMerchant,

    // Support proof
    provePurchaseSupport,

    // Access tokens & reviews (v6)
    mintAccessToken,
    submitAnonymousReview,
    getAccessTokens,
    getReviewTokens,

    // Record access
    getBuyerReceipts,
    getMerchantReceipts,
    getEscrowReceipts,
    getCartItemProofs,
    getMerchantLicense,
    getCreditRecords,
    getUsdcxTokens,

    // Advanced record access
    findRecord,
    findAllRecords,
    findRecordWithRetry,
    findCreditsRecord,
    findTokenRecord,

    // State
    loading,
  };
}
