import { useState, useEffect, useCallback } from 'react';
import { useServices } from '@foundation/container/ServiceProvider';
import { logger } from '@lib/logger';

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  imageUrl?: string;
  businessId: string;
  active: boolean;
  stock?: number;
  sku?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UseProductsOptions {
  businessId?: string;
  category?: string;
  active?: boolean;
  autoLoad?: boolean;
}

export interface UseProductsResult {
  products: Product[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createProduct: (data: Partial<Product>) => Promise<Product | null>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  getProduct: (id: string) => Promise<Product | null>;
}

export function useProducts(options: UseProductsOptions = {}): UseProductsResult {
  const { businessId, category, active, autoLoad = true } = options;
  const { dataStore } = useServices();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    if (!dataStore?.listProducts) {
      setError('Products service not available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const filters: any = {};
      if (businessId) filters.businessId = businessId;
      if (category) filters.category = category;
      if (active !== undefined) filters.active = active;

      const result = await dataStore.listProducts(filters);
      setProducts(result || []);
    } catch (err) {
      logger.error('Failed to load products', err);
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [dataStore, businessId, category, active]);

  const createProduct = useCallback(async (data: Partial<Product>) => {
    if (!dataStore?.createProduct) {
      setError('Create product service not available');
      return null;
    }

    try {
      const newProduct = await dataStore.createProduct(data as any);
      if (newProduct) {
        setProducts(prev => [...prev, newProduct]);
      }
      return newProduct;
    } catch (err) {
      logger.error('Failed to create product', err);
      setError(err instanceof Error ? err.message : 'Failed to create product');
      return null;
    }
  }, [dataStore]);

  const updateProduct = useCallback(async (id: string, data: Partial<Product>) => {
    if (!dataStore?.updateProduct) {
      setError('Update product service not available');
      return false;
    }

    try {
      await dataStore.updateProduct(id, data);
      setProducts(prev => prev.map(product =>
        product.id === id ? { ...product, ...data } : product
      ));
      return true;
    } catch (err) {
      logger.error('Failed to update product', err);
      setError(err instanceof Error ? err.message : 'Failed to update product');
      return false;
    }
  }, [dataStore]);

  const deleteProduct = useCallback(async (id: string) => {
    if (!dataStore?.deleteProduct) {
      setError('Delete product service not available');
      return false;
    }

    try {
      await dataStore.deleteProduct(id);
      setProducts(prev => prev.filter(product => product.id !== id));
      return true;
    } catch (err) {
      logger.error('Failed to delete product', err);
      setError(err instanceof Error ? err.message : 'Failed to delete product');
      return false;
    }
  }, [dataStore]);

  const getProduct = useCallback(async (id: string) => {
    if (!dataStore?.getProduct) {
      setError('Get product service not available');
      return null;
    }

    try {
      return await dataStore.getProduct(id);
    } catch (err) {
      logger.error('Failed to get product', err);
      setError(err instanceof Error ? err.message : 'Failed to get product');
      return null;
    }
  }, [dataStore]);

  useEffect(() => {
    if (autoLoad) {
      loadProducts();
    }
  }, [autoLoad, loadProducts]);

  return {
    products,
    loading,
    error,
    refresh: loadProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    getProduct,
  };
}
