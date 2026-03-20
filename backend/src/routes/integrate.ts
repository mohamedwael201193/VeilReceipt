// Integration API Routes — API keys, webhooks, payment sessions
// This is the merchant-facing integration layer for e-commerce platforms

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth';
import { requireApiKey, requirePermission, generateApiKey, hashApiKey } from '../middleware/apiKey';
import {
  createApiKey, getApiKeysByMerchant, revokeApiKey,
  createWebhook, getWebhooksByMerchant, deleteWebhook,
  createPaymentSession, getPaymentSession, completePaymentSession,
  getPaymentSessionsByMerchant,
  hashAddress, getMerchantByAddressHash,
  createReceipt,
} from '../services/database';
import { notifyPaymentConfirmed } from '../services/webhooks';
import {
  CreateApiKeySchema, CreateWebhookSchema, CreatePaymentSessionSchema,
} from '../types';

const router = Router();

// ═══════════════════════════════════════════
// API Key Management (requires JWT auth)
// ═══════════════════════════════════════════

// POST /integrate/keys — Create new API key
router.post('/keys', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const addressHash = hashAddress(user.address);
    const merchant = await getMerchantByAddressHash(addressHash);
    if (!merchant) {
      return res.status(400).json({ error: 'Register as merchant first (POST /merchant/register)' });
    }

    const parsed = CreateApiKeySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
    }

    // Limit to 5 active keys per merchant
    const existing = await getApiKeysByMerchant(merchant.id);
    if (existing.filter(k => k.is_active).length >= 5) {
      return res.status(400).json({ error: 'Maximum 5 active API keys per merchant' });
    }

    const { key, hash, prefix } = generateApiKey();
    const record = await createApiKey({
      merchant_id: merchant.id,
      api_key_hash: hash,
      api_key_prefix: prefix,
      label: parsed.data.label,
      permissions: parsed.data.permissions,
    });

    // Return the raw key ONCE — it cannot be retrieved again
    res.status(201).json({
      id: record.id,
      key,  // ← Only time the raw key is visible
      prefix: record.api_key_prefix,
      label: record.label,
      permissions: record.permissions,
      created_at: record.created_at,
      warning: 'Save this key now. It cannot be retrieved again.',
    });
  } catch (err: any) {
    console.error('Create API key error:', err.message);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// GET /integrate/keys — List API keys (masked)
router.get('/keys', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const addressHash = hashAddress(user.address);
    const merchant = await getMerchantByAddressHash(addressHash);
    if (!merchant) {
      return res.status(400).json({ error: 'Not a registered merchant' });
    }

    const keys = await getApiKeysByMerchant(merchant.id);
    res.json({
      keys: keys.map(k => ({
        id: k.id,
        prefix: k.api_key_prefix,
        label: k.label,
        permissions: k.permissions,
        is_active: k.is_active,
        last_used_at: k.last_used_at,
        created_at: k.created_at,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list API keys' });
  }
});

// DELETE /integrate/keys/:id — Revoke API key
router.delete('/keys/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const addressHash = hashAddress(user.address);
    const merchant = await getMerchantByAddressHash(addressHash);
    if (!merchant) {
      return res.status(400).json({ error: 'Not a registered merchant' });
    }

    const revoked = await revokeApiKey(req.params.id, merchant.id);
    if (!revoked) {
      return res.status(404).json({ error: 'API key not found' });
    }
    res.json({ success: true, message: 'API key revoked' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

// ═══════════════════════════════════════════
// Webhook Management (requires JWT auth)
// ═══════════════════════════════════════════

// POST /integrate/webhooks — Register webhook endpoint
router.post('/webhooks', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const addressHash = hashAddress(user.address);
    const merchant = await getMerchantByAddressHash(addressHash);
    if (!merchant) {
      return res.status(400).json({ error: 'Not a registered merchant' });
    }

    const parsed = CreateWebhookSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
    }

    // Limit to 3 webhooks per merchant
    const existing = await getWebhooksByMerchant(merchant.id);
    if (existing.length >= 3) {
      return res.status(400).json({ error: 'Maximum 3 webhook endpoints per merchant' });
    }

    // Generate a signing secret for this webhook
    const signingSecret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
    const secretHash = crypto.createHash('sha256').update(signingSecret).digest('hex');

    const webhook = await createWebhook({
      merchant_id: merchant.id,
      url: parsed.data.url,
      secret_hash: secretHash,
      events: parsed.data.events,
    });

    res.status(201).json({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      signing_secret: signingSecret,  // ← Only time visible
      is_active: true,
      created_at: webhook.created_at,
      warning: 'Save the signing_secret now. It cannot be retrieved again.',
    });
  } catch (err: any) {
    console.error('Create webhook error:', err.message);
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

// GET /integrate/webhooks — List webhooks
router.get('/webhooks', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const addressHash = hashAddress(user.address);
    const merchant = await getMerchantByAddressHash(addressHash);
    if (!merchant) {
      return res.status(400).json({ error: 'Not a registered merchant' });
    }

    const webhooks = await getWebhooksByMerchant(merchant.id);
    res.json({
      webhooks: webhooks.map(w => ({
        id: w.id,
        url: w.url,
        events: w.events,
        is_active: w.is_active,
        failure_count: w.failure_count,
        last_triggered_at: w.last_triggered_at,
        created_at: w.created_at,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list webhooks' });
  }
});

// DELETE /integrate/webhooks/:id — Remove webhook
router.delete('/webhooks/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const addressHash = hashAddress(user.address);
    const merchant = await getMerchantByAddressHash(addressHash);
    if (!merchant) {
      return res.status(400).json({ error: 'Not a registered merchant' });
    }

    const deleted = await deleteWebhook(req.params.id, merchant.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    res.json({ success: true, message: 'Webhook removed' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to remove webhook' });
  }
});

// ═══════════════════════════════════════════
// Payment Sessions (requires API key)
// ═══════════════════════════════════════════

// POST /integrate/payments — Create a payment session
// This is what Shopify/WooCommerce calls when a customer clicks "Pay with Aleo"
router.post('/payments', requireApiKey, requirePermission('payments'), async (req: Request, res: Response) => {
  try {
    const merchant = (req as any).merchant;

    const parsed = CreatePaymentSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
    }

    // Session expires in 30 minutes
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const session = await createPaymentSession({
      merchant_id: merchant.id,
      merchant_address: '', // Will be resolved from merchant registration
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      description: parsed.data.description,
      metadata: parsed.data.metadata,
      redirect_url: parsed.data.redirect_url || null,
      cancel_url: parsed.data.cancel_url || null,
      expires_at: expiresAt,
    });

    res.status(201).json({
      id: session.id,
      amount: session.amount,
      currency: session.currency,
      description: session.description,
      status: session.status,
      // The URL the merchant should redirect the customer to
      checkout_url: `${process.env.FRONTEND_URL || 'https://veil-receipt.vercel.app'}/pay/${session.id}`,
      expires_at: session.expires_at,
      created_at: session.created_at,
    });
  } catch (err: any) {
    console.error('Create payment session error:', err.message);
    res.status(500).json({ error: 'Failed to create payment session' });
  }
});

// GET /integrate/payments/:id — Get payment session status
// Can be called with API key OR without auth (for the checkout widget)
router.get('/payments/:id', async (req: Request, res: Response) => {
  try {
    const session = await getPaymentSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Payment session not found' });
    }

    res.json({
      id: session.id,
      amount: session.amount,
      currency: session.currency,
      description: session.description,
      status: session.status,
      merchant_address: session.merchant_address,
      payment_mode: session.payment_mode,
      tx_id: session.tx_id,
      redirect_url: session.redirect_url,
      cancel_url: session.cancel_url,
      expires_at: session.expires_at,
      metadata: session.status === 'completed' ? session.metadata : undefined,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch payment session' });
  }
});

// POST /integrate/payments/:id/complete — Mark payment as completed (called by checkout widget)
router.post('/payments/:id/complete', async (req: Request, res: Response) => {
  try {
    const { purchase_commitment, tx_id, payment_mode, buyer_address } = req.body;

    if (!purchase_commitment || !tx_id || !payment_mode) {
      return res.status(400).json({ error: 'Missing purchase_commitment, tx_id, or payment_mode' });
    }

    const session = await getPaymentSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Payment session not found' });
    }
    if (session.status !== 'pending') {
      return res.status(400).json({ error: `Session already ${session.status}` });
    }
    if (new Date(session.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Session expired' });
    }

    const completed = await completePaymentSession(req.params.id, {
      purchase_commitment,
      tx_id,
      payment_mode,
    });

    if (!completed) {
      return res.status(400).json({ error: 'Failed to complete session' });
    }

    // Store the receipt
    const buyerHash = buyer_address ? hashAddress(buyer_address) : '';
    const merchantHash = hashAddress(session.merchant_address);
    await createReceipt({
      purchase_commitment,
      buyer_address_hash: buyerHash,
      merchant_address_hash: merchantHash,
      total: session.amount,
      token_type: session.currency === 'credits' ? 0 : session.currency === 'usdcx' ? 1 : 2,
      cart_commitment: '',
      tx_id,
      status: payment_mode === 'escrow' ? 'escrowed' : 'confirmed',
      purchase_type: payment_mode as any,
    });

    // Fire webhooks
    notifyPaymentConfirmed(merchantHash, {
      purchase_commitment,
      tx_id,
      amount: session.amount,
      token_type: session.currency === 'credits' ? 0 : session.currency === 'usdcx' ? 1 : 2,
      payment_mode,
      session_id: session.id,
    }).catch(err => console.error('Webhook dispatch error:', err));

    res.json({
      success: true,
      session_id: session.id,
      status: 'completed',
      redirect_url: session.redirect_url,
    });
  } catch (err: any) {
    console.error('Complete payment error:', err.message);
    res.status(500).json({ error: 'Failed to complete payment' });
  }
});

// GET /integrate/payments — List payment sessions for merchant (requires API key)
router.get('/payments', requireApiKey, requirePermission('payments'), async (req: Request, res: Response) => {
  try {
    const merchant = (req as any).merchant;
    const sessions = await getPaymentSessionsByMerchant(merchant.id);
    res.json({
      sessions: sessions.map(s => ({
        id: s.id,
        amount: s.amount,
        currency: s.currency,
        description: s.description,
        status: s.status,
        tx_id: s.tx_id,
        payment_mode: s.payment_mode,
        metadata: s.metadata,
        created_at: s.created_at,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list payments' });
  }
});

// ═══════════════════════════════════════════
// Payment Verification (public)
// ═══════════════════════════════════════════

// GET /integrate/verify/:commitment — Verify a purchase on-chain
router.get('/verify/:commitment', async (req: Request, res: Response) => {
  try {
    const { commitment } = req.params;
    const { getMappingValue } = await import('../services/aleo');
    const { getReceiptByCommitment } = await import('../services/database');

    // Check on-chain
    const onChainExists = await getMappingValue('purchase_exists', commitment);
    const receipt = await getReceiptByCommitment(commitment);

    res.json({
      commitment,
      on_chain_verified: onChainExists === 'true',
      receipt: receipt ? {
        total: receipt.total,
        token_type: receipt.token_type,
        status: receipt.status,
        tx_id: receipt.tx_id,
        created_at: receipt.created_at,
      } : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to verify purchase' });
  }
});

export default router;
