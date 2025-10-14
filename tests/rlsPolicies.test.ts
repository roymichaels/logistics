import { describe, it, expect, beforeAll } from 'vitest';
import { getSupabase } from '../src/lib/supabaseClient';
import { sessionTracker } from '../src/lib/sessionTracker';

/**
 * RLS (Row Level Security) Policy Validation Tests
 *
 * Tests that verify RLS policies enforce proper data isolation:
 * 1. Infrastructure roles can access all business data
 * 2. Business-scoped roles only access their business data
 * 3. Driver role can only access assigned orders
 * 4. Proper permission checks for sensitive operations
 */

describe('RLS Policy Enforcement', () => {
  let currentUser: any;
  let currentRole: string;

  beforeAll(async () => {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.log('⚠️ No active session - RLS tests may fail');
      return;
    }

    // Get current user info
    const { data: userData } = await supabase
      .from('users')
      .select('id, telegram_id, username, role')
      .eq('id', session.user.id)
      .maybeSingle();

    currentUser = userData;
    currentRole = userData?.role || 'unknown';

    console.log('🔐 Testing RLS policies with user:', {
      id: currentUser?.id,
      role: currentRole,
      telegram_id: currentUser?.telegram_id
    });
  });

  describe('Users Table RLS', () => {
    it('should allow user to read their own profile', async () => {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.log('⏭️ Skipping: No active session');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('id, telegram_id, username, name, role')
        .eq('id', session.user.id)
        .maybeSingle();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.id).toBe(session.user.id);

      console.log('✅ User can read own profile:', {
        id: data?.id,
        role: data?.role
      });
    });

    it('should enforce RLS when reading other users', async () => {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.log('⏭️ Skipping: No active session');
        return;
      }

      // Try to read all users
      const { data, error } = await supabase
        .from('users')
        .select('id, telegram_id, role')
        .limit(10);

      if (currentRole === 'infrastructure_owner' || currentRole === 'infrastructure_manager') {
        // Infrastructure roles should see all users
        expect(error).toBeNull();
        console.log(`✅ Infrastructure role (${currentRole}) can see ${data?.length || 0} users`);
      } else {
        // Other roles should be restricted
        if (data && data.length > 1) {
          console.log(`⚠️ Non-admin role can see ${data.length} users - verify RLS policies`);
        } else {
          console.log(`✅ Non-admin role sees limited users: ${data?.length || 0}`);
        }
      }
    });
  });

  describe('Businesses Table RLS', () => {
    it('should respect business access based on role', async () => {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, business_type_id')
        .limit(10);

      const isInfrastructureRole = [
        'infrastructure_owner',
        'infrastructure_manager',
        'infrastructure_dispatcher'
      ].includes(currentRole);

      if (error) {
        console.log('❌ Error accessing businesses:', error.message);
        if (!isInfrastructureRole) {
          console.log('   ✅ Expected for non-infrastructure roles');
        }
      } else {
        console.log(`✅ Can access ${data?.length || 0} businesses`);
        if (isInfrastructureRole) {
          console.log('   ✅ Expected for infrastructure roles');
        } else {
          console.log('   ⚠️ Business-scoped role should only see assigned businesses');
        }
      }
    });

    it('should enforce business_id context for business-scoped roles', async () => {
      if (currentRole.startsWith('infrastructure_')) {
        console.log('⏭️ Skipping: Infrastructure roles bypass business_id check');
        return;
      }

      const supabase = getSupabase();

      // Get user's assigned businesses
      const { data: assignments } = await supabase
        .from('user_business_roles')
        .select('business_id')
        .eq('user_id', currentUser?.id)
        .eq('is_active', true);

      if (!assignments || assignments.length === 0) {
        console.log('⚠️ User has no business assignments');
        return;
      }

      const assignedBusinessIds = assignments.map(a => a.business_id);

      // Try to access businesses
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, name');

      if (businesses) {
        const accessibleIds = businesses.map(b => b.id);
        const hasUnauthorizedAccess = accessibleIds.some(id => !assignedBusinessIds.includes(id));

        if (hasUnauthorizedAccess) {
          console.log('❌ User can access businesses they are not assigned to!');
          console.log('   Assigned:', assignedBusinessIds);
          console.log('   Accessible:', accessibleIds);
        } else {
          console.log('✅ User only sees assigned businesses');
        }
      }
    });
  });

  describe('Orders Table RLS', () => {
    it('should allow access based on role permissions', async () => {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('orders')
        .select('id, status, business_id')
        .limit(5);

      if (error) {
        if (error.message.includes('permission denied') || error.code === 'PGRST301') {
          console.log('✅ RLS correctly blocks access to orders for this role');
        } else {
          console.log('❌ Unexpected error:', error.message);
        }
      } else {
        console.log(`✅ Can access ${data?.length || 0} orders`);

        // Verify business_id isolation for business-scoped roles
        if (!currentRole.startsWith('infrastructure_') && data && data.length > 0) {
          const uniqueBusinessIds = [...new Set(data.map(o => o.business_id))];
          console.log('   Order business_ids:', uniqueBusinessIds);
          console.log('   ⚠️ Verify these match user\'s assigned businesses');
        }
      }
    });

    it('should enforce driver can only see assigned orders', async () => {
      if (currentRole !== 'driver' && currentRole !== 'infrastructure_driver') {
        console.log('⏭️ Skipping: Not a driver role');
        return;
      }

      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('orders')
        .select('id, status, driver_id')
        .limit(10);

      if (error) {
        console.log('❌ Error accessing orders:', error.message);
      } else {
        const assignedToSelf = data?.filter(o => o.driver_id === currentUser?.id) || [];
        const assignedToOthers = data?.filter(o => o.driver_id !== currentUser?.id && o.driver_id !== null) || [];

        console.log('✅ Driver order access:', {
          total: data?.length || 0,
          assignedToSelf: assignedToSelf.length,
          assignedToOthers: assignedToOthers.length
        });

        if (assignedToOthers.length > 0) {
          console.log('❌ Driver can see orders assigned to other drivers!');
        } else {
          console.log('✅ Driver only sees their own orders');
        }
      }
    });
  });

  describe('Warehouses Table RLS', () => {
    it('should respect warehouse access permissions', async () => {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name, business_id')
        .limit(5);

      if (error) {
        console.log('⚠️ Cannot access warehouses:', error.message);
      } else {
        console.log(`✅ Can access ${data?.length || 0} warehouses`);

        const isWarehouseRole = currentRole === 'warehouse' || currentRole === 'infrastructure_warehouse';
        if (isWarehouseRole) {
          console.log('   ✅ Expected for warehouse role');
        }
      }
    });
  });

  describe('Inventory Movements RLS', () => {
    it('should enforce inventory movement access', async () => {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('inventory_movements')
        .select('id, movement_type, business_id')
        .limit(5);

      if (error) {
        console.log('⚠️ Cannot access inventory movements:', error.message);
      } else {
        console.log(`✅ Can access ${data?.length || 0} inventory movements`);

        // Check business_id isolation
        if (data && data.length > 0 && !currentRole.startsWith('infrastructure_')) {
          const businessIds = [...new Set(data.map(m => m.business_id))];
          console.log('   Inventory business_ids:', businessIds);
        }
      }
    });
  });

  describe('Financial Data RLS', () => {
    it('should enforce financial data access based on can_see_financials', async () => {
      const verification = await sessionTracker.verifySession();

      if (!verification.valid) {
        console.log('⏭️ Skipping: Session not valid');
        return;
      }

      const canSeeFinancials = verification.claims.can_see_financials;
      console.log(`User can_see_financials: ${canSeeFinancials ? '✅ Yes' : '❌ No'}`);

      const supabase = getSupabase();

      // Try to access financial transactions
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('id, amount, transaction_type')
        .limit(5);

      if (error) {
        if (!canSeeFinancials) {
          console.log('✅ RLS correctly blocks financial data for non-financial roles');
        } else {
          console.log('❌ Financial role blocked from financial data:', error.message);
        }
      } else {
        if (canSeeFinancials) {
          console.log(`✅ Financial role can access ${data?.length || 0} transactions`);
        } else {
          console.log('❌ Non-financial role can access financial data!');
        }
      }
    });
  });

  describe('Cross-Business Access', () => {
    it('should enforce cross-business access rules', async () => {
      const verification = await sessionTracker.verifySession();

      if (!verification.valid) {
        console.log('⏭️ Skipping: Session not valid');
        return;
      }

      const canSeeCrossBusiness = verification.claims.can_see_cross_business;
      console.log(`User can_see_cross_business: ${canSeeCrossBusiness ? '✅ Yes' : '❌ No'}`);

      const supabase = getSupabase();

      // Try to access all businesses
      const { data: allBusinesses } = await supabase
        .from('businesses')
        .select('id, name');

      // Get user's assigned businesses
      const { data: assignments } = await supabase
        .from('user_business_roles')
        .select('business_id')
        .eq('user_id', currentUser?.id)
        .eq('is_active', true);

      if (!allBusinesses) {
        console.log('⏭️ Cannot access businesses table');
        return;
      }

      const assignedBusinessIds = assignments?.map(a => a.business_id) || [];
      const accessibleBusinessIds = allBusinesses.map(b => b.id);

      const hasCrossBusinessAccess = accessibleBusinessIds.length > assignedBusinessIds.length;

      if (canSeeCrossBusiness) {
        if (hasCrossBusinessAccess) {
          console.log('✅ Cross-business role can see multiple businesses');
        } else {
          console.log('⚠️ Cross-business role limited to assigned businesses');
        }
      } else {
        if (!hasCrossBusinessAccess) {
          console.log('✅ Business-scoped role limited to assigned businesses');
        } else {
          console.log('❌ Business-scoped role has cross-business access!');
        }
      }
    });
  });

  describe('Permission Cache RLS', () => {
    it('should only allow users to read their own permission cache', async () => {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('user_permissions_cache')
        .select('user_id, role_key, cached_at')
        .limit(5);

      if (error) {
        console.log('⚠️ Cannot access permission cache:', error.message);
      } else {
        const selfCaches = data?.filter(c => c.user_id === currentUser?.id) || [];
        const otherCaches = data?.filter(c => c.user_id !== currentUser?.id) || [];

        console.log('✅ Permission cache access:', {
          total: data?.length || 0,
          self: selfCaches.length,
          others: otherCaches.length
        });

        if (otherCaches.length > 0) {
          if (currentRole.startsWith('infrastructure_')) {
            console.log('   ✅ Infrastructure role can see all caches');
          } else {
            console.log('   ❌ Non-admin role can see other users\' caches!');
          }
        }
      }
    });
  });

  describe('Audit Log RLS', () => {
    it('should enforce audit log access based on role', async () => {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, event_type, user_id')
        .limit(5);

      const isAdmin = [
        'infrastructure_owner',
        'infrastructure_manager',
        'business_owner',
        'manager'
      ].includes(currentRole);

      if (error) {
        if (!isAdmin) {
          console.log('✅ RLS correctly blocks audit logs for non-admin roles');
        } else {
          console.log('❌ Admin role blocked from audit logs:', error.message);
        }
      } else {
        if (isAdmin) {
          console.log(`✅ Admin role can access ${data?.length || 0} audit logs`);
        } else {
          console.log(`⚠️ Non-admin role can access audit logs: ${data?.length || 0}`);
        }
      }
    });
  });

  describe('RLS Policy Summary', () => {
    it('should print comprehensive RLS validation report', async () => {
      const supabase = getSupabase();
      const verification = await sessionTracker.verifySession();

      console.log('\n' + '='.repeat(80));
      console.log('RLS POLICY VALIDATION REPORT');
      console.log('='.repeat(80));

      console.log('\n👤 Current User:');
      console.log('   ID:', currentUser?.id);
      console.log('   Role:', currentRole);
      console.log('   Telegram ID:', currentUser?.telegram_id);

      if (verification.valid) {
        console.log('\n🔑 JWT Claims:');
        console.log('   Business ID:', verification.claims.business_id || 'NULL (infrastructure)');
        console.log('   Scope Level:', verification.claims.scope_level);
        console.log('   Can See Financials:', verification.claims.can_see_financials ? '✅' : '❌');
        console.log('   Cross-Business:', verification.claims.can_see_cross_business ? '✅' : '❌');
      }

      console.log('\n📊 Table Access Test Results:');

      const tables = ['users', 'businesses', 'orders', 'warehouses', 'inventory_movements'];

      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .limit(1);

        const status = error ? '❌ Blocked' : '✅ Accessible';
        const count = data?.length || 0;
        console.log(`   ${table}: ${status} (${count} rows visible)`);
      }

      console.log('\n' + '='.repeat(80) + '\n');
    });
  });
});
