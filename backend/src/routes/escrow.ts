// Escrow Routes — Record and query escrow lifecycle events

import { Router, Request, Response } from 'express';
import {
  createEscrow, resolveEscrow, getEscrowByCommitment,
  getEscrowsByBuyer, hashAddress
} from '../services/database';
import { getTransactionStatus } from '../services/aleo';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { CreateEscrowSchema, ResolveEscrowSchema } from '../types';

const router = Router();

// POST /escrow/deposit — Record new escrow deposit
router.post('/deposit', optionalAuth, async (req: Request, res: Response) => {
  try {
    const parsed = CreateEscrowSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid escrow data', details: parsed.error.issues });
    }
    const escrow = await createEscrow(parsed.data);
    res.status(201).json(escrow);
  } catch (err: any) {
    console.error('Create escrow error:', err.message);
    res.status(500).json({ error: 'Failed to store escrow' });
  }
});

// POST /escrow/resolve — Complete or refund an escrow
router.post('/resolve', optionalAuth, async (req: Request, res: Response) => {
  try {
    const parsed = ResolveEscrowSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid resolve data', details: parsed.error.issues });
    }
    await resolveEscrow(parsed.data.purchase_commitment, parsed.data.status, parsed.data.resolve_tx_id);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Resolve escrow error:', err.message);
    res.status(500).json({ error: 'Failed to resolve escrow' });
  }
});

// GET /escrow/my — List escrows for authenticated user
router.get('/my', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const addressHash = hashAddress(user.address);
    const escrows = await getEscrowsByBuyer(addressHash);
    res.json(escrows);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch escrows' });
  }
});

// GET /escrow/:commitment — Get escrow by purchase commitment + on-chain status
router.get('/:commitment', async (req: Request, res: Response) => {
  try {
    const escrow = await getEscrowByCommitment(req.params.commitment);
    if (!escrow) return res.status(404).json({ error: 'Escrow not found' });

    // Check on-chain status if TX ID available
    let onChainStatus = null;
    if (escrow.escrow_tx_id) {
      onChainStatus = await getTransactionStatus(escrow.escrow_tx_id);
    }

    res.json({ ...escrow, onChainStatus });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch escrow' });
  }
});

export default router;
