// Authentication Middleware — JWT verification + nonce-based wallet auth

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'veilreceipt-dev-secret-v3';
const JWT_EXPIRY = '24h';

/**
 * Generate JWT token for authenticated wallet
 */
export function generateToken(address: string, role: 'merchant' | 'buyer'): string {
  return jwt.sign({ address, role }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Verify JWT token from Authorization header
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Express middleware: require valid JWT
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Attach to request
  (req as any).user = payload;
  next();
}

/**
 * Express middleware: optional auth (doesn't fail if missing)
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (payload) {
      (req as any).user = payload;
    }
  }
  next();
}

export { JWT_SECRET };
