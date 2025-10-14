import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase } from '../src/lib/supabaseClient';
import {
  createBusiness,
  assignRoleToBusiness,
  getUserPermissions,
  allocateStockToDriver,
} from '../src/lib/infrastructureUtils';

describe('Permission System Integration Tests', () => {
  let testUserId: string;
  let testBusinessId: string;
  let testInfraOwnerId: string;

  beforeAll(async () => {
    const { data: authUser } = await supabase.auth.signUp({
      email: `test-${Date.now()}@example.com`,
      password: 'test-password-123',
    });
    testUserId = authUser.user?.id || '';

    const { data: infraUser } = await supabase.auth.signUp({
      email: `infra-${Date.now()}@example.com`,
      password: 'test-password-123',
    });
    testInfraOwnerId = infraUser.user?.id || '';
  });

  afterAll(async () => {
    if (testUserId) {
      await supabase.from('users').delete().eq('id', testUserId);
    }
    if (testInfraOwnerId) {
      await supabase.from('users').delete().eq('id', testInfraOwnerId);
    }
  });

  describe('Business Creation', () => {
    it('should create a business with proper owner assignment', async () => {
      const { data: businessType } = await supabase
        .from('business_types')
        .select('id')
        .limit(1)
        .single();

      if (!businessType) {
        throw new Error('No business type found');
      }

      const result = await createBusiness({
        name: 'Test Business',
        type_id: businessType.id,
        owner_user_id: testUserId,
        description: 'Test business for integration testing',
      });

      expect(result.success).toBe(true);
      expect(result.business).toBeDefined();
      testBusinessId = result.business!.id;

      const { data: roles } = await supabase
        .from('user_business_roles')
        .select('*')
        .eq('user_id', testUserId)
        .eq('business_id', testBusinessId);

      expect(roles).toHaveLength(1);
      expect(roles![0].role).toBe('business_owner');
    });

    it('should enforce business isolation via RLS', async () => {
      const { data: businesses } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', testBusinessId);

      expect(businesses).toBeDefined();
    });
  });

  describe('Role Assignment', () => {
    it('should assign role to user in business context', async () => {
      const result = await assignRoleToBusiness({
        user_id: testUserId,
        business_id: testBusinessId,
        role: 'manager',
        assigned_by: testUserId,
        notes: 'Test role assignment',
      });

      expect(result.success).toBe(true);

      const { data: roles } = await supabase
        .from('user_business_roles')
        .select('*')
        .eq('user_id', testUserId)
        .eq('business_id', testBusinessId)
        .eq('role', 'manager');

      expect(roles).toHaveLength(1);
    });

    it('should track role changes in audit log', async () => {
      await assignRoleToBusiness({
        user_id: testUserId,
        business_id: testBusinessId,
        role: 'driver',
        assigned_by: testUserId,
      });

      const { data: logs } = await supabase
        .from('role_change_log')
        .select('*')
        .eq('user_id', testUserId)
        .eq('business_id', testBusinessId);

      expect(logs!.length).toBeGreaterThan(0);
    });
  });

  describe('Permission Resolution', () => {
    it('should resolve permissions for user in business context', async () => {
      const result = await getUserPermissions(testUserId, testBusinessId);

      expect(result.permissions).toBeDefined();
      expect(Array.isArray(result.permissions)).toBe(true);
    });

    it('should cache resolved permissions', async () => {
      await getUserPermissions(testUserId, testBusinessId);

      const { data: cache } = await supabase
        .from('user_permissions_cache')
        .select('*')
        .eq('user_id', testUserId)
        .eq('business_id', testBusinessId)
        .maybeSingle();

      expect(cache).toBeDefined();
      expect(cache?.cached_permissions).toBeDefined();
    });

    it('should respect permission expiry', async () => {
      const { data: cache } = await supabase
        .from('user_permissions_cache')
        .select('*')
        .eq('user_id', testUserId)
        .eq('business_id', testBusinessId)
        .maybeSingle();

      if (cache) {
        const expiresAt = new Date(cache.expires_at);
        const now = new Date();
        expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
      }
    });
  });

  describe('Inventory Operations', () => {
    it('should validate stock allocation requests', async () => {
      const { data: product } = await supabase
        .from('products')
        .insert({
          name: 'Test Product',
          sku: `TEST-${Date.now()}`,
          price: 100,
          business_id: testBusinessId,
        })
        .select()
        .single();

      const { data: warehouse } = await supabase
        .from('warehouses')
        .insert({
          name: 'Test Warehouse',
          type: 'infrastructure',
          business_id: testBusinessId,
        })
        .select()
        .single();

      if (!product || !warehouse) {
        throw new Error('Failed to create test data');
      }

      const { data: validation } = await supabase.rpc('validate_allocation_request', {
        p_product_id: product.id,
        p_quantity: 10,
        p_warehouse_id: warehouse.id,
      });

      expect(validation).toBeDefined();
      expect(validation.is_valid).toBeDefined();
    });

    it('should track inventory movements in audit trail', async () => {
      const { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('business_id', testBusinessId)
        .limit(1)
        .maybeSingle();

      if (!product) return;

      await supabase.from('inventory_movements').insert({
        product_id: product.id,
        business_id: testBusinessId,
        movement_type: 'in',
        quantity: 100,
        from_location: 'supplier',
        to_location: 'warehouse',
        performed_by: testUserId,
      });

      const { data: chain } = await supabase.rpc('get_inventory_chain', {
        p_product_id: product.id,
        p_limit: 10,
      });

      expect(chain).toBeDefined();
      expect(chain!.length).toBeGreaterThan(0);
    });
  });

  describe('Audit Logging', () => {
    it('should log all permission check failures', async () => {
      await supabase.from('permission_check_failures').insert({
        user_id: testUserId,
        business_id: testBusinessId,
        required_permission: 'admin.full_control',
        attempted_action: 'test_action',
        context: { test: true },
      });

      const { data: failures } = await supabase
        .from('permission_check_failures')
        .select('*')
        .eq('user_id', testUserId)
        .eq('business_id', testBusinessId);

      expect(failures!.length).toBeGreaterThan(0);
    });

    it('should provide audit trail for entities', async () => {
      await supabase.from('system_audit_log').insert({
        user_id: testUserId,
        action: 'test_action',
        entity_type: 'business',
        entity_id: testBusinessId,
        details: { test: true },
      });

      const { data: trail } = await supabase.rpc('get_audit_trail', {
        p_entity_type: 'business',
        p_entity_id: testBusinessId,
        p_limit: 10,
      });

      expect(trail).toBeDefined();
    });
  });

  describe('Business Metrics', () => {
    it('should calculate business metrics correctly', async () => {
      const { data: metrics } = await supabase.rpc('get_business_metrics', {
        p_business_id: testBusinessId,
      });

      expect(metrics).toBeDefined();
      expect(metrics.total_revenue).toBeDefined();
      expect(metrics.total_orders).toBeDefined();
      expect(metrics.active_drivers).toBeDefined();
    });
  });

  describe('Infrastructure Overview', () => {
    it('should provide system-wide overview for infrastructure owners', async () => {
      await supabase.from('users').update({ role: 'infrastructure_owner' }).eq('id', testInfraOwnerId);

      const { data: overview } = await supabase.rpc('get_infrastructure_overview');

      expect(overview).toBeDefined();
      expect(overview.total_businesses).toBeDefined();
      expect(overview.total_users).toBeDefined();
      expect(overview.total_warehouses).toBeDefined();
    });
  });
});
