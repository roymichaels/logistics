import { useApp } from '../hooks/useApp';
import { useQuery } from '../hooks/useQuery';
import { useMutation } from '../hooks/useMutation';
import { usePaginatedQuery } from '../hooks/usePaginatedQuery';
import { CatalogQueries, CatalogCommands } from '../';
import type { Product } from '../queries/catalog.queries';
import type { CreateProductInput, UpdateProductInput } from '../commands/catalog.commands';

export const useCatalog = (filters?: {
  business_id?: string;
  category?: string;
  available_only?: boolean;
  search?: string;
}) => {
  const app = useApp();
  const queries = new CatalogQueries(app.db);

  const filtersKey = JSON.stringify(filters || {});
  const cacheKey = `products:list:${filters?.business_id || 'all'}:${filtersKey}`;

  const result = useQuery<Product[]>(
    cacheKey,
    () => queries.getProducts(filters),
    { ttl: 30000 }
  );

  return {
    products: result.data || [],
    loading: result.loading,
    error: result.error,
    stale: result.stale,
    refetch: result.refetch,
  };
};

export const useCatalogPaginated = (
  filters?: {
    business_id?: string;
    category?: string;
    available_only?: boolean;
    search?: string;
  },
  pageSize = 20
) => {
  const app = useApp();
  const queries = new CatalogQueries(app.db);

  const filtersKey = JSON.stringify(filters || {});
  const baseKey = `products:page:${filters?.business_id || 'all'}:${filtersKey}`;

  const result = usePaginatedQuery<Product>(
    baseKey,
    ({ page, pageSize: size, offset }) =>
      queries.getProducts({ ...filters, page, limit: size, offset }),
    { pageSize, ttl: 30000, mode: 'infinite' }
  );

  return result;
};

export const useProduct = (productId: string) => {
  const app = useApp();
  const queries = new CatalogQueries(app.db);

  const cacheKey = `products:detail:${productId}`;

  const result = useQuery<Product>(
    cacheKey,
    () => queries.getProductById(productId),
    { ttl: 30000, enabled: !!productId }
  );

  return {
    product: result.data,
    loading: result.loading,
    error: result.error,
    stale: result.stale,
    refetch: result.refetch,
  };
};

export const useCreateProduct = () => {
  const app = useApp();
  const commands = new CatalogCommands(app.db);

  const mutation = useMutation<CreateProductInput, { id: string }>(
    (input) => commands.createProduct(input),
    {
      invalidatePatterns: ['products:list:*', 'products:page:*', 'catalog:*'],
      emitEvent: 'product.created',
    }
  );

  return {
    createProduct: mutation.mutate,
    createProductAsync: mutation.mutateAsync,
    loading: mutation.loading,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
};

export const useUpdateProduct = () => {
  const app = useApp();
  const commands = new CatalogCommands(app.db);

  const mutation = useMutation<UpdateProductInput, void>(
    (input) => commands.updateProduct(input),
    {
      invalidatePatterns: [
        'products:list:*',
        'products:page:*',
        'products:detail:*',
        'catalog:*',
      ],
      emitEvent: 'product.updated',
    }
  );

  return {
    updateProduct: mutation.mutate,
    updateProductAsync: mutation.mutateAsync,
    loading: mutation.loading,
    error: mutation.error,
    reset: mutation.reset,
  };
};

export const useDeleteProduct = () => {
  const app = useApp();
  const commands = new CatalogCommands(app.db);

  const mutation = useMutation<{ productId: string }, void>(
    ({ productId }) => commands.deleteProduct(productId),
    {
      invalidatePatterns: [
        'products:list:*',
        'products:page:*',
        'products:detail:*',
        'catalog:*',
      ],
      emitEvent: 'product.deleted',
    }
  );

  return {
    deleteProduct: (productId: string) => mutation.mutate({ productId }),
    deleteProductAsync: (productId: string) => mutation.mutateAsync({ productId }),
    loading: mutation.loading,
    error: mutation.error,
    reset: mutation.reset,
  };
};

export const useCategories = (businessId?: string) => {
  const app = useApp();
  const queries = new CatalogQueries(app.db);

  const cacheKey = `categories:list:${businessId || 'all'}`;

  const result = useQuery<string[]>(
    cacheKey,
    () => queries.getCategories(businessId),
    { ttl: 60000 }
  );

  return {
    categories: result.data || [],
    loading: result.loading,
    error: result.error,
    stale: result.stale,
    refetch: result.refetch,
  };
};
