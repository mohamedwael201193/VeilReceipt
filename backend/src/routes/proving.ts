// Proving Routes — Delegated Proving Service proxy + gas sponsorship
// Proxies ZK proof generation to Provable's TEE-based DPS for faster proof times.
// Also provides gas sponsorship for payment link fulfillments.

import { Router, Request, Response } from 'express';
import { optionalAuth } from '../middleware/auth';
import { ALEO_RPC, NETWORK, PROGRAM_ID } from '../services/aleo';

const router = Router();

const DPS_ENDPOINT = process.env.DPS_ENDPOINT || 'https://dps.provable.com/v1';
const DPS_API_KEY = process.env.DPS_API_KEY || '';
const SPONSOR_PRIVATE_KEY = process.env.SPONSOR_PRIVATE_KEY || '';

// POST /proving/delegate — Submit a transition for delegated proving
router.post('/delegate', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { transition, inputs, fee_record } = req.body;
    if (!transition || !inputs || !Array.isArray(inputs)) {
      return res.status(400).json({ error: 'Missing transition name or inputs array' });
    }

    if (!DPS_API_KEY) {
      return res.status(503).json({
        error: 'Delegated proving not configured',
        fallback: 'local',
      });
    }

    const dpsRes = await fetch(`${DPS_ENDPOINT}/prove`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DPS_API_KEY}`,
      },
      body: JSON.stringify({
        program_id: PROGRAM_ID,
        function_name: transition,
        inputs: inputs,
        network: NETWORK,
        fee_record: fee_record || undefined,
      }),
    });

    if (!dpsRes.ok) {
      const errText = await dpsRes.text();
      console.error('DPS prove error:', dpsRes.status, errText);
      return res.status(502).json({
        error: 'Delegated proving failed',
        fallback: 'local',
        details: errText,
      });
    }

    const result = await dpsRes.json();
    res.json(result);
  } catch (err: any) {
    console.error('Proving delegate error:', err.message);
    res.status(500).json({ error: 'Proving service error', fallback: 'local' });
  }
});

// GET /proving/status/:id — Check status of delegated proof
router.get('/status/:id', async (req: Request, res: Response) => {
  try {
    if (!DPS_API_KEY) {
      return res.status(503).json({ error: 'Delegated proving not configured' });
    }

    const dpsRes = await fetch(`${DPS_ENDPOINT}/status/${encodeURIComponent(req.params.id)}`, {
      headers: { 'Authorization': `Bearer ${DPS_API_KEY}` },
    });

    if (!dpsRes.ok) {
      return res.status(dpsRes.status).json({ error: 'Failed to check proof status' });
    }

    const result = await dpsRes.json();
    res.json(result);
  } catch (err: any) {
    console.error('Proving status error:', err.message);
    res.status(500).json({ error: 'Failed to check proof status' });
  }
});

// GET /proving/health — Check if DPS is available
router.get('/health', async (_req: Request, res: Response) => {
  res.json({
    dps_configured: !!DPS_API_KEY,
    sponsor_configured: !!SPONSOR_PRIVATE_KEY,
    program_id: PROGRAM_ID,
    network: NETWORK,
  });
});

export default router;
