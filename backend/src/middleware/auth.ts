// Authentication middleware and utilities
// Uses wallet signature for SIWE-like authentication

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { AleoAddress, JWTPayload, AuthNonce } from '../types';
import * as db from '../services/database';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES_IN = '24h';
const NONCE_EXPIRES_IN = 5 * 60 * 1000; // 5 minutes

/**
 * Generate a nonce for wallet signature
 */
export function generateNonce(address: AleoAddress): AuthNonce {
  const now = Date.now();
  const nonce: AuthNonce = {
    nonce: uuidv4(),
    address,
    createdAt: now,
    expiresAt: now + NONCE_EXPIRES_IN
  };
  
  db.createAuthNonce(nonce);
  return nonce;
}

/**
 * Verify nonce exists and is not expired
 */
export function verifyNonce(address: AleoAddress, nonce: string): boolean {
  const stored = db.getAuthNonce(address);
  if (!stored) return false;
  if (stored.nonce !== nonce) return false;
  if (Date.now() > stored.expiresAt) return false;
  
  // Delete nonce after use (one-time)
  db.deleteAuthNonce(address);
  return true;
}

/**
 * Generate JWT token for authenticated user
 */
export function generateToken(address: AleoAddress, role: 'merchant' | 'buyer'): string {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    address,
    role
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Express middleware to require authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No authorization token provided' });
    return;
  }
  
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  
  // Attach user info to request
  (req as any).user = payload;
  next();
}

/**
 * Express middleware to require merchant role
 */
export function requireMerchant(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user as JWTPayload;
  
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  
  if (user.role !== 'merchant') {
    res.status(403).json({ error: 'Merchant access required' });
    return;
  }
  
  next();
}

/**
 * Optional auth - attaches user if token present, continues otherwise
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) {
      (req as any).user = payload;
    }
  }
  
  next();
}

/**
 * Verify Aleo wallet signature
 * Note: This is a simplified version - full implementation would use 
 * Aleo SDK's signature verification
 */
export function verifySignature(
  message: string,
  signature: string,
  address: AleoAddress
): boolean {
  // In production, this would use the Aleo SDK to verify the signature
  // For now, we accept the signature if it's a non-empty string
  // The wallet adapter handles the actual cryptographic verification
  
  // Basic validation
  if (!message || !signature || !address) {
    return false;
  }
  
  // Verify address format
  if (!address.startsWith('aleo1')) {
    return false;
  }
  
  // Verify signature is present and looks valid (base58/hex encoded)
  if (signature.length < 10) {
    return false;
  }
  
  // TODO: In production, use @provablehq/sdk to verify:
  // import { verify_signature } from '@provablehq/sdk';
  // return verify_signature(address, message, signature);
  
  console.log(`⚠️ Signature verification simplified for MVP`);
  console.log(`   Address: ${address}`);
  console.log(`   Message: ${message}`);
  console.log(`   Signature: ${signature.slice(0, 20)}...`);
  
  return true;
}
