import { Router, Response, NextFunction } from 'express';
import { reservationService } from '../services/reservationService';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { checkoutSchema } from '../validators/schemas';
import { AuthenticatedRequest } from '../types';

const router = Router();

// POST /checkout
router.post(
  '/',
  requireAuth,
  validate(checkoutSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { reservationId } = req.body as { reservationId: string };
      const order = await reservationService.checkout(req.user!.id, reservationId);
      res.status(201).json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
