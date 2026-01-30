// Merchant routes
// Handles merchant-specific operations

import { Router, Request, Response } from 'express';
import { requireAuth, requireMerchant } from '../middleware/auth';
import * as db from '../services/database';
import * as aleoService from '../services/aleo';
import { JWTPayload } from '../types';

const router = Router();

/**
 * GET /merchant/profile
 * Get current merchant profile
 */
router.get('/profile', requireAuth, requireMerchant, (req: Request, res: Response) => {
  const user = (req as any).user as JWTPayload;
  const merchant = db.getMerchantByAddress(user.address);
  
  if (!merchant) {
    res.status(404).json({ error: 'Merchant not found' });
    return;
  }
  
  res.json({ merchant });
});

/**
 * PUT /merchant/profile
 * Update merchant profile
 */
router.put('/profile', requireAuth, requireMerchant, (req: Request, res: Response) => {
  const user = (req as any).user as JWTPayload;
  const merchant = db.getMerchantByAddress(user.address);
  
  if (!merchant) {
    res.status(404).json({ error: 'Merchant not found' });
    return;
  }
  
  const { businessName } = req.body;
  
  if (businessName) {
    const updated = db.updateMerchant(merchant.id, { businessName });
    res.json({ merchant: updated });
    return;
  }
  
  res.json({ merchant });
});

/**
 * GET /merchant/products
 * Get all products for current merchant
 */
router.get('/products', requireAuth, requireMerchant, (req: Request, res: Response) => {
  const user = (req as any).user as JWTPayload;
  const products = db.getProductsByMerchantAddress(user.address);
  
  res.json({ products });
});

/**
 * GET /merchant/stats
 * Get merchant statistics (includes on-chain data)
 */
router.get('/stats', requireAuth, requireMerchant, async (req: Request, res: Response) => {
  const user = (req as any).user as JWTPayload;
  
  try {
    // Get off-chain stats from database
    const dbStats = db.getMerchantStats(user.address);
    
    // Get on-chain sales total
    const onChainSalesTotal = await aleoService.getMerchantSalesTotal(user.address);
    
    res.json({
      ...dbStats,
      onChainSalesTotal,
      address: user.address
    });
  } catch (error) {
    console.error('Error fetching merchant stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /merchant/receipts
 * Get all receipt metadata for merchant's sales
 */
router.get('/receipts', requireAuth, requireMerchant, (req: Request, res: Response) => {
  const user = (req as any).user as JWTPayload;
  const receipts = db.getReceiptMetasByMerchant(user.address);
  
  res.json({ receipts });
});

/**
 * GET /merchant/returns
 * Get all return requests for merchant
 */
router.get('/returns', requireAuth, requireMerchant, (req: Request, res: Response) => {
  const user = (req as any).user as JWTPayload;
  const returns = db.getReturnRequestsByMerchant(user.address);
  
  res.json({ returns });
});

/**
 * PUT /merchant/returns/:id
 * Update return request status (merchant can process/reject)
 */
router.put('/returns/:id', requireAuth, requireMerchant, (req: Request, res: Response) => {
  const user = (req as any).user as JWTPayload;
  const returnRequest = db.getReturnRequests().find(r => r.id === req.params.id);
  
  if (!returnRequest) {
    res.status(404).json({ error: 'Return request not found' });
    return;
  }
  
  // Verify merchant owns this return
  if (returnRequest.merchantAddress !== user.address) {
    res.status(403).json({ error: 'Not authorized' });
    return;
  }
  
  const { status } = req.body;
  
  if (!['processed', 'rejected'].includes(status)) {
    res.status(400).json({ error: 'Status must be "processed" or "rejected"' });
    return;
  }
  
  const updated = db.updateReturnRequest(returnRequest.id, {
    status,
    processedAt: new Date().toISOString()
  });
  
  res.json({ returnRequest: updated });
});

export default router;
