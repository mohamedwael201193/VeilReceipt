// VeilReceipt Backend Server
// Express API with JSON file storage

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import merchantRoutes from './routes/merchant';
import eventsRoutes from './routes/events';
import receiptsRoutes from './routes/receipts';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// API Info
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'VeilReceipt API',
    version: '1.0.0',
    description: 'Privacy-first commerce backend',
    endpoints: {
      auth: '/auth',
      products: '/products',
      merchant: '/merchant',
      events: '/events'
    }
  });
});

// Routes
app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/merchant', merchantRoutes);
app.use('/events', eventsRoutes);
app.use('/receipts', receiptsRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║                                                  ║
║     🛡️  VeilReceipt Backend Server              ║
║                                                  ║
║     Port: ${PORT}                                 ║
║     Environment: ${(process.env.NODE_ENV || 'development').padEnd(15)}        ║
║     CORS Origin: ${(process.env.CORS_ORIGIN || 'http://localhost:5173').slice(0, 25).padEnd(25)} ║
║                                                  ║
╚══════════════════════════════════════════════════╝
  `);
  console.log(`📍 API available at http://localhost:${PORT}`);
  console.log(`📦 Database: JSON file storage (./data/database.json)`);
});

export default app;
