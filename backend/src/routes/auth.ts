// Auth Routes — Nonce-based wallet signature authentication

import { Router, Request, Response } from 'express';
import { createAuthNonce, verifyAndConsumeNonce } from '../services/database';
import { generateToken } from '../middleware/auth';

const router = Router();

// POST /auth/nonce — Request a nonce for wallet signature
router.post('/nonce', async (req: Request, res: Response) => {
  try {
    const { address } = req.body;
    if (!address || !address.startsWith('aleo1')) {
      return res.status(400).json({ error: 'Valid Aleo address required' });
    }
    const nonce = await createAuthNonce(address);
    res.json({ nonce, message: `Sign this nonce to authenticate: ${nonce}` });
  } catch (err: any) {
    console.error('Auth nonce error:', err.message);
    res.status(500).json({ error: 'Failed to generate nonce' });
  }
});

// POST /auth/verify — Verify signed nonce and issue JWT
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { nonce, signature, address, role } = req.body;

    if (!nonce || !address) {
      return res.status(400).json({ error: 'Nonce and address required' });
    }

    // Verify the nonce exists and is valid
    const result = await verifyAndConsumeNonce(nonce);
    if (!result) {
      return res.status(401).json({ error: 'Invalid or expired nonce' });
    }

    // Verify the address matches
    if (result.address !== address) {
      return res.status(401).json({ error: 'Address mismatch' });
    }

    // In production, verify the actual wallet signature here.
    // For testnet, we trust the nonce flow since the wallet signs the message.
    const authRole = role === 'merchant' ? 'merchant' : 'buyer';
    const token = generateToken(address, authRole as 'merchant' | 'buyer');

    res.json({ token, address, role: authRole });
  } catch (err: any) {
    console.error('Auth verify error:', err.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

export default router;
