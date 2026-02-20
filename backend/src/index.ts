// VeilReceipt v3 Backend Server
// Express API with PostgreSQL (production) / JSON file (development)

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import { initDatabase } from './services/database';
import { getTransactionStatus, getLatestBlockHeight } from './services/aleo';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import merchantRoutes from './routes/merchant';
import receiptsRoutes from './routes/receipts';
import escrowRoutes from './routes/escrow';
import loyaltyRoutes from './routes/loyalty';

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
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// API Info
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'VeilReceipt API',
    version: '3.0.0',
    program: 'veilreceipt_v3.aleo',
    description: 'Privacy-first commerce protocol — atomic payments, escrow refund, ZK loyalty',
    endpoints: {
      auth: '/auth',
      products: '/products',
      merchant: '/merchant',
      receipts: '/receipts',
      escrow: '/escrow',
      loyalty: '/loyalty',
      tx: '/tx/:txId/status',
    },
  });
});

// Routes
app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/merchant', merchantRoutes);
app.use('/receipts', receiptsRoutes);
app.use('/escrow', escrowRoutes);
app.use('/loyalty', loyaltyRoutes);

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
  ║     VeilReceipt v3 Backend                       ║
  ║     Port: ${String(PORT).padEnd(10)}                          ║
  ║     Program: veilreceipt_v3.aleo                 ║
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
