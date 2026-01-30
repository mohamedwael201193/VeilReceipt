// Transaction events routes
// Records transaction metadata after blockchain operations

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, optionalAuth } from '../middleware/auth';
import * as db from '../services/database';
import * as aleoService from '../services/aleo';
import { 
  JWTPayload, 
  RecordTxEventRequest,
  ReceiptMeta,
  ReturnRequest,
  LoyaltyClaim,
  AleoTransactionId,
  AleoAddress,
  AleoField
} from '../types';

const router = Router();

/**
 * POST /events/tx
 * Record a transaction event (purchase, return, loyalty)
 */
router.post('/tx', optionalAuth, async (req: Request, res: Response) => {
  const body = req.body as RecordTxEventRequest;
  
  // Validate required fields
  if (!body.txId || !body.type) {
    res.status(400).json({ error: 'txId and type are required' });
    return;
  }
  
  if (!['purchase', 'return', 'loyalty'].includes(body.type)) {
    res.status(400).json({ error: 'type must be purchase, return, or loyalty' });
    return;
  }
  
  // Check if tx already recorded
  const existingReceipt = db.getReceiptMetaByTxId(body.txId);
  const existingReturn = db.getReturnRequestByTxId(body.txId);
  if (existingReceipt || existingReturn) {
    res.status(409).json({ error: 'Transaction already recorded' });
    return;
  }
  
  const now = new Date().toISOString();
  
  try {
    switch (body.type) {
      case 'purchase': {
        if (!body.merchantAddress || !body.buyerAddress || !body.cartCommitment || body.totalAmount === undefined) {
          res.status(400).json({ 
            error: 'Purchase requires merchantAddress, buyerAddress, cartCommitment, and totalAmount' 
          });
          return;
        }
        
        const receiptMeta: ReceiptMeta = {
          id: uuidv4(),
          txId: body.txId,
          merchantAddress: body.merchantAddress,
          buyerAddress: body.buyerAddress,
          cartCommitment: body.cartCommitment,
          totalAmount: body.totalAmount,
          itemCount: body.itemCount || 0,
          createdAt: now
        };
        
        const created = db.createReceiptMeta(receiptMeta);
        console.log(`🧾 Purchase recorded: ${body.txId}`);
        
        res.status(201).json({ 
          success: true, 
          type: 'purchase',
          data: created 
        });
        return;
      }
      
      case 'return': {
        if (!body.nullifier || !body.merchantAddress || !body.buyerAddress) {
          res.status(400).json({ 
            error: 'Return requires nullifier, merchantAddress, and buyerAddress' 
          });
          return;
        }
        
        // Check if nullifier already used (off-chain check)
        const existingByNullifier = db.getReturnRequestByNullifier(body.nullifier);
        if (existingByNullifier) {
          res.status(409).json({ error: 'Return with this nullifier already exists' });
          return;
        }
        
        const returnRequest: ReturnRequest = {
          id: uuidv4(),
          txId: body.txId,
          nullifier: body.nullifier,
          originalReceiptTxId: body.txId, // Would need to be passed separately for linking
          buyerAddress: body.buyerAddress,
          merchantAddress: body.merchantAddress,
          reason: body.reason || '',
          status: 'pending',
          refundAmount: body.totalAmount || 0,
          createdAt: now
        };
        
        const created = db.createReturnRequest(returnRequest);
        console.log(`↩️ Return recorded: ${body.txId}`);
        
        res.status(201).json({ 
          success: true, 
          type: 'return',
          data: created 
        });
        return;
      }
      
      case 'loyalty': {
        if (!body.nullifier || !body.buyerAddress || body.tier === undefined) {
          res.status(400).json({ 
            error: 'Loyalty requires nullifier, buyerAddress, and tier' 
          });
          return;
        }
        
        // Check if nullifier already used
        const existingByNullifier = db.getLoyaltyClaimByNullifier(body.nullifier);
        if (existingByNullifier) {
          res.status(409).json({ error: 'Loyalty with this nullifier already exists' });
          return;
        }
        
        const loyaltyClaim: LoyaltyClaim = {
          id: uuidv4(),
          txId: body.txId,
          nullifier: body.nullifier,
          buyerAddress: body.buyerAddress,
          tier: body.tier,
          createdAt: now
        };
        
        const created = db.createLoyaltyClaim(loyaltyClaim);
        console.log(`⭐ Loyalty claimed: ${body.txId} - Tier ${body.tier}`);
        
        res.status(201).json({ 
          success: true, 
          type: 'loyalty',
          data: created 
        });
        return;
      }
    }
  } catch (error) {
    console.error('Error recording transaction event:', error);
    res.status(500).json({ error: 'Failed to record transaction' });
  }
});

/**
 * GET /events/tx/:txId
 * Get transaction status and metadata
 */
router.get('/tx/:txId', async (req: Request, res: Response) => {
  const { txId } = req.params;
  
  // Check our database first
  const receiptMeta = db.getReceiptMetaByTxId(txId);
  const returnRequest = db.getReturnRequestByTxId(txId);
  const loyaltyClaim = db.getLoyaltyClaims().find(l => l.txId === txId);
  
  // Check on-chain confirmation
  const confirmed = await aleoService.isTransactionConfirmed(txId);
  
  res.json({
    txId,
    confirmed,
    receiptMeta,
    returnRequest,
    loyaltyClaim
  });
});

/**
 * POST /events/tx/:txId/confirm
 * Wait for transaction confirmation
 */
router.post('/tx/:txId/confirm', async (req: Request, res: Response) => {
  const { txId } = req.params;
  const { timeout = 120000 } = req.body;
  
  try {
    const confirmed = await aleoService.waitForTransactionConfirmation(
      txId,
      Math.min(timeout, 300000) // Max 5 minutes
    );
    
    res.json({ txId, confirmed });
  } catch (error) {
    console.error('Error waiting for confirmation:', error);
    res.status(500).json({ error: 'Confirmation check failed' });
  }
});

/**
 * GET /events/receipts
 * Get receipt metadata for authenticated user
 */
router.get('/receipts', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as JWTPayload;
  const receipts = db.getReceiptMetasByBuyer(user.address);
  
  res.json({ receipts });
});

/**
 * GET /events/returns
 * Get return requests for authenticated user
 */
router.get('/returns', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as JWTPayload;
  const returns = db.getReturnRequestsByBuyer(user.address);
  
  res.json({ returns });
});

/**
 * GET /events/loyalty
 * Get loyalty claims for authenticated user
 */
router.get('/loyalty', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as JWTPayload;
  const claims = db.getLoyaltyClaimsByBuyer(user.address);
  
  res.json({ claims });
});

export default router;
