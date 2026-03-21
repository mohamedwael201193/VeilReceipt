// Events Routes — Server-Sent Events for real-time merchant notifications
// Merchants subscribe to their event stream for live payment updates.

import { Router, Request, Response } from 'express';
import { requireAuth, verifyToken } from '../middleware/auth';
import { hashAddress } from '../services/database';

const router = Router();

// Active SSE connections: merchantId -> Set of Response objects
const clients = new Map<string, Set<Response>>();

// Emit an event to all connected clients for a merchant
export function emitEvent(merchantId: string, event: string, data: Record<string, any>): void {
  const merchantClients = clients.get(merchantId);
  if (!merchantClients || merchantClients.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of merchantClients) {
    try {
      client.write(payload);
    } catch {
      merchantClients.delete(client);
    }
  }
}

// GET /events/stream — SSE endpoint for merchant real-time events
// Supports token via Authorization header OR query param (EventSource limitation)
router.get('/stream', (req: Request, res: Response) => {
  // Try header auth first, then query param
  let user = (req as any).user;
  if (!user) {
    const token = req.query.token as string;
    if (token) {
      user = verifyToken(token);
    }
  }
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const merchantId = hashAddress(user.address);

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({ merchantId, timestamp: Date.now() })}\n\n`);

  // Register client
  if (!clients.has(merchantId)) {
    clients.set(merchantId, new Set());
  }
  clients.get(merchantId)!.add(res);

  // Keep-alive ping every 30s
  const keepAlive = setInterval(() => {
    try {
      res.write(`: keepalive\n\n`);
    } catch {
      clearInterval(keepAlive);
    }
  }, 30000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(keepAlive);
    const set = clients.get(merchantId);
    if (set) {
      set.delete(res);
      if (set.size === 0) clients.delete(merchantId);
    }
  });
});

// GET /events/stats — Connection stats (admin info)
router.get('/stats', (_req: Request, res: Response) => {
  let totalConnections = 0;
  for (const set of clients.values()) {
    totalConnections += set.size;
  }
  res.json({
    active_merchants: clients.size,
    total_connections: totalConnections,
  });
});

export default router;
