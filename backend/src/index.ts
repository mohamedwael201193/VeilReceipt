// VeilReceipt v4 Backend Server
// Express API with PostgreSQL (production) / JSON file (development)

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import { initDatabase } from './services/database';
import { getTransactionStatus, getLatestBlockHeight, getMappingValue } from './services/aleo';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import merchantRoutes from './routes/merchant';
import receiptsRoutes from './routes/receipts';
import escrowRoutes from './routes/escrow';
import integrateRoutes from './routes/integrate';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    version: '5.0.0',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// API Info
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'VeilReceipt API',
    version: '5.0.0',
    program: 'veilreceipt_v7.aleo',
    description: 'Privacy-first commerce protocol — atomic payments, escrow, Merkle proofs, e-commerce integration',
    endpoints: {
      auth: '/auth',
      products: '/products',
      merchant: '/merchant',
      receipts: '/receipts',
      escrow: '/escrow',
      integrate: '/integrate',
      tx: '/tx/:txId/status',
    },
    integration: {
      description: 'E-commerce platform integration API — API keys, webhooks, payment sessions',
      docs: '/integrate/docs',
      endpoints: {
        'POST /integrate/keys': 'Create API key (requires JWT)',
        'GET /integrate/keys': 'List API keys (requires JWT)',
        'DELETE /integrate/keys/:id': 'Revoke API key (requires JWT)',
        'POST /integrate/webhooks': 'Register webhook endpoint (requires JWT)',
        'GET /integrate/webhooks': 'List webhooks (requires JWT)',
        'DELETE /integrate/webhooks/:id': 'Remove webhook (requires JWT)',
        'POST /integrate/payments': 'Create payment session (requires API key)',
        'GET /integrate/payments/:id': 'Get payment status (public)',
        'POST /integrate/payments/:id/complete': 'Complete payment (from checkout widget)',
        'GET /integrate/payments': 'List payments (requires API key)',
        'GET /integrate/verify/:commitment': 'Verify purchase on-chain (public)',
      },
    },
  });
});

// Routes
app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/merchant', merchantRoutes);
app.use('/receipts', receiptsRoutes);
app.use('/escrow', escrowRoutes);
app.use('/integrate', integrateRoutes);

// Transaction status endpoint (cached on-chain lookup)
app.get('/tx/:txId/status', async (req: Request, res: Response) => {
  try {
    const { txId } = req.params;
    const result = await getTransactionStatus(txId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to check transaction status' });
  }
});

// Block height endpoint
app.get('/chain/height', async (_req: Request, res: Response) => {
  try {
    const height = await getLatestBlockHeight();
    res.json({ height });
  } catch {
    res.status(500).json({ error: 'Failed to fetch block height' });
  }
});

// On-chain mapping value endpoint
app.get('/chain/mapping/:name/:key', async (req: Request, res: Response) => {
  try {
    const { name, key } = req.params;
    // Only allow reading from known safe mappings
    const allowedMappings = ['purchase_exists', 'review_count', 'review_submitted', 'merchant_active', 'escrow_active'];
    if (!allowedMappings.includes(name)) {
      res.status(400).json({ error: 'Invalid mapping name' });
      return;
    }
    const value = await getMappingValue(name, key);
    res.json({ mapping: name, key, value });
  } catch {
    res.status(500).json({ error: 'Failed to read mapping' });
  }
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
async function start() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`
  ╔══════════════════════════════════════════════════╗
  ║     VeilReceipt v4 Backend                       ║
  ║     Port: ${String(PORT).padEnd(10)}                          ║
  ║     Program: veilreceipt_v7.aleo                 ║
  ╚══════════════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

export default app;
