import axios, { AxiosError } from 'axios';
import { ApiResponse, Product, Reservation, Order, AuthUser } from '../types';

const BASE_URL = import.meta.env['VITE_API_URL'] ?? '/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request if present
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Normalize error responses
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    const message =
      error.response?.data?.error ?? error.message ?? 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

// ─── Products ─────────────────────────────────────────────────────────────────

export const productsApi = {
  list: (params?: { page?: number; limit?: number; search?: string; inStock?: boolean }) =>
    apiClient
      .get<ApiResponse<Product[]>>('/products', { params })
      .then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Product>>(`/products/${id}`).then((r) => r.data),
};

// ─── Reservations ─────────────────────────────────────────────────────────────

export const reservationsApi = {
  create: (productId: string, quantity: number) =>
    apiClient
      .post<ApiResponse<Reservation>>('/reservations', { productId, quantity })
      .then((r) => r.data),

  list: (params?: { page?: number; status?: string }) =>
    apiClient
      .get<ApiResponse<Reservation[]>>('/reservations', { params })
      .then((r) => r.data),

  cancel: (id: string) =>
    apiClient
      .delete<ApiResponse<null>>(`/reservations/${id}`)
      .then((r) => r.data),
};

// ─── Checkout ─────────────────────────────────────────────────────────────────

export const checkoutApi = {
  checkout: (reservationId: string) =>
    apiClient
      .post<ApiResponse<Order>>('/checkout', { reservationId })
      .then((r) => r.data),
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (email: string, password: string, name: string) =>
    apiClient
      .post<ApiResponse<{ user: AuthUser; token: string }>>('/auth/register', {
        email,
        password,
        name,
      })
      .then((r) => r.data),

  login: (email: string, password: string) =>
    apiClient
      .post<ApiResponse<{ user: AuthUser; token: string }>>('/auth/login', { email, password })
      .then((r) => r.data),
};
