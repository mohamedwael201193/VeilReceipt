// Stablecoin Utilities (USDCx + USAD)
// Constructs MerkleProof for test_usdcx_stablecoin.aleo/transfer_private
// and test_usad_stablecoin.aleo/transfer_private
// CRITICAL: leaf_index MUST be 1u32 (NOT 0u32) — 0u32 causes rejection

/**
 * Build a dummy MerkleProof pair for stablecoin transfers (USDCx or USAD).
 * Production would use real Merkle tree proofs from the compliance system.
 * For testnet, the freeze-list is empty so dummy proofs with leaf_index=1 work.
 */
export function buildUsdcxMerkleProofs(): string {
  const siblings = Array(16).fill('0field').join(', ');
  const proof = `{ siblings: [${siblings}], leaf_index: 1u32 }`;
  return `[${proof}, ${proof}]`;
}

// USAD uses the same MerkleProof structure as USDCx
export const buildUsadMerkleProofs = buildUsdcxMerkleProofs;

/**
 * Convert a human-readable USDC amount to u128 microcredits
 * USDCx has 6 decimal places (like USDC)
 * Example: 10.50 USDC → 10500000u128
 */
export function usdcxToMicro(amount: number): bigint {
  return BigInt(Math.round(amount * 1_000_000));
}

/**
 * Convert u128 microcredits back to human-readable USDC amount
 */
export function microToUsdcx(micro: bigint | number): number {
  return Number(micro) / 1_000_000;
}

/**
 * Format USDCx amount for display
 */
export function formatUsdcx(micro: bigint | number): string {
  return `$${microToUsdcx(micro).toFixed(2)}`;
}

/**
 * Format Aleo credits for display
 */
export function formatCredits(micro: bigint | number): string {
  const credits = Number(micro) / 1_000_000;
  return `${credits.toFixed(2)} ALEO`;
}

/**
 * Convert a human-readable USAD amount to u128 microcredits
 * USAD has 6 decimal places (like USDC/USDCx)
 */
export function usadToMicro(amount: number): bigint {
  return BigInt(Math.round(amount * 1_000_000));
}

/**
 * Convert u128 microcredits back to human-readable USAD amount
 */
export function microToUsad(micro: bigint | number): number {
  return Number(micro) / 1_000_000;
}

/**
 * Format USAD amount for display
 */
export function formatUsad(micro: bigint | number): string {
  return `$${microToUsad(micro).toFixed(2)}`;
}
