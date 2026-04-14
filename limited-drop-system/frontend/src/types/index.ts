export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  totalStock: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Reservation {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
  expiresAt: string;
  createdAt: string;
  product?: Pick<Product, 'id' | 'name' | 'price' | 'imageUrl'>;
}

export interface Order {
  id: string;
  userId: string;
  productId: string;
  reservationId: string;
  quantity: number;
  totalPrice: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
}
