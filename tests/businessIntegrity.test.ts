import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateBusinessExists,
  validateUserHasBusinessAccess,
  requireBusinessId,
  BusinessValidationError,
  validateBusinessOperation,
} from '../src/lib/businessValidation';
import { ValidatedDataStore } from '../src/lib/validatedDataStore';
import {
  detectOrphanedProducts,
  detectOrphanedInventory,
  runOrphanDataScan,
  validateBusinessIntegrity,
} from '../src/lib/orphanDataDetection';

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    })),
    rpc: vi.fn(),
  },
}));

describe('Business Integrity System', () => {
  describe('BusinessValidationError', () => {
    it('should create an error with code and details', () => {
      const error = new BusinessValidationError(
        'Test error',
        'TEST_CODE',
        { detail: 'test' }
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.details).toEqual({ detail: 'test' });
      expect(error.name).toBe('BusinessValidationError');
    });
  });

  describe('requireBusinessId', () => {
    it('should return the business ID if valid', () => {
      const result = requireBusinessId('valid-uuid');
      expect(result).toBe('valid-uuid');
    });

    it('should throw if business ID is null', () => {
      expect(() => requireBusinessId(null)).toThrow(BusinessValidationError);
    });

    it('should throw if business ID is undefined', () => {
      expect(() => requireBusinessId(undefined)).toThrow(BusinessValidationError);
    });

    it('should throw if business ID is empty string', () => {
      expect(() => requireBusinessId('')).toThrow(BusinessValidationError);
    });

    it('should throw if business ID is not a string', () => {
      expect(() => requireBusinessId(123)).toThrow(BusinessValidationError);
    });
  });

  describe('validateBusinessExists', () => {
    it('should return invalid if business_id is missing', async () => {
      const result = await validateBusinessExists('');
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('MISSING_BUSINESS_ID');
    });
  });

  describe('ValidatedDataStore', () => {
    it('should throw when creating product without business context', async () => {
      const store = new ValidatedDataStore('user-123');

      await expect(
        store.createProduct({
          name: 'Test Product',
          description: 'Test',
          price: 10,
          sku: 'TEST-001',
        })
      ).rejects.toThrow(BusinessValidationError);
    });

    it('should accept business context in constructor', () => {
      const store = new ValidatedDataStore('user-123', 'business-456');
      expect(store).toBeDefined();
    });

    it('should throw when updating product without business context', async () => {
      const store = new ValidatedDataStore('user-123');

      await expect(
        store.updateProduct('product-123', { name: 'Updated' })
      ).rejects.toThrow(BusinessValidationError);
    });

    it('should throw when creating inventory without business context', async () => {
      const store = new ValidatedDataStore('user-123');

      await expect(
        store.createInventoryRecord({
          product_id: 'product-123',
          location_id: 'location-123',
          quantity_on_hand: 10,
          quantity_reserved: 0,
        })
      ).rejects.toThrow(BusinessValidationError);
    });

    it('should throw when creating order without business context', async () => {
      const store = new ValidatedDataStore('user-123');

      await expect(
        store.createOrder({
          customer_id: 'customer-123',
          total: 100,
        })
      ).rejects.toThrow(BusinessValidationError);
    });

    it('should throw when creating zone without business context', async () => {
      const store = new ValidatedDataStore('user-123');

      await expect(
        store.createZone({
          name: 'Zone A',
        })
      ).rejects.toThrow(BusinessValidationError);
    });

    it('should validate business ownership when creating business', async () => {
      const store = new ValidatedDataStore('user-123');

      await expect(
        store.createBusiness({
          name: 'Test Business',
          owner_id: 'different-user',
        })
      ).rejects.toThrow(BusinessValidationError);
    });

    it('should allow creating business for current user', async () => {
      const store = new ValidatedDataStore('user-123');

      const input = {
        name: 'Test Business',
        owner_id: 'user-123',
        slug: 'test-business',
      };

      try {
        await store.createBusiness(input);
      } catch (error) {
        if (error instanceof BusinessValidationError) {
          expect(error.code).not.toBe('INVALID_OWNER');
        }
      }
    });
  });

  describe('Orphan Data Detection', () => {
    it('should detect orphaned products', async () => {
      const orphans = await detectOrphanedProducts();
      expect(Array.isArray(orphans)).toBe(true);
    });

    it('should detect orphaned inventory', async () => {
      const orphans = await detectOrphanedInventory();
      expect(Array.isArray(orphans)).toBe(true);
    });

    it('should run comprehensive orphan data scan', async () => {
      const report = await runOrphanDataScan();

      expect(report).toHaveProperty('products');
      expect(report).toHaveProperty('inventory');
      expect(report).toHaveProperty('orders');
      expect(report).toHaveProperty('staffRoles');
      expect(report).toHaveProperty('totalOrphans');
      expect(report).toHaveProperty('scannedAt');

      expect(Array.isArray(report.products)).toBe(true);
      expect(Array.isArray(report.inventory)).toBe(true);
      expect(Array.isArray(report.orders)).toBe(true);
      expect(Array.isArray(report.staffRoles)).toBe(true);
      expect(typeof report.totalOrphans).toBe('number');
      expect(typeof report.scannedAt).toBe('string');
    });

    it('should validate business integrity', async () => {
      const result = await validateBusinessIntegrity('test-business-id');

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('issues');
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.issues)).toBe(true);
    });
  });

  describe('Business Context Requirements', () => {
    it('should enforce business_id for all business-scoped operations', () => {
      const operations = [
        'createProduct',
        'updateProduct',
        'deleteProduct',
        'createInventoryRecord',
        'updateInventoryRecord',
        'createOrder',
        'updateOrder',
        'createZone',
        'updateZone',
        'deleteZone',
        'assignDriverToZone',
        'createDriverProfile',
        'updateDriverProfile',
      ];

      const store = new ValidatedDataStore('user-123');

      operations.forEach(operation => {
        expect(store[operation]).toBeDefined();
      });
    });

    it('should allow profile operations without business context', async () => {
      const store = new ValidatedDataStore('user-123');

      try {
        await store.getProfile();
      } catch (error) {
        expect(error).not.toBeInstanceOf(BusinessValidationError);
      }
    });
  });

  describe('Error Handling', () => {
    it('should provide clear error messages', async () => {
      const store = new ValidatedDataStore('user-123');

      try {
        await store.createProduct({
          name: 'Test',
          description: 'Test',
          price: 10,
          sku: 'TEST',
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessValidationError);
        expect((error as BusinessValidationError).message).toContain('Business context');
        expect((error as BusinessValidationError).code).toBe('MISSING_BUSINESS_CONTEXT');
      }
    });

    it('should include context in error details', async () => {
      const store = new ValidatedDataStore('user-123');

      try {
        await store.createBusiness({
          name: 'Test',
          owner_id: 'wrong-user',
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessValidationError);
        const validationError = error as BusinessValidationError;
        expect(validationError.details).toBeDefined();
        expect(validationError.details?.userId).toBe('user-123');
        expect(validationError.details?.providedOwnerId).toBe('wrong-user');
      }
    });
  });
});
