// Payment Link Routes — Create, query, fulfill, and close payment links

import { Router, Request, Response } from 'express';
import {
  createPaymentLink, getPaymentLink, getPaymentLinkByHash,
  getPaymentLinksByMerchant, closePaymentLink, recordLinkContribution,
  hashAddress, createReceipt
} from '../services/database';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { CreatePaymentLinkSchema, FulfillPaymentLinkSchema } from '../types';
import { emitEvent } from './events';

const router = Router();

// POST /links — Create a payment link (merchant only)
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'merchant') {
      return res.status(403).json({ error: 'Only merchants can create payment links' });
    }

    const parsed = CreatePaymentLinkSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payment link data', details: parsed.error.issues });
    }

    const merchantId = hashAddress(user.address);
    const link = await createPaymentLink({
      merchant_id: merchantId,
      merchant_address: user.address,
      link_hash: parsed.data.link_hash,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      link_type: parsed.data.link_type,
      label: parsed.data.label,
      description: parsed.data.description,
      tx_id: parsed.data.tx_id,
    });

    emitEvent(merchantId, 'link.created', { id: link.id, label: link.label, link_type: link.link_type });
    res.status(201).json(link);
  } catch (err: any) {
    console.error('Create payment link error:', err.message);
    res.status(500).json({ error: 'Failed to create payment link' });
  }
});

// GET /links — List merchant's payment links
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const merchantId = hashAddress(user.address);
    const links = await getPaymentLinksByMerchant(merchantId);
    res.json(links);
  } catch (err: any) {
    console.error('List payment links error:', err.message);
    res.status(500).json({ error: 'Failed to list payment links' });
  }
});

// GET /links/resolve/:hash — Public: resolve a link hash to link details (for payers)
router.get('/resolve/:hash', async (req: Request, res: Response) => {
  try {
    const link = await getPaymentLinkByHash(req.params.hash);
    if (!link) {
      return res.status(404).json({ error: 'Payment link not found' });
    }
    // Return only public fields — no merchant_id or internal data
    res.json({
      id: link.id,
      merchant_address: link.merchant_address,
      link_hash: link.link_hash,
      amount: link.amount,
      currency: link.currency,
      link_type: link.link_type,
      label: link.label,
      description: link.description,
      is_active: link.is_active,
      total_contributions: link.total_contributions,
    });
  } catch (err: any) {
    console.error('Resolve payment link error:', err.message);
    res.status(500).json({ error: 'Failed to resolve payment link' });
  }
});

// GET /links/:id — Get single payment link
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const link = await getPaymentLink(req.params.id);
    if (!link) {
      return res.status(404).json({ error: 'Payment link not found' });
    }
    res.json(link);
  } catch (err: any) {
    console.error('Get payment link error:', err.message);
    res.status(500).json({ error: 'Failed to get payment link' });
  }
});

// POST /links/:id/fulfill — Record a payment link fulfillment
router.post('/:id/fulfill', optionalAuth, async (req: Request, res: Response) => {
  try {
    const parsed = FulfillPaymentLinkSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid fulfillment data', details: parsed.error.issues });
    }

    const link = await getPaymentLink(parsed.data.link_id);
    if (!link || !link.is_active) {
      return res.status(404).json({ error: 'Payment link not found or inactive' });
    }

    // Record the receipt
    const receipt = await createReceipt({
      purchase_commitment: parsed.data.purchase_commitment,
      buyer_address_hash: parsed.data.buyer_address_hash,
      merchant_address_hash: hashAddress(link.merchant_address),
      total: parsed.data.amount,
      token_type: link.currency === 'credits' ? 0 : link.currency === 'usdcx' ? 1 : 2,
      cart_commitment: link.link_hash,
      tx_id: parsed.data.tx_id,
      status: parsed.data.payment_mode === 'escrow' ? 'escrowed' : 'confirmed',
      purchase_type: parsed.data.payment_mode === 'escrow' ? 'escrow' : 'private',
    });

    // Track contribution
    const updated = await recordLinkContribution(link.link_hash, parsed.data.amount);

    // Emit real-time event to merchant
    emitEvent(link.merchant_id, 'link.fulfilled', {
      link_id: link.id,
      label: link.label,
      amount: parsed.data.amount,
      contributions: updated?.total_contributions || 0,
    });

    res.status(201).json({ receipt, link: updated });
  } catch (err: any) {
    console.error('Fulfill payment link error:', err.message);
    res.status(500).json({ error: 'Failed to fulfill payment link' });
  }
});

// POST /links/:id/close — Close (deactivate) a payment link
router.post('/:id/close', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'merchant') {
      return res.status(403).json({ error: 'Only merchants can close payment links' });
    }
    const merchantId = hashAddress(user.address);
    const link = await closePaymentLink(req.params.id, merchantId);
    if (!link) {
      return res.status(404).json({ error: 'Payment link not found or already closed' });
    }

    emitEvent(merchantId, 'link.closed', { id: link.id, label: link.label });
    res.json(link);
  } catch (err: any) {
    console.error('Close payment link error:', err.message);
    res.status(500).json({ error: 'Failed to close payment link' });
  }
});

export default router;
