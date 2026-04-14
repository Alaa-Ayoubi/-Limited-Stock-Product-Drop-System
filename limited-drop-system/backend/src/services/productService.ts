import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

interface ProductFilters {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  search?: string;
  inStock?: boolean;
}

export const productService = {
  async list(filters: ProductFilters) {
    const { page, limit, sortBy, sortOrder, search, inStock } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (inStock === true) {
      where.stock = { gt: 0 };
    } else if (inStock === false) {
      where.stock = 0;
    }

    const validSortFields = ['name', 'price', 'stock', 'createdAt'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: sortOrder },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          stock: true,
          totalStock: true,
          imageUrl: true,
          isActive: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      data: products,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        stock: true,
        totalStock: true,
        imageUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!product) {
      throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    }

    return product;
  },

  async getInventoryLogs(productId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const where = { productId };

    const [total, logs] = await Promise.all([
      prisma.inventoryLog.count({ where }),
      prisma.inventoryLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: logs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  },
};
