// Utility functions for VeilReceipt

import { AleoAddress } from './types';

/**
 * Format microcredits to credits string
 */
export function formatCredits(microcredits: number | bigint): string {
  const credits = Number(microcredits) / 1_000_000;
  return credits.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

/**
 * Format microcredits to short display (e.g., "1.5 Credits")
 */
export function formatCreditsShort(microcredits: number | bigint): string {
  const credits = Number(microcredits) / 1_000_000;
  if (credits >= 1_000_000) {
    return `${(credits / 1_000_000).toFixed(2)}M`;
  }
  if (credits >= 1_000) {
    return `${(credits / 1_000).toFixed(2)}K`;
  }
  return credits.toFixed(2);
}

/**
 * Parse credits string to microcredits
 */
export function parseCredits(credits: string): number {
  const num = parseFloat(credits.replace(/,/g, ''));
  return Math.floor(num * 1_000_000);
}

/**
 * Truncate Aleo address for display
 */
export function truncateAddress(address: string, chars: number = 6): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars + 5)}...${address.slice(-chars)}`;
}

/**
 * Format timestamp to readable date
 */
export function formatDate(timestamp: number | bigint | string): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: number | bigint | string): string {
  const now = Date.now();
  const date = typeof timestamp === 'string' 
    ? new Date(timestamp).getTime() 
    : Number(timestamp) * 1000;
  const diff = now - date;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

/**
 * Generate cart commitment hash (simplified - use Poseidon in production)
 * This is a placeholder - actual implementation should use Aleo's hash functions
 */
export function computeCartCommitment(items: { sku: string; quantity: number }[]): string {
  // Sort items for deterministic hash
  const sorted = [...items].sort((a, b) => a.sku.localeCompare(b.sku));
  const data = JSON.stringify(sorted);
  
  // Simple hash (in production, use Poseidon or BHP256 via WASM)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to field-like format
  const positiveHash = Math.abs(hash);
  return `${positiveHash}field`;
}

/**
 * Generate return reason hash
 */
export function computeReasonHash(reason: string): string {
  let hash = 0;
  for (let i = 0; i < reason.length; i++) {
    const char = reason.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `${Math.abs(hash)}field`;
}

/**
 * Validate Aleo address format
 */
export function isValidAleoAddress(address: string): address is AleoAddress {
  return /^aleo1[a-z0-9]{58}$/.test(address);
}

/**
 * Get current Unix timestamp
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clean Aleo value (remove type suffix)
 */
export function cleanAleoValue(value: string): string {
  return value.replace(/(u8|u16|u32|u64|u128|i8|i16|i32|i64|i128|field|scalar|group|address|boolean|string)$/i, '');
}

/**
 * Parse Aleo u64 value
 */
export function parseAleoU64(value: string): bigint {
  const cleaned = cleanAleoValue(value);
  return BigInt(cleaned);
}

/**
 * Format for Aleo input (add type suffix)
 */
export function toAleoU64(value: number | bigint): string {
  return `${value}u64`;
}

export function toAleoU8(value: number): string {
  return `${value}u8`;
}

export function toAleoField(value: string | number): string {
  const cleaned = String(value).replace(/field$/i, '');
  return `${cleaned}field`;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
