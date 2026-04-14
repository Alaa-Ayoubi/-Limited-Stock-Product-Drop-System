import { Router, Request, Response, NextFunction } from 'express';
import { productService } from '../services/productService';
import { validate } from '../middleware/validate';
import { productQuerySchema } from '../validators/schemas';
import { ProductQueryInput } from '../validators/schemas';

const router = Router();

// GET /products — list with pagination, filtering, sorting
router.get(
  '/',
  validate(productQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as ProductQueryInput;
      const result = await productService.list(query);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
);

// GET /products/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await productService.getById(req.params['id']!);
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

// GET /products/:id/inventory-logs — audit trail
router.get(
  '/:id/inventory-logs',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt((req.query['page'] as string) ?? '1', 10);
      const limit = parseInt((req.query['limit'] as string) ?? '20', 10);
      const result = await productService.getInventoryLogs(req.params['id']!, page, limit);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
