// Merchant Routes — Dashboard analytics and merchant management

import { Router, Request, Response } from 'express';
import {
  getOrCreateMerchant, getReceiptsByMerchant,
  getProducts, hashAddress
} from '../services/database';
import { requireAuth } from '../middleware/auth';

const router = Router();

// POST /merchant/register — Register as a merchant
router.post('/register', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { name, category } = req.body;
    if (!name) return res.status(400).json({ error: 'Business name required' });

    const merchant = await getOrCreateMerchant(user.address, name, category || 'general');
    res.json(merchant);
  } catch (err: any) {
    console.error('Register merchant error:', err.message);
    res.status(500).json({ error: 'Failed to register merchant' });
  }
});

// GET /merchant/dashboard — Merchant analytics
router.get('/dashboard', requireAuth, dashboardHandler);
// GET /merchant/stats — alias for dashboard
router.get('/stats', requireAuth, dashboardHandler);

async function dashboardHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const addressHash = hashAddress(user.address);

    const [receipts, products] = await Promise.all([
      getReceiptsByMerchant(addressHash),
      getProducts(user.address),
    ]);

    const totalRevenue = receipts.reduce((sum, r) => sum + r.total, 0);
    const totalReceipts = receipts.length;
    const activeEscrows = receipts.filter(r => r.status === 'escrowed').length;

    // Sales breakdown by purchase_type (if stored) else fallback to status
    const privateSales = receipts.filter(r => r.purchase_type === 'private' || (!r.purchase_type && r.status === 'confirmed')).length;
    const publicSales = receipts.filter(r => r.purchase_type === 'public').length;
    const escrowSales = receipts.filter(r => r.purchase_type === 'escrow' || r.status === 'escrowed' || r.status === 'completed').length;
    const refunds = receipts.filter(r => r.status === 'refunded').length;

    res.json({
      totalRevenue,
      totalReceipts,
      activeEscrows,
      privateSales,
      publicSales,
      escrowSales,
      refunds,
      productCount: products.length,
      recentReceipts: receipts.slice(0, 20),
      products,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
}

export default router;
