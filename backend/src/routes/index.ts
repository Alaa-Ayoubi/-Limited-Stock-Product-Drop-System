import { Router } from 'express';
import authRoutes from './auth';
import productRoutes from './products';
import reservationRoutes from './reservations';
import checkoutRoutes from './checkout';
import healthRoutes from './health';
import metricsRoutes from './metrics';

const router = Router();

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/reservations', reservationRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/health', healthRoutes);
router.use('/metrics', metricsRoutes);

export default router;
