import { useState, useEffect, useCallback, useRef } from 'react';
import { Product } from '../types';
import { productsApi } from '../api/client';

export function useProducts(refreshInterval = 5000) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const isFirstLoad = useRef(true);

  const fetchAll = useCallback(async () => {
    if (isFirstLoad.current) setLoading(true);
    try {
      const res = await productsApi.list({ limit: 20 });
      if (res.data) {
        setProducts(res.data);
        setLastRefresh(new Date());
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      if (isFirstLoad.current) {
        setLoading(false);
        isFirstLoad.current = false;
      }
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchAll, refreshInterval]);

  return { products, loading, error, lastRefresh, refresh: fetchAll };
}
