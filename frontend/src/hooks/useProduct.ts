import { useState, useEffect, useCallback, useRef } from 'react';
import { Product } from '../types';
import { productsApi } from '../api/client';

interface UseProductReturn {
  product: Product | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useProduct(productId: string): UseProductReturn {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchProduct = useCallback(async () => {
    try {
      const response = await productsApi.getById(productId);
      if (response.data) {
        setProduct(response.data);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProduct();

    // Real-time stock refresh every 5 seconds
    intervalRef.current = setInterval(fetchProduct, 5_000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchProduct]);

  return { product, loading, error, refresh: fetchProduct };
}
