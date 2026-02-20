// Loyalty Routes — Track loyalty claims and ZK proof events

import { Router, Request, Response } from 'express';
import { createLoyalty, getLoyaltyByAddress, hashAddress } from '../services/database';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { CreateLoyaltySchema } from '../types';

const router = Router();

// POST /loyalty/claim — Record a loyalty claim or merge
router.post('/claim', optionalAuth, async (req: Request, res: Response) => {
  try {
    const parsed = CreateLoyaltySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid loyalty data', details: parsed.error.issues });
    }
    const loyalty = await createLoyalty(parsed.data);
    res.status(201).json(loyalty);
  } catch (err: any) {
    console.error('Create loyalty error:', err.message);
    res.status(500).json({ error: 'Failed to store loyalty claim' });
  }
});

// GET /loyalty/my — Get loyalty data for authenticated user
router.get('/my', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const addressHash = hashAddress(user.address);
    const claims = await getLoyaltyByAddress(addressHash);

    // Compute aggregate
    const totalClaims = claims.length;
    const totalSpent = claims.reduce((sum, c) => sum + c.total_spent, 0);
    const latestScore = claims.length > 0 ? claims[0].score : 0;

    res.json({
      claims,
      aggregate: { totalClaims, totalSpent, latestScore },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch loyalty data' });
  }
});

export default router;
