import cron from 'node-cron';
import { reservationService } from '../services/reservationService';
import { logger } from '../lib/logger';

// Run every minute to expire stale reservations and restore stock
export const startExpirationJob = (): void => {
  cron.schedule('* * * * *', async () => {
    logger.debug('Running reservation expiration job...');
    try {
      const { count } = await reservationService.expireStaleReservations();
      if (count > 0) {
        logger.info('Expired reservations cleaned up', { count });
      }
    } catch (err) {
      logger.error('Expiration job failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  logger.info('Reservation expiration job scheduled (every minute)');
};
