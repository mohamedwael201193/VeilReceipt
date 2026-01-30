// Product routes
// Handles product CRUD operations

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, requireMerchant } from '../middleware/auth';
import * as db from '../services/database';
import { AleoAddress, Product, JWTPayload, CreateProductRequest } from '../types';

const router = Router();

/**
 * GET /products
 * List all products (public)
 */
router.get('/', (req: Request, res: Response) => {
  const { merchant, category, inStock } = req.query;
  
  let products = db.getProducts();
  
  // Filter by merchant address
  if (merchant && typeof merchant === 'string') {
    products = products.filter(p => p.merchantAddress === merchant);
  }
  
  // Filter by category
  if (category && typeof category === 'string') {
    products = products.filter(p => p.category === category);
  }
  
  // Filter by stock status
  if (inStock !== undefined) {
    const stockFilter = inStock === 'true';
    products = products.filter(p => p.inStock === stockFilter);
  }
  
  res.json({ products });
});

/**
 * GET /products/:id
 * Get single product by ID (public)
 */
router.get('/:id', (req: Request, res: Response) => {
  const product = db.getProductById(req.params.id);
  
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  
  res.json({ product });
});

/**
 * POST /merchant/products
 * Create a new product (merchant only)
 */
router.post('/', requireAuth, requireMerchant, (req: Request, res: Response) => {
  const user = (req as any).user as JWTPayload;
  const body = req.body as CreateProductRequest;
  
  // Validate required fields
  if (!body.name || !body.price || !body.sku) {
    res.status(400).json({ error: 'Name, price, and SKU are required' });
    return;
  }
  
  // Check SKU uniqueness
  const existingSku = db.getProductBySku(body.sku);
  if (existingSku) {
    res.status(400).json({ error: 'SKU already exists' });
    return;
  }
  
  // Get merchant record
  const merchant = db.getMerchantByAddress(user.address);
  if (!merchant) {
    res.status(400).json({ error: 'Merchant not found' });
    return;
  }
  
  // Validate price
  if (body.price <= 0) {
    res.status(400).json({ error: 'Price must be positive' });
    return;
  }
  
  const now = new Date().toISOString();
  const product: Product = {
    id: uuidv4(),
    merchantId: merchant.id,
    merchantAddress: user.address,
    name: body.name,
    description: body.description || '',
    price: Math.floor(body.price), // Ensure integer microcredits
    sku: body.sku,
    imageUrl: body.imageUrl,
    category: body.category,
    inStock: true,
    createdAt: now,
    updatedAt: now
  };
  
  const created = db.createProduct(product);
  console.log(`📦 Product created: ${created.name} by ${user.address}`);
  
  res.status(201).json({ product: created });
});

/**
 * PUT /merchant/products/:id
 * Update a product (merchant only, own products)
 */
router.put('/:id', requireAuth, requireMerchant, (req: Request, res: Response) => {
  const user = (req as any).user as JWTPayload;
  const product = db.getProductById(req.params.id);
  
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  
  // Verify ownership
  if (product.merchantAddress !== user.address) {
    res.status(403).json({ error: 'Not your product' });
    return;
  }
  
  const { name, description, price, imageUrl, category, inStock } = req.body;
  
  // Build updates object
  const updates: Partial<Product> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (price !== undefined) {
    if (price <= 0) {
      res.status(400).json({ error: 'Price must be positive' });
      return;
    }
    updates.price = Math.floor(price);
  }
  if (imageUrl !== undefined) updates.imageUrl = imageUrl;
  if (category !== undefined) updates.category = category;
  if (inStock !== undefined) updates.inStock = inStock;
  
  const updated = db.updateProduct(req.params.id, updates);
  
  res.json({ product: updated });
});

/**
 * DELETE /merchant/products/:id
 * Delete a product (merchant only, own products)
 */
router.delete('/:id', requireAuth, requireMerchant, (req: Request, res: Response) => {
  const user = (req as any).user as JWTPayload;
  const product = db.getProductById(req.params.id);
  
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  
  // Verify ownership
  if (product.merchantAddress !== user.address) {
    res.status(403).json({ error: 'Not your product' });
    return;
  }
  
  db.deleteProduct(req.params.id);
  console.log(`🗑️ Product deleted: ${product.name} by ${user.address}`);
  
  res.json({ success: true });
});

export default router;
