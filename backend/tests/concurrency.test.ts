import { reservationService } from '../src/services/reservationService';
import prisma from '../src/lib/prisma';

jest.mock('../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    reservation: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    inventoryLog: { create: jest.fn() },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Concurrency Simulation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should allow only one of two simultaneous reservations when stock = 1', async () => {
    let stockAvailable = 1;
    let callCount = 0;

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => {
      // Simulate serialized transaction: first caller gets the stock, second sees 0
      callCount++;
      const myStock = stockAvailable;

      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([
        { id: 'p1', name: 'Test', stock: myStock, price: 100, isActive: true },
      ]);

      if (myStock >= 1) {
        stockAvailable = 0; // first transaction consumed the stock
        (mockPrisma.reservation.findFirst as jest.Mock).mockResolvedValue(null);
        (mockPrisma.$executeRaw as jest.Mock).mockResolvedValue(1);
        (mockPrisma.reservation.create as jest.Mock).mockResolvedValue({
          id: `res-${callCount}`,
          userId: `user${callCount}`,
          productId: 'p1',
          quantity: 1,
          status: 'ACTIVE',
          expiresAt: new Date(Date.now() + 300_000),
          product: { name: 'Test', price: 100 },
        });
        (mockPrisma.inventoryLog.create as jest.Mock).mockResolvedValue({});
      } else {
        (mockPrisma.$executeRaw as jest.Mock).mockResolvedValue(0); // no rows updated
      }

      return fn(mockPrisma);
    });

    const [res1, res2] = await Promise.allSettled([
      reservationService.reserve('user1', 'p1', 1),
      reservationService.reserve('user2', 'p1', 1),
    ]);

    const fulfilled = [res1, res2].filter((r) => r.status === 'fulfilled');
    const rejected = [res1, res2].filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const error = (rejected[0] as PromiseRejectedResult).reason;
    expect(['INSUFFICIENT_STOCK', 'RACE_CONDITION']).toContain(error.code);
  });

  it('should allow N concurrent reservations up to exact stock limit', async () => {
    const STOCK = 3;
    const USERS = 5;
    let remaining = STOCK;
    let callCount = 0;

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => {
      callCount++;
      const myStock = remaining;

      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([
        { id: 'p1', name: 'Test', stock: myStock, price: 100, isActive: true },
      ]);

      if (myStock >= 1) {
        remaining--;
        (mockPrisma.reservation.findFirst as jest.Mock).mockResolvedValue(null);
        (mockPrisma.$executeRaw as jest.Mock).mockResolvedValue(1);
        (mockPrisma.reservation.create as jest.Mock).mockResolvedValue({
          id: `res-${callCount}`,
          status: 'ACTIVE',
          product: { name: 'Test', price: 100 },
        });
        (mockPrisma.inventoryLog.create as jest.Mock).mockResolvedValue({});
      } else {
        (mockPrisma.$executeRaw as jest.Mock).mockResolvedValue(0);
      }

      return fn(mockPrisma);
    });

    const results = await Promise.allSettled(
      Array.from({ length: USERS }, (_, i) =>
        reservationService.reserve(`user${i}`, 'p1', 1)
      )
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    expect(succeeded).toBe(STOCK);
    expect(failed).toBe(USERS - STOCK);
  });
});
