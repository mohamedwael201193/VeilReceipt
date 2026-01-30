// Authentication routes
// Handles wallet-based authentication flow

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { generateNonce, verifyNonce, verifySignature, generateToken } from '../middleware/auth';
import * as db from '../services/database';
import { AleoAddress, Merchant } from '../types';

const router = Router();

/**
 * POST /auth/nonce
 * Get a nonce for wallet signature authentication
 */
router.post('/nonce', (req: Request, res: Response) => {
  const { address } = req.body;
  
  if (!address || !address.startsWith('aleo1')) {
    res.status(400).json({ error: 'Valid Aleo address required' });
    return;
  }
  
  const authNonce = generateNonce(address as AleoAddress);
  
  // Build message for wallet to sign
  const message = `Sign this message to authenticate with VeilReceipt.\n\nAddress: ${address}\nNonce: ${authNonce.nonce}\nTimestamp: ${authNonce.createdAt}`;
  
  res.json({
    nonce: authNonce.nonce,
    message,
    expiresAt: authNonce.expiresAt
  });
});

/**
 * POST /auth/verify
 * Verify wallet signature and issue JWT
 */
router.post('/verify', (req: Request, res: Response) => {
  const { address, nonce, signature, role = 'buyer' } = req.body;
  
  if (!address || !address.startsWith('aleo1')) {
    res.status(400).json({ error: 'Valid Aleo address required' });
    return;
  }
  
  if (!nonce || !signature) {
    res.status(400).json({ error: 'Nonce and signature required' });
    return;
  }
  
  if (!['merchant', 'buyer'].includes(role)) {
    res.status(400).json({ error: 'Role must be "merchant" or "buyer"' });
    return;
  }
  
  // Verify nonce
  if (!verifyNonce(address as AleoAddress, nonce)) {
    res.status(401).json({ error: 'Invalid or expired nonce' });
    return;
  }
  
  // Build expected message
  const stored = db.getAuthNonce(address);
  const message = `Sign this message to authenticate with VeilReceipt.\n\nAddress: ${address}\nNonce: ${nonce}\nTimestamp: ${stored?.createdAt || Date.now()}`;
  
  // Verify signature
  if (!verifySignature(message, signature, address as AleoAddress)) {
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }
  
  // For merchants, ensure they're registered or create new entry
  if (role === 'merchant') {
    let merchant = db.getMerchantByAddress(address);
    if (!merchant) {
      // Auto-register merchant on first auth
      merchant = db.createMerchant({
        id: uuidv4(),
        walletAddress: address as AleoAddress,
        businessName: `Merchant ${address.slice(0, 10)}...`,
        createdAt: new Date().toISOString()
      });
      console.log(`📝 New merchant registered: ${merchant.walletAddress}`);
    }
  }
  
  // Generate JWT
  const token = generateToken(address as AleoAddress, role as 'merchant' | 'buyer');
  
  res.json({
    token,
    address,
    role,
    expiresIn: '24h'
  });
});

/**
 * GET /auth/me
 * Get current authenticated user info
 */
router.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  
  const token = authHeader.slice(7);
  const jwt = require('jsonwebtoken');
  
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'change-me-in-production');
    
    // If merchant, include merchant details
    if (payload.role === 'merchant') {
      const merchant = db.getMerchantByAddress(payload.address);
      res.json({
        ...payload,
        merchant
      });
      return;
    }
    
    res.json(payload);
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
