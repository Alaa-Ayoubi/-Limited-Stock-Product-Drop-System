import { reservationService } from '../src/services/reservationService';
import prisma from '../src/lib/prisma';
import { ReservationStatus } from '@prisma/client';

// Mock prisma to avoid real DB calls in unit tests
jest.mock('../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    reservation: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    inventoryLog: { create: jest.fn() },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('ReservationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('reserve()', () => {
    it('should throw INSUFFICIENT_STOCK when stock < quantity', async () => {
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => {
        // Simulate product with stock = 0
        (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([
          { id: 'p1', name: 'Test', stock: 0, price: 100, isActive: true },
        ]);
        return fn(mockPrisma);
      });

      await expect(reservationService.reserve('user1', 'p1', 1)).rejects.toMatchObject({
        code: 'INSUFFICIENT_STOCK',
        statusCode: 409,
      });
    });

    it('should throw DUPLICATE_RESERVATION when user already has active reservation', async () => {
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => {
        (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([
          { id: 'p1', name: 'Test', stock: 5, price: 100, isActive: true },
        ]);
        (mockPrisma.reservation.findFirst as jest.Mock).mockResolvedValue({
          id: 'existing-res',
          status: ReservationStatus.ACTIVE,
        });
        return fn(mockPrisma);
      });

      await expect(reservationService.reserve('user1', 'p1', 1)).rejects.toMatchObject({
        code: 'DUPLICATE_RESERVATION',
        statusCode: 409,
      });
    });

    it('should create reservation when stock is available', async () => {
      const mockReservation = {
        id: 'res-1',
        userId: 'user1',
        productId: 'p1',
        quantity: 1,
        status: ReservationStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        product: { name: 'Test', price: 100 },
      };

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => {
        (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([
          { id: 'p1', name: 'Test', stock: 5, price: 100, isActive: true },
        ]);
        (mockPrisma.reservation.findFirst as jest.Mock).mockResolvedValue(null);
        (mockPrisma.$executeRaw as jest.Mock).mockResolvedValue(1);
        (mockPrisma.reservation.create as jest.Mock).mockResolvedValue(mockReservation);
        (mockPrisma.inventoryLog.create as jest.Mock).mockResolvedValue({});
        return fn(mockPrisma);
      });

      const result = await reservationService.reserve('user1', 'p1', 1);
      expect(result.id).toBe('res-1');
      expect(result.status).toBe(ReservationStatus.ACTIVE);
    });

    it('should throw PRODUCT_NOT_FOUND when product does not exist', async () => {
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => {
        (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([]);
        return fn(mockPrisma);
      });

      await expect(reservationService.reserve('user1', 'nonexistent', 1)).rejects.toMatchObject({
        code: 'PRODUCT_NOT_FOUND',
        statusCode: 404,
      });
    });
  });

  describe('expireStaleReservations()', () => {
    it('should return count 0 when no expired reservations exist', async () => {
      (mockPrisma.reservation.findMany as jest.Mock).mockResolvedValue([]);
      const result = await reservationService.expireStaleReservations();
      expect(result.count).toBe(0);
    });
  });
});
