import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';
import type { IDataStore } from '@/foundation/abstractions/IDataStore';
import { Ok, Err } from '@/foundation/types/Result';
import { logger } from '@/lib/logger';

export interface Product {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  image_url?: string;
  stock_quantity?: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export class CatalogQueries {
  constructor(private dataStore: IDataStore) {}

  async getProducts(filters?: {
    business_id?: string;
    category?: string;
    available_only?: boolean;
    search?: string;
  }): AsyncResult<Product[], ClassifiedError> {
    try {
      logger.info('[CatalogQueries] Fetching products', { filters });

      let query = this.dataStore.from('products').select('*');

      if (filters?.business_id) {
        query = query.eq('business_id', filters.business_id);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.available_only) {
        query = query.eq('is_available', true);
      }
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      const result = await query.order('created_at', { ascending: false });

      if (!result.success) {
        logger.error('[CatalogQueries] Failed to fetch products', result.error);
        return Err({
          message: result.error.message || 'Failed to fetch products',
          code: 'PRODUCT_QUERY_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      return Ok(result.data as Product[]);
    } catch (error: any) {
      logger.error('[CatalogQueries] Exception fetching products', error);
      return Err({
        message: error.message || 'Unexpected error fetching products',
        code: 'PRODUCT_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getProductById(productId: string): AsyncResult<Product | null, ClassifiedError> {
    try {
      logger.info('[CatalogQueries] Fetching product by ID', { productId });

      const result = await this.dataStore
        .from('products')
        .select('*')
        .eq('id', productId)
        .maybeSingle();

      if (!result.success) {
        logger.error('[CatalogQueries] Failed to fetch product', result.error);
        return Err({
          message: result.error.message || 'Failed to fetch product',
          code: 'PRODUCT_NOT_FOUND',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      return Ok(result.data as Product | null);
    } catch (error: any) {
      logger.error('[CatalogQueries] Exception fetching product', error);
      return Err({
        message: error.message || 'Unexpected error fetching product',
        code: 'PRODUCT_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getCategories(businessId?: string): AsyncResult<string[], ClassifiedError> {
    try {
      logger.info('[CatalogQueries] Fetching categories', { businessId });

      let query = this.dataStore.from('products').select('category');

      if (businessId) {
        query = query.eq('business_id', businessId);
      }

      const result = await query;

      if (!result.success) {
        return Err({
          message: 'Failed to fetch categories',
          code: 'CATEGORY_QUERY_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
        });
      }

      const categories = [...new Set(
        (result.data as Array<{ category?: string }>)
          .map(p => p.category)
          .filter(Boolean)
      )] as string[];

      return Ok(categories);
    } catch (error: any) {
      return Err({
        message: error.message || 'Failed to fetch categories',
        code: 'CATEGORY_QUERY_EXCEPTION',
        severity: 'recoverable',
        timestamp: Date.now(),
        data: error,
      });
    }
  }
}
