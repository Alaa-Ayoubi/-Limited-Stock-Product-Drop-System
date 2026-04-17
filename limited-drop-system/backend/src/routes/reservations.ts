import { Router, Response, NextFunction } from 'express';
import { reservationService } from '../services/reservationService';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { reserveSchema, reservationQuerySchema } from '../validators/schemas';
import { reservationRateLimiter } from '../middleware/rateLimiter';
import { AuthenticatedRequest } from '../types';
import { ReservationStatus } from '@prisma/client';
import { ReservationQueryInput } from '../validators/schemas';

const router = Router();

// All reservation routes require auth
router.use(requireAuth);

// POST /reservations — create a reservation
router.post(
  '/',
  reservationRateLimiter,
  validate(reserveSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { productId, quantity } = req.body as { productId: string; quantity: number };
      const reservation = await reservationService.reserve(req.user!.id, productId, quantity);
      res.status(201).json({ success: true, data: reservation });
    } catch (err) {
      next(err);
    }
  }
);

// GET /reservations — list user's reservations
router.get(
  '/',
  validate(reservationQuerySchema, 'query'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as ReservationQueryInput;
      const result = await reservationService.getUserReservations(req.user!.id, {
        page: query.page,
        limit: query.limit,
        status: query.status as ReservationStatus | undefined,
        sortOrder: query.sortOrder,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /reservations/:id — cancel a reservation and restore stock
router.delete(
  '/:id',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await reservationService.cancel(req.user!.id, req.params['id']!);
      res.json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
