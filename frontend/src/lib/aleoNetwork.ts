// Aleo Network Client - Fetch records directly from the network
// This bypasses wallet permission issues by using the SDK directly

import { ALEO_CONFIG } from './chain';

// API endpoint for Aleo network
const ALEO_API_URL = 'https://api.explorer.provable.com/v1';

// Contract deployment block - search from here
const DEPLOYMENT_BLOCK = 15000000; // V3 deployment block (approximate)

/**
 * Fetch transactions for a specific address from the network
 */
export async function fetchTransactionsForAddress(
  _address: string,
  _startBlock?: number
): Promise<any[]> {
  
  try {
    // Query transactions involving our program
    const response = await fetch(
      `${ALEO_API_URL}/testnet/program/${ALEO_CONFIG.programId}/transactions?page=0&limit=100`
    );
    
    if (!response.ok) {
      console.warn('Failed to fetch program transactions');
      return [];
    }
    
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

/**
 * Fetch a specific transaction by ID
 */
export async function fetchTransaction(txId: string): Promise<any | null> {
  try {
    const response = await fetch(
      `${ALEO_API_URL}/testnet/transaction/${txId}`
    );
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return null;
  }
}

/**
 * Get current block height
 */
export async function getCurrentBlockHeight(): Promise<number> {
  try {
    const response = await fetch(`${ALEO_API_URL}/testnet/latest/height`);
    if (!response.ok) return DEPLOYMENT_BLOCK + 10000;
    const height = await response.json();
    return typeof height === 'number' ? height : parseInt(height);
  } catch (error) {
    console.error('Error fetching block height:', error);
    return DEPLOYMENT_BLOCK + 10000;
  }
}

/**
 * Parse receipt data from transaction outputs
 * Records are encrypted, but we can extract basic info from the transaction
 */
export function parseReceiptFromTransaction(tx: any, _buyerAddress: string): any | null {
  try {
    if (!tx?.execution?.transitions) return null;
    
    // Find the purchase transition
    const purchaseTransition = tx.execution.transitions.find(
      (t: any) => t.program === ALEO_CONFIG.programId && t.function === 'purchase'
    );
    
    if (!purchaseTransition) return null;
    
    // Extract inputs (these are public in the transaction)
    const inputs = purchaseTransition.inputs || [];
    const outputs = purchaseTransition.outputs || [];
    
    // Parse the inputs
    // Input format: [merchant_address, total_u64, cart_commitment_field, timestamp_u64]
    let merchant = '';
    let total = BigInt(0);
    let cartCommitment = '';
    let timestamp = BigInt(0);
    
    inputs.forEach((input: any, index: number) => {
      const value = input.value || input;
      if (typeof value === 'string') {
        if (index === 0 && value.startsWith('aleo1')) {
          merchant = value;
        } else if (value.endsWith('u64')) {
          const num = BigInt(value.replace('u64', ''));
          if (index === 1) total = num;
          if (index === 3) timestamp = num;
        } else if (value.endsWith('field')) {
          cartCommitment = value;
        }
      }
    });
    
    // Get the encrypted record output (first output is usually the receipt)
    const recordOutput = outputs.find((o: any) => o.type === 'record');
    const recordCiphertext = recordOutput?.value || null;
    
    return {
      txId: tx.id || tx.transaction_id,
      merchant,
      total,
      cart_commitment: cartCommitment,
      timestamp,
      recordCiphertext,
      blockHeight: tx.block_height,
      _raw: tx,
    };
  } catch (error) {
    console.error('Error parsing receipt from transaction:', error);
    return null;
  }
}

/**
 * Fetch receipts for a buyer by scanning recent transactions
 * This is a fallback when wallet requestRecords fails
 */
export async function fetchReceiptsFromNetwork(
  buyerAddress: string,
  transactionIds?: string[]
): Promise<any[]> {
  const receipts: any[] = [];
  
  try {
    // If we have specific transaction IDs, fetch those
    if (transactionIds && transactionIds.length > 0) {
      for (const txId of transactionIds) {
        // Handle both local wallet IDs and on-chain IDs
        if (txId.startsWith('at1')) {
          const tx = await fetchTransaction(txId);
          if (tx) {
            const receipt = parseReceiptFromTransaction(tx, buyerAddress);
            if (receipt) {
              receipts.push(receipt);
            }
          }
        }
      }
    }
    
    // Also try to fetch from program transactions
    const programTxs = await fetchTransactionsForAddress(buyerAddress);
    
    for (const tx of programTxs) {
      // Check if this is a purchase transaction
      if (tx.type === 'execute' || tx.execution) {
        const receipt = parseReceiptFromTransaction(tx, buyerAddress);
        if (receipt && !receipts.find(r => r.txId === receipt.txId)) {
          receipts.push(receipt);
        }
      }
    }
    
    return receipts;
  } catch (error) {
    console.error('Error fetching receipts from network:', error);
    return receipts;
  }
}

/**
 * Alternative: Use the SDK's AleoNetworkClient if available
 * This requires the user's view key to decrypt records
 */
export async function findRecordsWithSDK(
  _viewKey: string,
  startBlock: number,
  endBlock: number
): Promise<any[]> {
  try {
    // Dynamic import to avoid SSR issues
    const { AleoNetworkClient } = await import('@provablehq/sdk');
    
    // Note: findRecords requires an account with the private key
    // For now, we'll use the transaction-based approach above
    // This is here for future enhancement when we can get the view key
    const _client = new AleoNetworkClient(ALEO_API_URL);
    void _client; // Suppress unused warning
    
    console.log('SDK loaded, would search blocks', startBlock, 'to', endBlock);
    
    return [];
  } catch (error) {
    console.error('SDK record search failed:', error);
    return [];
  }
}
