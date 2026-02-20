// Aleo Network Service — RPC queries and transaction status

const ALEO_RPC = process.env.ALEO_RPC_URL || 'https://api.explorer.provable.com/v1';
const NETWORK = process.env.ALEO_NETWORK || 'testnet';
const PROGRAM_ID = process.env.ALEO_PROGRAM_ID || 'veilreceipt_v3.aleo';

/**
 * Check transaction status on-chain
 */
export async function getTransactionStatus(txId: string): Promise<{
  status: 'confirmed' | 'pending' | 'failed' | 'not_found';
  blockHeight?: number;
}> {
  try {
    // Handle Shield Wallet TX IDs (shield_...)
    let lookupId = txId;
    if (txId.startsWith('shield_')) {
      // Lookup real TX ID from transition ID
      const transitionId = txId.replace('shield_', '');
      const lookupRes = await fetch(
        `${ALEO_RPC}/${NETWORK}/find/transactionID/from_transition/${transitionId}`
      );
      if (lookupRes.ok) {
        lookupId = await lookupRes.json() as string;
      } else {
        return { status: 'pending' };
      }
    }

    const res = await fetch(`${ALEO_RPC}/${NETWORK}/transaction/${lookupId}`);
    if (!res.ok) {
      if (res.status === 404) return { status: 'pending' };
      return { status: 'not_found' };
    }
    const data: any = await res.json();
    if (data && data.status === 'accepted') {
      return { status: 'confirmed', blockHeight: data.block?.height };
    }
    return { status: 'confirmed' };
  } catch {
    return { status: 'pending' };
  }
}

/**
 * Get mapping value from on-chain program
 */
export async function getMappingValue(mappingName: string, key: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${ALEO_RPC}/${NETWORK}/program/${PROGRAM_ID}/mapping/${mappingName}/${key}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data !== null ? String(data) : null;
  } catch {
    return null;
  }
}

/**
 * Fetch latest block height
 */
export async function getLatestBlockHeight(): Promise<number> {
  try {
    const res = await fetch(`${ALEO_RPC}/${NETWORK}/latest/height`);
    if (!res.ok) return 0;
    return (await res.json()) as number;
  } catch {
    return 0;
  }
}

export { ALEO_RPC, NETWORK, PROGRAM_ID };
