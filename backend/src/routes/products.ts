// Product Routes — CRUD for merchant products

import { Router, Request, Response } from 'express';
import { getProducts, getProductById, createProduct } from '../services/database';
import { requireAuth } from '../middleware/auth';
import { CreateProductSchema } from '../types';

const router = Router();

// GET /products — List all products (optional merchant filter)
router.get('/', async (req: Request, res: Response) => {
  try {
    const merchantAddress = req.query.merchant as string | undefined;
    const products = await getProducts(merchantAddress);
    res.json({ products });
  } catch (err: any) {
    console.error('Get products error:', err.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /products/:id — Get single product
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const product = await getProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /products — Create product (requires auth)
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = CreateProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid product data', details: parsed.error.issues });
    }

    const user = (req as any).user;
    const product = await createProduct({
      merchant_id: user.address,
      merchant_address: user.address,
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price,
      price_type: parsed.data.price_type || 'credits',
      sku: parsed.data.sku,
      image_url: parsed.data.image_url || '',
      category: parsed.data.category || 'general',
      in_stock: true,
    });

    res.status(201).json(product);
  } catch (err: any) {
    console.error('Create product error:', err.message);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

export default router;
