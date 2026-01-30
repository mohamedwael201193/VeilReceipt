// Receipts API Routes
// Store and retrieve receipt metadata (off-chain cache for on-chain records)

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, optionalAuth } from '../middleware/auth';
import * as db from '../services/database';
import { JWTPayload } from '../types';

const router = Router();

// Extend Request to include user with proper typing
interface AuthRequest extends Request {
  user?: JWTPayload;
  body: any;
  params: any;
}

// Store receipt metadata after a purchase transaction
// POST /receipts
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      txId, 
      onChainTxId,
      merchantAddress, 
      buyerAddress, 
      total, 
      cartCommitment, 
      timestamp,
      blockHeight,
      items 
    } = req.body;

    // Validate required fields
    if (!txId || !merchantAddress || !buyerAddress || !total) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if already exists
    const existing = db.getReceiptMetaByTxId(txId);
    if (existing) {
      return res.status(200).json({ receipt: existing, message: 'Receipt already exists' });
    }

    const receiptMeta = {
      id: uuidv4(),
      txId,
      onChainTxId: onChainTxId || null,
      merchantAddress,
      buyerAddress,
      totalAmount: Number(total),
      itemCount: items?.length || 1,
      cartCommitment: cartCommitment || '',
      timestamp: timestamp || Date.now(),
      blockHeight: blockHeight || null,
      items: items || [],
      status: 'confirmed' as const,
      createdAt: new Date().toISOString(),
    };

    const saved = db.createReceiptMeta(receiptMeta as any);
    console.log(`📄 Receipt stored: ${saved.id} for buyer ${buyerAddress}`);

    res.status(201).json({ receipt: saved });
  } catch (error) {
    console.error('Error storing receipt:', error);
    res.status(500).json({ error: 'Failed to store receipt' });
  }
});

// Get receipts for authenticated buyer
// GET /receipts
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userAddress = req.user?.address;
    
    if (!userAddress) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const receipts = db.getReceiptMetasByBuyer(userAddress);
    
    res.json({ 
      receipts,
      count: receipts.length 
    });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
});

// Get receipts by buyer address (public endpoint for network queries)
// GET /receipts/buyer/:address
router.get('/buyer/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    if (!address || !address.startsWith('aleo1')) {
      return res.status(400).json({ error: 'Invalid address' });
    }

    const receipts = db.getReceiptMetasByBuyer(address);
    
    res.json({ 
      receipts,
      count: receipts.length 
    });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
});

// Get receipts for merchant
// GET /receipts/merchant/:address
router.get('/merchant/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    if (!address || !address.startsWith('aleo1')) {
      return res.status(400).json({ error: 'Invalid address' });
    }

    const receipts = db.getReceiptMetasByMerchant(address);
    
    res.json({ 
      receipts,
      count: receipts.length 
    });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
});

// Get specific receipt by transaction ID
// GET /receipts/tx/:txId
router.get('/tx/:txId', async (req: Request, res: Response) => {
  try {
    const { txId } = req.params;
    
    const receipt = db.getReceiptMetaByTxId(txId);
    
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    res.json({ receipt });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({ error: 'Failed to fetch receipt' });
  }
});

// Update receipt with on-chain transaction ID
// PATCH /receipts/:id
router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { onChainTxId, blockHeight, status } = req.body;
    
    const db_data = require('../services/database');
    const receipts = db_data.getReceiptMetas();
    const index = receipts.findIndex((r: any) => r.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // Update fields
    if (onChainTxId) receipts[index].onChainTxId = onChainTxId;
    if (blockHeight) receipts[index].blockHeight = blockHeight;
    if (status) receipts[index].status = status;
    
    res.json({ receipt: receipts[index] });
  } catch (error) {
    console.error('Error updating receipt:', error);
    res.status(500).json({ error: 'Failed to update receipt' });
  }
});

export default router;
