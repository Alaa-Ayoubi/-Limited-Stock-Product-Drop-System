import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { metrics } from '../lib/metrics';

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [activeReservations, expiredReservations, completedOrders, totalProducts] =
      await Promise.all([
        prisma.reservation.count({ where: { status: 'ACTIVE' } }),
        prisma.reservation.count({ where: { status: 'EXPIRED' } }),
        prisma.order.count({ where: { status: 'CONFIRMED' } }),
        prisma.product.count({ where: { isActive: true } }),
      ]);

    res.json({
      success: true,
      data: {
        uptime: metrics.getUptime(),
        totalRequests: metrics.getTotalRequests(),
        activeReservations,
        expiredReservations,
        completedOrders,
        totalProducts,
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
