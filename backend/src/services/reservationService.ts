import { Prisma, ReservationStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../lib/logger';

export const reservationService = {
  /**
   * Reserve stock for a product.
   *
   * Race-condition safety:
   * - Runs inside a Serializable transaction so concurrent reads of `stock`
   *   are serialized — two requests can't both see stock = 1 and both succeed.
   * - The `UPDATE ... WHERE stock >= quantity` acts as an additional guard;
   *   if the UPDATE affects 0 rows we know stock was already taken.
   */
  async reserve(userId: string, productId: string, quantity: number) {
    return prisma.$transaction(
      async (tx) => {
        // Lock the product row for update to prevent concurrent deductions
        const products = await tx.$queryRaw<Array<{
          id: string;
          name: string;
          stock: number;
          price: number;
          isActive: boolean;
        }>>`
          SELECT id, name, stock, price, "isActive"
          FROM "Product"
          WHERE id = ${productId}
          FOR UPDATE
        `;

        const product = products[0];

        if (!product) {
          throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
        }

        if (!product.isActive) {
          throw new AppError(400, 'Product is not available', 'PRODUCT_INACTIVE');
        }

        if (product.stock < quantity) {
          throw new AppError(
            409,
            `Insufficient stock. Available: ${product.stock}`,
            'INSUFFICIENT_STOCK'
          );
        }

        // Check for an existing active reservation by this user for this product
        const existingReservation = await tx.reservation.findFirst({
          where: {
            userId,
            productId,
            status: ReservationStatus.ACTIVE,
          },
        });

        if (existingReservation) {
          throw new AppError(
            409,
            'You already have an active reservation for this product',
            'DUPLICATE_RESERVATION'
          );
        }

        // Deduct stock atomically
        const updated = await tx.$executeRaw`
          UPDATE "Product"
          SET stock = stock - ${quantity}, "updatedAt" = NOW()
          WHERE id = ${productId} AND stock >= ${quantity}
        `;

        if (updated === 0) {
          throw new AppError(409, 'Stock was taken by another request', 'RACE_CONDITION');
        }

        const expiresAt = new Date(Date.now() + env.RESERVATION_TTL_MINUTES * 60 * 1000);

        const reservation = await tx.reservation.create({
          data: {
            userId,
            productId,
            quantity,
            expiresAt,
            status: ReservationStatus.ACTIVE,
          },
          include: { product: { select: { name: true, price: true } } },
        });

        // Audit log
        await tx.inventoryLog.create({
          data: {
            productId,
            change: -quantity,
            reason: 'RESERVATION',
            metadata: { reservationId: reservation.id, userId },
          },
        });

        logger.info('Reservation created', {
          reservationId: reservation.id,
          userId,
          productId,
          quantity,
          expiresAt,
        });

        return reservation;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  },

  async checkout(userId: string, reservationId: string) {
    return prisma.$transaction(
      async (tx) => {
        const reservation = await tx.reservation.findUnique({
          where: { id: reservationId },
          include: { product: true },
        });

        if (!reservation) {
          throw new AppError(404, 'Reservation not found', 'RESERVATION_NOT_FOUND');
        }

        if (reservation.userId !== userId) {
          throw new AppError(403, 'This reservation does not belong to you', 'FORBIDDEN');
        }

        if (reservation.status !== ReservationStatus.ACTIVE) {
          throw new AppError(
            409,
            `Reservation is ${reservation.status.toLowerCase()}`,
            'RESERVATION_NOT_ACTIVE'
          );
        }

        if (new Date() > reservation.expiresAt) {
          // Expire it and restore stock
          await tx.reservation.update({
            where: { id: reservationId },
            data: { status: ReservationStatus.EXPIRED },
          });
          await tx.$executeRaw`
            UPDATE "Product" SET stock = stock + ${reservation.quantity}, "updatedAt" = NOW()
            WHERE id = ${reservation.productId}
          `;
          await tx.inventoryLog.create({
            data: {
              productId: reservation.productId,
              change: reservation.quantity,
              reason: 'EXPIRATION_ON_CHECKOUT',
              metadata: { reservationId },
            },
          });
          throw new AppError(410, 'Reservation has expired', 'RESERVATION_EXPIRED');
        }

        const totalPrice = reservation.product.price * reservation.quantity;

        const order = await tx.order.create({
          data: {
            userId,
            productId: reservation.productId,
            reservationId,
            quantity: reservation.quantity,
            totalPrice,
            status: 'CONFIRMED',
          },
        });

        await tx.reservation.update({
          where: { id: reservationId },
          data: { status: ReservationStatus.COMPLETED },
        });

        logger.info('Checkout completed', { orderId: order.id, reservationId, userId });

        return order;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  },

  async cancel(userId: string, reservationId: string) {
    return prisma.$transaction(
      async (tx) => {
        const reservation = await tx.reservation.findUnique({
          where: { id: reservationId },
        });

        if (!reservation) {
          throw new AppError(404, 'Reservation not found', 'RESERVATION_NOT_FOUND');
        }

        if (reservation.userId !== userId) {
          throw new AppError(403, 'This reservation does not belong to you', 'FORBIDDEN');
        }

        if (reservation.status !== ReservationStatus.ACTIVE) {
          throw new AppError(
            409,
            `Reservation is ${reservation.status.toLowerCase()}`,
            'RESERVATION_NOT_ACTIVE'
          );
        }

        await tx.reservation.update({
          where: { id: reservationId },
          data: { status: ReservationStatus.CANCELLED },
        });

        // Restore stock
        await tx.$executeRaw`
          UPDATE "Product" SET stock = stock + ${reservation.quantity}, "updatedAt" = NOW()
          WHERE id = ${reservation.productId}
        `;

        await tx.inventoryLog.create({
          data: {
            productId: reservation.productId,
            change: reservation.quantity,
            reason: 'CANCELLATION',
            metadata: { reservationId, userId },
          },
        });

        logger.info('Reservation cancelled', { reservationId, userId });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  },

  async getUserReservations(
    userId: string,
    options: { page: number; limit: number; status?: ReservationStatus; sortOrder: 'asc' | 'desc' }
  ) {
    const { page, limit, status, sortOrder } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.ReservationWhereInput = { userId };
    if (status) where.status = status;

    const [total, reservations] = await Promise.all([
      prisma.reservation.count({ where }),
      prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: sortOrder },
        include: {
          product: { select: { id: true, name: true, price: true, imageUrl: true } },
        },
      }),
    ]);

    return {
      data: reservations,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  },

  async expireStaleReservations() {
    const now = new Date();

    const expired = await prisma.reservation.findMany({
      where: {
        status: ReservationStatus.ACTIVE,
        expiresAt: { lt: now },
      },
      select: { id: true, productId: true, quantity: true },
    });

    if (expired.length === 0) return { count: 0 };

    await prisma.$transaction(async (tx) => {
      for (const res of expired) {
        // Only update if still ACTIVE — a concurrent checkout may have already
        // set status to COMPLETED between our findMany and this transaction.
        const updated = await tx.reservation.updateMany({
          where: { id: res.id, status: ReservationStatus.ACTIVE },
          data: { status: ReservationStatus.EXPIRED },
        });

        // Skip stock restoration if reservation was already completed/processed
        if (updated.count === 0) continue;

        await tx.$executeRaw`
          UPDATE "Product" SET stock = stock + ${res.quantity}, "updatedAt" = NOW()
          WHERE id = ${res.productId}
        `;

        await tx.inventoryLog.create({
          data: {
            productId: res.productId,
            change: res.quantity,
            reason: 'EXPIRATION',
            metadata: { reservationId: res.id },
          },
        });
      }
    });

    logger.info('Expired reservations processed', { count: expired.length });
    return { count: expired.length };
  },
};
