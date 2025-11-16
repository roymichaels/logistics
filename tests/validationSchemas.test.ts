import { describe, it, expect } from 'vitest';
import {
  userSchema,
  orderSchema,
  createOrderInputSchema,
  productSchema,
  inventoryRecordSchema,
  zoneSchema,
  validateData,
  userRoleSchema,
  orderStatusSchema
} from '../src/lib/validationSchemas';

describe('Validation Schemas', () => {
  describe('userSchema', () => {
    it('should validate a valid user object', () => {
      const validUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        telegram_id: '123456789',
        role: 'driver' as const,
        name: 'John Doe',
        username: 'johndoe',
        phone: '+1234567890'
      };

      const result = validateData(userSchema, validUser);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(validUser.id);
        expect(result.data.role).toBe('driver');
      }
    });

    it('should reject invalid UUID', () => {
      const invalidUser = {
        id: 'invalid-uuid',
        telegram_id: '123456789',
        role: 'driver'
      };

      const result = validateData(userSchema, invalidUser);
      expect(result.success).toBe(false);
    });

    it('should reject invalid role', () => {
      const invalidUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        telegram_id: '123456789',
        role: 'invalid_role'
      };

      const result = validateData(userSchema, invalidUser);
      expect(result.success).toBe(false);
    });
  });

  describe('orderSchema', () => {
    it('should validate a valid order', () => {
      const validOrder = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        customer_name: 'Jane Smith',
        customer_phone: '+1234567890',
        customer_address: '123 Main St',
        status: 'pending' as const,
        items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            product_name: 'Product 1',
            quantity: 2,
            unit_price: 10.50,
            total_price: 21.00
          }
        ],
        total_amount: 21.00,
        created_by: '123e4567-e89b-12d3-a456-426614174002',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const result = validateData(orderSchema, validOrder);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items).toHaveLength(1);
        expect(result.data.status).toBe('pending');
      }
    });

    it('should reject order with negative total amount', () => {
      const invalidOrder = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        customer_name: 'Jane Smith',
        customer_phone: '+1234567890',
        customer_address: '123 Main St',
        status: 'pending',
        items: [],
        total_amount: -10,
        created_by: '123e4567-e89b-12d3-a456-426614174002',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const result = validateData(orderSchema, invalidOrder);
      expect(result.success).toBe(false);
    });

    it('should validate order with valid items', () => {
      const validOrder = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        customer_name: 'Jane Smith',
        customer_phone: '+1234567890',
        customer_address: '123 Main St',
        status: 'pending' as const,
        items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            product_name: 'Product 1',
            quantity: 1,
            unit_price: 21.00,
            total_price: 21.00
          }
        ],
        total_amount: 21.00,
        created_by: '123e4567-e89b-12d3-a456-426614174002',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const result = validateData(orderSchema, validOrder);
      expect(result.success).toBe(true);
    });
  });

  describe('createOrderInputSchema', () => {
    it('should validate a valid order input', () => {
      const validInput = {
        customer_name: 'John Doe',
        customer_phone: '+1234567890',
        customer_address: '456 Oak Ave',
        items: [
          {
            product_id: '123e4567-e89b-12d3-a456-426614174001',
            product_name: 'Product 1',
            quantity: 3,
            unit_price: 15.00,
            total_price: 45.00
          }
        ],
        total_amount: 45.00
      };

      const result = validateData(createOrderInputSchema, validInput);
      expect(result.success).toBe(true);
    });

    it('should require at least one item', () => {
      const invalidInput = {
        customer_name: 'John Doe',
        customer_phone: '+1234567890',
        customer_address: '456 Oak Ave',
        items: [],
        total_amount: 45.00
      };

      const result = validateData(createOrderInputSchema, invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('productSchema', () => {
    it('should validate a valid product', () => {
      const validProduct = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Product',
        sku: 'TEST-001',
        price: 29.99,
        stock_quantity: 100,
        category: 'Electronics',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const result = validateData(productSchema, validProduct);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.price).toBe(29.99);
      }
    });

    it('should reject negative stock quantity', () => {
      const invalidProduct = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Product',
        sku: 'TEST-001',
        price: 29.99,
        stock_quantity: -5,
        category: 'Electronics',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const result = validateData(productSchema, invalidProduct);
      expect(result.success).toBe(false);
    });
  });

  describe('inventoryRecordSchema', () => {
    it('should validate a valid inventory record', () => {
      const validRecord = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        location_id: '123e4567-e89b-12d3-a456-426614174002',
        on_hand_quantity: 50,
        reserved_quantity: 10,
        damaged_quantity: 2,
        low_stock_threshold: 20,
        updated_at: '2024-01-01T00:00:00Z'
      };

      const result = validateData(inventoryRecordSchema, validRecord);
      expect(result.success).toBe(true);
    });

    it('should reject negative quantities', () => {
      const invalidRecord = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        location_id: '123e4567-e89b-12d3-a456-426614174002',
        on_hand_quantity: -5,
        reserved_quantity: 10,
        damaged_quantity: 2,
        low_stock_threshold: 20,
        updated_at: '2024-01-01T00:00:00Z'
      };

      const result = validateData(inventoryRecordSchema, invalidRecord);
      expect(result.success).toBe(false);
    });
  });

  describe('zoneSchema', () => {
    it('should validate a valid zone', () => {
      const validZone = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Downtown Zone',
        code: 'DT-001',
        is_active: true,
        center_lat: 40.7128,
        center_lng: -74.0060,
        radius_km: 5.0,
        created_by: '123e4567-e89b-12d3-a456-426614174001',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const result = validateData(zoneSchema, validZone);
      expect(result.success).toBe(true);
    });

    it('should reject negative radius', () => {
      const invalidZone = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Downtown Zone',
        code: 'DT-001',
        is_active: true,
        radius_km: -5.0,
        created_by: '123e4567-e89b-12d3-a456-426614174001',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const result = validateData(zoneSchema, invalidZone);
      expect(result.success).toBe(false);
    });
  });

  describe('enum schemas', () => {
    it('should validate user roles', () => {
      const validRoles = ['user', 'driver', 'manager', 'dispatcher'];

      validRoles.forEach(role => {
        const result = userRoleSchema.safeParse(role);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid user roles', () => {
      const invalidRoles = ['admin', 'superuser', 'guest'];

      invalidRoles.forEach(role => {
        const result = userRoleSchema.safeParse(role);
        expect(result.success).toBe(false);
      });
    });

    it('should validate order statuses', () => {
      const validStatuses = ['pending', 'confirmed', 'delivered', 'cancelled'];

      validStatuses.forEach(status => {
        const result = orderStatusSchema.safeParse(status);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid order statuses', () => {
      const invalidStatuses = ['shipped', 'processing', 'completed'];

      invalidStatuses.forEach(status => {
        const result = orderStatusSchema.safeParse(status);
        expect(result.success).toBe(false);
      });
    });
  });
});
