// Receipt Routes — Store and query purchase receipt metadata

import { Router, Request, Response } from 'express';
import {
  createReceipt, getReceiptsByBuyer, getReceiptByCommitment,
  getReceiptsByMerchant, hashAddress
} from '../services/database';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { CreateReceiptSchema } from '../types';

const router = Router();

// POST /receipts — Store receipt metadata after on-chain purchase
// Accepts both formats:
//   Backend-native: { purchase_commitment, buyer_address_hash, merchant_address_hash, total, token_type, cart_commitment, tx_id }
//   Frontend-friendly: { txId, merchantAddress, buyerAddress, total, tokenType, cartCommitment, timestamp }
router.post('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const body = req.body;

    // Normalize frontend fields → backend schema
    const normalized = {
      purchase_commitment: body.purchase_commitment || body.cartCommitment || body.cart_commitment || `purchase_${Date.now()}`,
      buyer_address_hash: body.buyer_address_hash || (body.buyerAddress ? hashAddress(body.buyerAddress) : ''),
      merchant_address_hash: body.merchant_address_hash || (body.merchantAddress ? hashAddress(body.merchantAddress) : ''),
      total: body.total ?? 0,
      token_type: body.token_type ?? (body.tokenType === 'usdcx' ? 1 : 0),
      cart_commitment: body.cart_commitment || body.cartCommitment || '0field',
      tx_id: body.tx_id || body.txId || '',
      status: body.status || 'confirmed',
      purchase_type: body.purchase_type || body.purchaseType || undefined,
    };

    const parsed = CreateReceiptSchema.safeParse(normalized);
    if (!parsed.success) {
      console.error('Receipt validation failed:', normalized, parsed.error.issues);
      return res.status(400).json({ error: 'Invalid receipt data', details: parsed.error.issues });
    }
    const receipt = await createReceipt(parsed.data);
    res.status(201).json(receipt);
  } catch (err: any) {
    console.error('Create receipt error:', err.message);
    res.status(500).json({ error: 'Failed to store receipt' });
  }
});

// GET /receipts — List receipts for authenticated user
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const addressHash = hashAddress(user.address);
    const role = req.query.role as string || user.role;

    const receipts = role === 'merchant'
      ? await getReceiptsByMerchant(addressHash)
      : await getReceiptsByBuyer(addressHash);

    res.json(receipts);
  } catch (err: any) {
    console.error('Get receipts error:', err.message);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
});

// GET /receipts/:commitment — Get receipt by purchase commitment
router.get('/:commitment', async (req: Request, res: Response) => {
  try {
    const receipt = await getReceiptByCommitment(req.params.commitment);
    if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
    res.json(receipt);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch receipt' });
  }
});

export default router;
