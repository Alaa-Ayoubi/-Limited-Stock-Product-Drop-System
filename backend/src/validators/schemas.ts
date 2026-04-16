import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const reserveSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  quantity: z
    .number({ invalid_type_error: 'quantity must be a number' })
    .int('quantity must be an integer')
    .min(1, 'quantity must be at least 1')
    .max(10, 'quantity cannot exceed 10 per reservation'),
});

export const checkoutSchema = z.object({
  reservationId: z.string().min(1, 'reservationId is required'),
});

export const productQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 10))
    .pipe(z.number().int().min(1).max(100)),
  sortBy: z.enum(['name', 'price', 'stock', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
  inStock: z
    .string()
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
});

export const reservationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 10))
    .pipe(z.number().int().min(1).max(100)),
  status: z
    .enum(['ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED'])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ReserveInput = z.infer<typeof reserveSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
export type ReservationQueryInput = z.infer<typeof reservationQuerySchema>;
