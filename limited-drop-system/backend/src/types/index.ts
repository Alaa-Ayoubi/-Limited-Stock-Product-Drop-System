import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ReservePayload {
  productId: string;
  quantity: number;
}

export interface CheckoutPayload {
  reservationId: string;
}

export interface AppMetrics {
  uptime: number;
  totalRequests: number;
  activeReservations: number;
  expiredReservations: number;
  completedOrders: number;
  timestamp: string;
}
