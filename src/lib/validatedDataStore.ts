import { logger } from './logger';
import { SupabaseDataStore } from './supabaseDataStore';
import {
  validateBusinessExists,
  validateBusinessOperation,
  requireBusinessId,
  BusinessValidationError,
} from './businessValidation';
import type { DataStore, Product, InventoryRecord } from '../data/types';

export class ValidatedDataStore extends SupabaseDataStore {
  private userId: string;
  private businessId?: string;

  constructor(userId: string, businessId?: string) {
    super(userId, businessId);
    this.userId = userId;
    this.businessId = businessId;
    logger.info('[ValidatedDataStore] Initialized with validation', { userId, businessId });
  }

  private ensureBusinessId(): string {
    if (!this.businessId) {
      throw new BusinessValidationError(
        'Business context is required for this operation',
        'MISSING_BUSINESS_CONTEXT'
      );
    }
    return requireBusinessId(this.businessId);
  }

  private async validateBusinessContext(operationName: string): Promise<void> {
    const businessId = this.ensureBusinessId();

    logger.debug('[ValidatedDataStore] Validating business context', {
      operationName,
      businessId,
      userId: this.userId,
    });

    const result = await validateBusinessExists(businessId);
    if (!result.valid) {
      logger.error('[ValidatedDataStore] Business validation failed', {
        operationName,
        businessId,
        error: result.error,
      });
      throw result.error;
    }
  }

  async createProduct(input: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<{ id: string }> {
    await this.validateBusinessContext('createProduct');

    logger.info('[ValidatedDataStore] Creating product with validation', {
      businessId: this.businessId,
      productName: input.name,
    });

    return super.createProduct(input);
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<void> {
    await this.validateBusinessContext('updateProduct');

    logger.info('[ValidatedDataStore] Updating product with validation', {
      businessId: this.businessId,
      productId: id,
    });

    return super.updateProduct(id, updates);
  }

  async deleteProduct(id: string): Promise<void> {
    await this.validateBusinessContext('deleteProduct');

    logger.info('[ValidatedDataStore] Deleting product with validation', {
      businessId: this.businessId,
      productId: id,
    });

    return super.deleteProduct(id);
  }

  async listProducts(filters?: { category?: string; q?: string }): Promise<Product[]> {
    if (this.businessId) {
      await this.validateBusinessContext('listProducts');
    }

    return super.listProducts(filters);
  }

  async createInventoryRecord(input: Omit<InventoryRecord, 'id'>): Promise<{ id: string }> {
    await this.validateBusinessContext('createInventoryRecord');

    logger.info('[ValidatedDataStore] Creating inventory record with validation', {
      businessId: this.businessId,
      productId: input.product_id,
    });

    return super.createInventoryRecord(input);
  }

  async updateInventoryRecord(id: string, updates: Partial<InventoryRecord>): Promise<void> {
    await this.validateBusinessContext('updateInventoryRecord');

    logger.info('[ValidatedDataStore] Updating inventory record with validation', {
      businessId: this.businessId,
      inventoryId: id,
    });

    return super.updateInventoryRecord(id, updates);
  }

  async createOrder(input: any): Promise<{ id: string }> {
    await this.validateBusinessContext('createOrder');

    logger.info('[ValidatedDataStore] Creating order with validation', {
      businessId: this.businessId,
      customerId: input.customer_id,
    });

    return super.createOrder(input);
  }

  async updateOrder(id: string, updates: any): Promise<void> {
    await this.validateBusinessContext('updateOrder');

    logger.info('[ValidatedDataStore] Updating order with validation', {
      businessId: this.businessId,
      orderId: id,
    });

    return super.updateOrder(id, updates);
  }

  async createZone(input: any): Promise<{ id: string }> {
    await this.validateBusinessContext('createZone');

    logger.info('[ValidatedDataStore] Creating zone with validation', {
      businessId: this.businessId,
      zoneName: input.name,
    });

    return super.createZone(input);
  }

  async updateZone(id: string, updates: any): Promise<void> {
    await this.validateBusinessContext('updateZone');

    logger.info('[ValidatedDataStore] Updating zone with validation', {
      businessId: this.businessId,
      zoneId: id,
    });

    return super.updateZone(id, updates);
  }

  async deleteZone(id: string): Promise<void> {
    await this.validateBusinessContext('deleteZone');

    logger.info('[ValidatedDataStore] Deleting zone with validation', {
      businessId: this.businessId,
      zoneId: id,
    });

    return super.deleteZone(id);
  }

  async createBusiness(input: any): Promise<any> {
    logger.info('[ValidatedDataStore] Creating business', {
      userId: this.userId,
      businessName: input.name,
    });

    if (!input.owner_id || input.owner_id !== this.userId) {
      throw new BusinessValidationError(
        'Cannot create business for another user',
        'INVALID_OWNER',
        { userId: this.userId, providedOwnerId: input.owner_id }
      );
    }

    return super.createBusiness(input);
  }

  async assignDriverToZone(driverId: string, zoneId: string): Promise<void> {
    await this.validateBusinessContext('assignDriverToZone');

    logger.info('[ValidatedDataStore] Assigning driver to zone with validation', {
      businessId: this.businessId,
      driverId,
      zoneId,
    });

    return super.assignDriverToZone(driverId, zoneId);
  }

  async createDriverProfile(input: any): Promise<{ id: string }> {
    await this.validateBusinessContext('createDriverProfile');

    logger.info('[ValidatedDataStore] Creating driver profile with validation', {
      businessId: this.businessId,
      driverId: input.id,
    });

    return super.createDriverProfile(input);
  }

  async updateDriverProfile(id: string, updates: any): Promise<void> {
    await this.validateBusinessContext('updateDriverProfile');

    logger.info('[ValidatedDataStore] Updating driver profile with validation', {
      businessId: this.businessId,
      driverId: id,
    });

    return super.updateDriverProfile(id, updates);
  }
}

export function createValidatedDataStore(userId: string, businessId?: string): ValidatedDataStore {
  return new ValidatedDataStore(userId, businessId);
}
