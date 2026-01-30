// Aleo RPC Service
// Interacts with Aleo network to read public mapping values

import { AleoAddress, AleoField } from '../types';

const ALEO_RPC_URL = process.env.ALEO_RPC_URL || 'https://api.explorer.provable.com/v1';
const PROGRAM_ID = process.env.ALEO_PROGRAM_ID || 'veilreceipt_v1.aleo';

interface AleoRpcError {
  error: string;
}

/**
 * Get public mapping value from Aleo network
 */
export async function getMappingValue(
  mappingName: string,
  key: string
): Promise<string | null> {
  try {
    const url = `${ALEO_RPC_URL}/testnet/program/${PROGRAM_ID}/mapping/${mappingName}/${key}`;
    console.log(`🔍 Fetching mapping value: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        // Key doesn't exist in mapping
        return null;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.text();
    // Remove quotes if present
    return data.replace(/^"|"$/g, '');
  } catch (error) {
    console.error(`Error fetching mapping ${mappingName}[${key}]:`, error);
    return null;
  }
}

/**
 * Get merchant's total sales from on-chain mapping
 */
export async function getMerchantSalesTotal(merchantAddress: AleoAddress): Promise<number> {
  const value = await getMappingValue('merchant_sales_total', merchantAddress);
  if (!value) return 0;
  
  // Parse "12345u64" format
  const match = value.match(/(\d+)u64/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Check if a nullifier has been used
 */
export async function isNullifierUsed(nullifier: AleoField): Promise<boolean> {
  const value = await getMappingValue('used_nullifiers', nullifier);
  return value === 'true';
}

/**
 * Get transaction details from explorer API
 */
export async function getTransaction(txId: string): Promise<any | null> {
  try {
    const url = `${ALEO_RPC_URL}/testnet/transaction/${txId}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching transaction ${txId}:`, error);
    return null;
  }
}

/**
 * Get latest block height
 */
export async function getLatestBlockHeight(): Promise<number> {
  try {
    const url = `${ALEO_RPC_URL}/testnet/latest/height`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const height = await response.text();
    return parseInt(height, 10);
  } catch (error) {
    console.error('Error fetching latest block height:', error);
    return 0;
  }
}

/**
 * Check if a transaction has been confirmed
 */
export async function isTransactionConfirmed(txId: string): Promise<boolean> {
  const tx = await getTransaction(txId);
  return tx !== null;
}

/**
 * Poll for transaction confirmation with timeout
 */
export async function waitForTransactionConfirmation(
  txId: string,
  timeoutMs: number = 120000,
  pollIntervalMs: number = 5000
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const confirmed = await isTransactionConfirmed(txId);
    if (confirmed) {
      console.log(`✅ Transaction ${txId} confirmed`);
      return true;
    }
    
    console.log(`⏳ Waiting for transaction ${txId} confirmation...`);
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }
  
  console.log(`⚠️ Transaction ${txId} confirmation timeout`);
  return false;
}
