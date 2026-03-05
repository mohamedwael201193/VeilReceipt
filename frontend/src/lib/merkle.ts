// Merkle tree utilities for VeilReceipt cart commitment proofs
// Builds a depth-2 binary Merkle tree (4 leaves max) from cart items.
// Each leaf is a deterministic hash of (product_id, quantity, price).
// The root is used as cart_commitment during checkout.
// Per-item proofs enable selective disclosure via prove_cart_item transition.

const ZERO_LEAF = '0field';
const MAX_LEAVES = 4;

export interface MerkleCartItem {
  product_id: string; // field-formatted product identifier
  quantity: number;
  price: number;
}

export interface MerkleItemProof {
  sibling_0: string; // sibling at leaf level
  sibling_1: string; // sibling at level 1
  path_bit_0: boolean; // position at leaf level
  path_bit_1: boolean; // position at level 1
  leaf_index: number;
  item_salt: string; // scalar salt used for this leaf commitment
}

export interface MerkleTreeData {
  root: string;
  leaves: string[];
  items: MerkleCartItem[];
  item_salts: string[];
  proofs: MerkleItemProof[];
}

/**
 * Generate a deterministic field-like hash from a string.
 * In production this would use BHP256 via WASM — here we produce
 * a deterministic numeric field string compatible with Aleo inputs.
 */
function simpleHash(input: string): string {
  let h = 0n;
  for (let i = 0; i < input.length; i++) {
    const c = BigInt(input.charCodeAt(i));
    h = ((h << 5n) - h + c) & 0xFFFFFFFFFFFFFFFFn;
  }
  if (h < 0n) h = -h;
  return `${h}field`;
}

/**
 * Hash two field values together (simulates BHP256::hash_to_field(a + b) on-chain).
 */
function hashPair(left: string, right: string): string {
  const a = left.replace(/field$/, '');
  const b = right.replace(/field$/, '');
  return simpleHash(`${a}:${b}`);
}

/**
 * Generate a random scalar string for Aleo (used as commitment randomizer).
 */
export function generateScalar(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let val = 0n;
  for (const b of bytes) val = (val << 8n) | BigInt(b);
  return `${val}scalar`;
}

/**
 * Compute a leaf commitment from a cart item + salt.
 * Mirrors on-chain: BHP256::commit_to_field(CartItem, item_salt)
 * Off-chain approximation using deterministic hashing.
 */
function computeLeaf(item: MerkleCartItem, salt: string): string {
  const data = `${item.product_id}:${item.quantity}:${item.price}:${salt}`;
  return simpleHash(data);
}

/**
 * Convert a product SKU to a field-like identifier.
 */
export function skuToField(sku: string): string {
  return simpleHash(`sku:${sku}`);
}

/**
 * Build a Merkle tree from cart items.
 * Pads to 4 leaves with zero hashes. Returns root + per-item proofs.
 */
export function buildCartMerkleTree(items: MerkleCartItem[]): MerkleTreeData {
  if (items.length === 0) {
    return {
      root: ZERO_LEAF,
      leaves: [],
      items: [],
      item_salts: [],
      proofs: [],
    };
  }

  if (items.length > MAX_LEAVES) {
    throw new Error(`Cart has ${items.length} items, max is ${MAX_LEAVES}`);
  }

  // Generate salts for each item
  const item_salts = items.map(() => generateScalar());

  // Compute leaves
  const leaves: string[] = [];
  for (let i = 0; i < MAX_LEAVES; i++) {
    if (i < items.length) {
      leaves.push(computeLeaf(items[i], item_salts[i]));
    } else {
      leaves.push(ZERO_LEAF);
    }
  }

  // Level 1: hash pairs of leaves (0,1) and (2,3)
  const node_01 = hashPair(leaves[0], leaves[1]);
  const node_23 = hashPair(leaves[2], leaves[3]);

  // Root: hash of level-1 nodes
  const root = hashPair(node_01, node_23);

  // Build per-item proofs
  const proofs: MerkleItemProof[] = items.map((_, i) => {
    // Sibling at leaf level
    const sibling_0 = i % 2 === 0 ? leaves[i + 1] : leaves[i - 1];
    // Path bit at leaf level: false=left, true=right
    const path_bit_0 = i % 2 === 1;

    // Sibling at level 1
    const sibling_1 = i < 2 ? node_23 : node_01;
    // Path bit at level 1
    const path_bit_1 = i >= 2;

    return {
      sibling_0,
      sibling_1,
      path_bit_0,
      path_bit_1,
      leaf_index: i,
      item_salt: item_salts[i],
    };
  });

  return { root, leaves, items, item_salts, proofs };
}

/**
 * Format a MerkleItemProof as an Aleo struct input string.
 * Used when calling prove_cart_item transition.
 */
export function formatMerkleProofInput(proof: MerkleItemProof): string {
  return `{ sibling_0: ${proof.sibling_0}, sibling_1: ${proof.sibling_1}, path_bit_0: ${proof.path_bit_0}, path_bit_1: ${proof.path_bit_1} }`;
}

/**
 * Format a CartItem as an Aleo struct input string.
 */
export function formatCartItemInput(item: MerkleCartItem): string {
  return `{ product_id: ${item.product_id.endsWith('field') ? item.product_id : item.product_id + 'field'}, quantity: ${item.quantity}u64, price: ${item.price}u64 }`;
}

/**
 * Store Merkle tree data in localStorage (encrypted key per wallet address).
 * Buyer needs this later to prove individual items.
 */
export function storeMerkleTree(purchaseCommitment: string, treeData: MerkleTreeData, walletAddress: string): void {
  const key = `veil_merkle_${walletAddress}_${purchaseCommitment}`;
  const serialized = JSON.stringify(treeData);
  try {
    localStorage.setItem(key, serialized);
  } catch {
    console.warn('[Merkle] Failed to store tree data');
  }
}

/**
 * Retrieve stored Merkle tree data for a purchase.
 */
export function loadMerkleTree(purchaseCommitment: string, walletAddress: string): MerkleTreeData | null {
  const key = `veil_merkle_${walletAddress}_${purchaseCommitment}`;
  try {
    const data = localStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data) as MerkleTreeData;
  } catch {
    return null;
  }
}

/**
 * List all stored merkle tree keys for a wallet.
 */
export function listStoredPurchases(walletAddress: string): string[] {
  const prefix = `veil_merkle_${walletAddress}_`;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) {
      keys.push(key.replace(prefix, ''));
    }
  }
  return keys;
}
