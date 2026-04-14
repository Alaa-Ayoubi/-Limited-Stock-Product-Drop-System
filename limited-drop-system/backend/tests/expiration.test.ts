import { reservationService } from '../src/services/reservationService';
import prisma from '../src/lib/prisma';
import { ReservationStatus } from '@prisma/client';

jest.mock('../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
    reservation: { findMany: jest.fn(), update: jest.fn(), count: jest.fn() },
    inventoryLog: { create: jest.fn() },
    order: { count: jest.fn() },
    product: { count: jest.fn() },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Expiration Logic', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should expire multiple stale reservations and restore stock', async () => {
    const staleReservations = [
      { id: 'res-1', productId: 'p1', quantity: 2 },
      { id: 'res-2', productId: 'p2', quantity: 1 },
    ];

    (mockPrisma.reservation.findMany as jest.Mock).mockResolvedValue(staleReservations);

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => {
      (mockPrisma.reservation.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.$executeRaw as jest.Mock).mockResolvedValue(1);
      (mockPrisma.inventoryLog.create as jest.Mock).mockResolvedValue({});
      return fn(mockPrisma);
    });

    const result = await reservationService.expireStaleReservations();
    expect(result.count).toBe(2);
  });

  it('should not run transaction when there are no stale reservations', async () => {
    (mockPrisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

    const result = await reservationService.expireStaleReservations();

    expect(result.count).toBe(0);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('should query only ACTIVE reservations past expiry', async () => {
    (mockPrisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

    await reservationService.expireStaleReservations();

    expect(mockPrisma.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: ReservationStatus.ACTIVE,
          expiresAt: expect.objectContaining({ lt: expect.any(Date) }),
        }),
      })
    );
  });
});
