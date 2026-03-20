// API Key Authentication Middleware — For merchant integration API

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getApiKeyByHash, touchApiKeyUsage, getMerchantById } from '../services/database';

/**
 * Hash an API key for lookup
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Generate a new API key (returned to merchant ONCE, then only the hash is stored)
 */
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const raw = crypto.randomBytes(32).toString('hex');
  const key = `veil_pk_${raw}`;
  const hash = hashApiKey(key);
  const prefix = key.substring(0, 16);
  return { key, hash, prefix };
}

/**
 * Express middleware: require valid API key in X-API-Key header
 * Attaches req.merchant and req.apiKey to the request
 */
export async function requireApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) {
    res.status(401).json({ error: 'Missing X-API-Key header' });
    return;
  }

  const keyHash = hashApiKey(apiKey);
  const keyRecord = await getApiKeyByHash(keyHash);
  if (!keyRecord) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  const merchant = await getMerchantById(keyRecord.merchant_id);
  if (!merchant) {
    res.status(401).json({ error: 'Merchant not found' });
    return;
  }

  // Touch last_used_at (fire & forget)
  touchApiKeyUsage(keyHash).catch(() => {});

  // Attach to request
  (req as any).merchant = merchant;
  (req as any).apiKey = keyRecord;
  next();
}

/**
 * Check if the API key has a specific permission
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const apiKey = (req as any).apiKey;
    if (!apiKey || !apiKey.permissions.includes(permission)) {
      res.status(403).json({ error: `API key lacks '${permission}' permission` });
      return;
    }
    next();
  };
}
