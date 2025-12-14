import { useState, useCallback, useEffect } from 'react';
import { useApp } from '../services/useApp';
import { CatalogQueries, CatalogCommands } from '../';
import type { Product } from '../queries/catalog.queries';
import type { CreateProductInput, UpdateProductInput } from '../commands/catalog.commands';
import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';

export const useCatalog = (filters?: {
  business_id?: string;
  category?: string;
  available_only?: boolean;
  search?: string;
}) => {
  const app = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const queries = new CatalogQueries(app.db);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await queries.getProducts(filters);

    if (result.success) {
      setProducts(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
  };
};

export const useProduct = (productId: string) => {
  const app = useApp();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const queries = new CatalogQueries(app.db);

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await queries.getProductById(productId);

    if (result.success) {
      setProduct(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [productId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  return {
    product,
    loading,
    error,
    refetch: fetchProduct,
  };
};

export const useCategories = (businessId?: string) => {
  const app = useApp();
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const queries = new CatalogQueries(app.db);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await queries.getCategories(businessId);

    if (result.success) {
      setCategories(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
  };
};

export const useCreateProduct = () => {
  const app = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const commands = new CatalogCommands(app.db);

  const createProduct = useCallback(async (input: CreateProductInput): AsyncResult<{ id: string }, ClassifiedError> => {
    setLoading(true);
    setError(null);

    const result = await commands.createProduct(input);

    if (!result.success) {
      setError(result.error);
    }

    setLoading(false);
    return result;
  }, []);

  return {
    createProduct,
    loading,
    error,
  };
};

export const useUpdateProduct = () => {
  const app = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const commands = new CatalogCommands(app.db);

  const updateProduct = useCallback(
    async (productId: string, updates: UpdateProductInput): AsyncResult<void, ClassifiedError> => {
      setLoading(true);
      setError(null);

      const result = await commands.updateProduct(productId, updates);

      if (!result.success) {
        setError(result.error);
      }

      setLoading(false);
      return result;
    },
    []
  );

  return {
    updateProduct,
    loading,
    error,
  };
};

export const useDeleteProduct = () => {
  const app = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const commands = new CatalogCommands(app.db);

  const deleteProduct = useCallback(async (productId: string): AsyncResult<void, ClassifiedError> => {
    setLoading(true);
    setError(null);

    const result = await commands.deleteProduct(productId);

    if (!result.success) {
      setError(result.error);
    }

    setLoading(false);
    return result;
  }, []);

  return {
    deleteProduct,
    loading,
    error,
  };
};
