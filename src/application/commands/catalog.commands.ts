import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';
import type { IDataStore } from '@/foundation/abstractions/IDataStore';
import { Ok, Err } from '@/foundation/types/Result';
import { logger } from '@/lib/logger';
import { DomainEvents } from '@/domain/events/DomainEvents';

export interface CreateProductInput {
  business_id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  image_url?: string;
  stock_quantity?: number;
  is_available?: boolean;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  image_url?: string;
  stock_quantity?: number;
  is_available?: boolean;
}

export class CatalogCommands {
  constructor(private dataStore: IDataStore) {}

  async createProduct(input: CreateProductInput): AsyncResult<{ id: string }, ClassifiedError> {
    try {
      logger.info('[CatalogCommands] Creating product', { input });

      const result = await this.dataStore
        .from('products')
        .insert({
          business_id: input.business_id,
          name: input.name,
          description: input.description,
          price: input.price,
          category: input.category,
          image_url: input.image_url,
          stock_quantity: input.stock_quantity ?? 0,
          is_available: input.is_available ?? true,
        })
        .select('id')
        .single();

      if (!result.success) {
        logger.error('[CatalogCommands] Failed to create product', result.error);
        return Err({
          message: result.error.message || 'Failed to create product',
          code: 'PRODUCT_CREATE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      const productId = result.data.id;

      DomainEvents.emit({
        type: 'product.created',
        payload: { productId, businessId: input.business_id },
        timestamp: Date.now(),
      });

      logger.info('[CatalogCommands] Product created successfully', { productId });

      return Ok({ id: productId });
    } catch (error: any) {
      logger.error('[CatalogCommands] Exception creating product', error);
      return Err({
        message: error.message || 'Unexpected error creating product',
        code: 'PRODUCT_CREATE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async updateProduct(productId: string, updates: UpdateProductInput): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[CatalogCommands] Updating product', { productId, updates });

      const result = await this.dataStore
        .from('products')
        .update(updates)
        .eq('id', productId);

      if (!result.success) {
        logger.error('[CatalogCommands] Failed to update product', result.error);
        return Err({
          message: result.error.message || 'Failed to update product',
          code: 'PRODUCT_UPDATE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'product.updated',
        payload: { productId, updates },
        timestamp: Date.now(),
      });

      logger.info('[CatalogCommands] Product updated successfully', { productId });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[CatalogCommands] Exception updating product', error);
      return Err({
        message: error.message || 'Unexpected error updating product',
        code: 'PRODUCT_UPDATE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async deleteProduct(productId: string): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[CatalogCommands] Deleting product', { productId });

      const result = await this.dataStore
        .from('products')
        .update({ is_available: false })
        .eq('id', productId);

      if (!result.success) {
        logger.error('[CatalogCommands] Failed to delete product', result.error);
        return Err({
          message: result.error.message || 'Failed to delete product',
          code: 'PRODUCT_DELETE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'product.deleted',
        payload: { productId },
        timestamp: Date.now(),
      });

      logger.info('[CatalogCommands] Product deleted successfully', { productId });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[CatalogCommands] Exception deleting product', error);
      return Err({
        message: error.message || 'Unexpected error deleting product',
        code: 'PRODUCT_DELETE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }
}
