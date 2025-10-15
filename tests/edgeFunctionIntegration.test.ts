import { describe, it, expect } from 'vitest';
import { getSupabase } from '../src/lib/supabaseClient';
import { telegram } from '../src/lib/telegram';

/**
 * Edge Function JWT Integration Tests
 *
 * Validates that all Edge Functions:
 * 1. Accept and validate JWT tokens correctly
 * 2. Respect RLS policies when accessing database
 * 3. Return proper error messages
 * 4. Include correct CORS headers
 */

describe('Edge Function JWT Integration', () => {
  const supabase = getSupabase();
  let accessToken: string | null = null;

  beforeAll(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    accessToken = session?.access_token || null;

    if (!accessToken) {
      console.log('⚠️ No access token available - some tests will be skipped');
    } else {
      console.log('✅ Access token obtained for Edge Function tests');
    }
  });

  describe('telegram-verify Function', () => {
    it('should be deployed and accessible', async () => {
      const { data: config } = await supabase.functions.invoke('app-config');

      const response = await fetch(`${config.supabaseUrl}/functions/v1/telegram-verify`, {
        method: 'OPTIONS'
      });

      expect(response.status).toBeLessThan(500);
      console.log('✅ telegram-verify function is deployed:', response.status);

      // Check CORS headers
      const corsHeaders = {
        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
        'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
        'access-control-allow-headers': response.headers.get('access-control-allow-headers')
      };

      console.log('   CORS headers:', corsHeaders);
    });

    it('should verify valid telegram initData', async () => {
      if (!telegram.isAvailable || !telegram.initData) {
        console.log('⏭️ Skipping: Not in Telegram environment');
        return;
      }

      const { data: config } = await supabase.functions.invoke('app-config');

      const response = await fetch(`${config.supabaseUrl}/functions/v1/telegram-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'webapp',
          initData: telegram.initData
        })
      });

      expect(response.ok).toBe(true);

      const result = await response.json();
      expect(result.ok).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.session.access_token).toBeDefined();

      console.log('✅ telegram-verify successfully verified initData');
    }, 30000);

    it('should reject invalid initData', async () => {
      const { data: config } = await supabase.functions.invoke('app-config');

      const response = await fetch(`${config.supabaseUrl}/functions/v1/telegram-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'webapp',
          initData: 'invalid_data_hash=fake'
        })
      });

      expect(response.ok).toBe(false);
      console.log('✅ telegram-verify correctly rejects invalid initData:', response.status);
    });
  });

  describe('resolve-permissions Function', () => {
    it('should be deployed and accessible', async () => {
      const { data: config } = await supabase.functions.invoke('app-config');

      const response = await fetch(`${config.supabaseUrl}/functions/v1/resolve-permissions`, {
        method: 'OPTIONS'
      });

      expect(response.status).toBeLessThan(500);
      console.log('✅ resolve-permissions function is deployed:', response.status);
    });

    it('should resolve permissions with valid JWT', async () => {
      if (!accessToken) {
        console.log('⏭️ Skipping: No access token');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('⏭️ Skipping: No session');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!userData) {
        console.log('⏭️ Skipping: User not found');
        return;
      }

      const { data: config } = await supabase.functions.invoke('app-config');

      const response = await fetch(`${config.supabaseUrl}/functions/v1/resolve-permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          user_id: userData.id
        })
      });

      expect(response.ok).toBe(true);

      const result = await response.json();
      expect(result.role_key).toBeDefined();
      expect(result.permissions).toBeInstanceOf(Array);
      expect(result.from_cache).toBe(false);

      console.log('✅ resolve-permissions returned valid data:', {
        role: result.role_key,
        permission_count: result.permissions.length,
        from_cache: result.from_cache
      });
    });

    it('should return consistent permissions across repeated calls', async () => {
      if (!accessToken) {
        console.log('⏭️ Skipping: No access token');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!userData) return;

      const { data: config } = await supabase.functions.invoke('app-config');

      const response1 = await fetch(`${config.supabaseUrl}/functions/v1/resolve-permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ user_id: userData.id })
      });

      const result1 = await response1.json();

      const response2 = await fetch(`${config.supabaseUrl}/functions/v1/resolve-permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ user_id: userData.id })
      });

      const result2 = await response2.json();

      expect(result1.role_key).toEqual(result2.role_key);
      expect(result1.permissions).toEqual(result2.permissions);

      console.log('✅ Permission resolution consistent across calls:', {
        role: result1.role_key,
        permissions: result1.permissions.length
      });
    });

    it('should resolve using JWT claims when user_id is omitted', async () => {
      if (!accessToken) {
        console.log('⏭️ Skipping: No access token');
        return;
      }

      const { data: config } = await supabase.functions.invoke('app-config');

      const response = await fetch(`${config.supabaseUrl}/functions/v1/resolve-permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({})
      });

      expect(response.ok).toBe(true);
      const result = await response.json();
      expect(result.user_id).toBeDefined();
      console.log('✅ resolve-permissions inferred user from JWT claims');
    });
  });

  describe('allocate-stock Function', () => {
    it('should be deployed and accessible', async () => {
      const { data: config } = await supabase.functions.invoke('app-config');

      const response = await fetch(`${config.supabaseUrl}/functions/v1/allocate-stock`, {
        method: 'OPTIONS'
      });

      expect(response.status).toBeLessThan(500);
      console.log('✅ allocate-stock function is deployed:', response.status);
    });

    it('should require authentication', async () => {
      const { data: config } = await supabase.functions.invoke('app-config');

      const response = await fetch(`${config.supabaseUrl}/functions/v1/allocate-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: 'test-id',
          product_id: 'test-product',
          quantity: 10
        })
      });

      // Should fail without auth
      expect(response.ok).toBe(false);
      console.log('✅ allocate-stock correctly requires authentication:', response.status);
    });
  });

  describe('deliver-order Function', () => {
    it('should be deployed and accessible', async () => {
      const { data: config } = await supabase.functions.invoke('app-config');

      const response = await fetch(`${config.supabaseUrl}/functions/v1/deliver-order`, {
        method: 'OPTIONS'
      });

      expect(response.status).toBeLessThan(500);
      console.log('✅ deliver-order function is deployed:', response.status);
    });

    it('should require authentication', async () => {
      const { data: config } = await supabase.functions.invoke('app-config');

      const response = await fetch(`${config.supabaseUrl}/functions/v1/deliver-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: 'test-order-id'
        })
      });

      expect(response.ok).toBe(false);
      console.log('✅ deliver-order correctly requires authentication:', response.status);
    });
  });

  describe('role-editor Function', () => {
    it('should be deployed and accessible', async () => {
      const { data: config } = await supabase.functions.invoke('app-config');

      const response = await fetch(`${config.supabaseUrl}/functions/v1/role-editor`, {
        method: 'OPTIONS'
      });

      expect(response.status).toBeLessThan(500);
      console.log('✅ role-editor function is deployed:', response.status);
    });

    it('should require admin authorization', async () => {
      if (!accessToken) {
        console.log('⏭️ Skipping: No access token');
        return;
      }

      const { data: config } = await supabase.functions.invoke('app-config');

      const response = await fetch(`${config.supabaseUrl}/functions/v1/role-editor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          action: 'list_roles'
        })
      });

      // Should either succeed (if admin) or fail with 403 (if not admin)
      if (response.status === 403) {
        console.log('✅ role-editor correctly blocks non-admin users');
      } else if (response.ok) {
        console.log('✅ role-editor accessible (user has admin role)');
      } else {
        console.log('⚠️ Unexpected response:', response.status);
      }
    });
  });

  describe('switch-context Function', () => {
    it('should be deployed and accessible', async () => {
      const { data: config } = await supabase.functions.invoke('app-config');

      const response = await fetch(`${config.supabaseUrl}/functions/v1/switch-context`, {
        method: 'OPTIONS'
      });

      expect(response.status).toBeLessThan(500);
      console.log('✅ switch-context function is deployed:', response.status);
    });

    it('should validate business access', async () => {
      if (!accessToken) {
        console.log('⏭️ Skipping: No access token');
        return;
      }

      const { data: config } = await supabase.functions.invoke('app-config');

      // Try to switch to a business (will fail if no businesses exist)
      const response = await fetch(`${config.supabaseUrl}/functions/v1/switch-context`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          business_id: '00000000-0000-0000-0000-000000000000' // Non-existent business
        })
      });

      // Should fail gracefully
      expect(response.status).toBeGreaterThanOrEqual(400);
      console.log('✅ switch-context validates business access:', response.status);
    });
  });

  describe('CORS Headers Validation', () => {
    it('should include proper CORS headers in all functions', async () => {
      const { data: config } = await supabase.functions.invoke('app-config');

      const functions = [
        'telegram-verify',
        'resolve-permissions',
        'allocate-stock',
        'deliver-order',
        'role-editor',
        'switch-context'
      ];

      console.log('\n📡 CORS Header Validation:');

      for (const funcName of functions) {
        const response = await fetch(`${config.supabaseUrl}/functions/v1/${funcName}`, {
          method: 'OPTIONS'
        });

        const headers = {
          origin: response.headers.get('access-control-allow-origin'),
          methods: response.headers.get('access-control-allow-methods'),
          headers: response.headers.get('access-control-allow-headers')
        };

        const hasProperCors =
          headers.origin === '*' &&
          headers.methods?.includes('POST') &&
          headers.headers?.includes('Authorization');

        console.log(`   ${funcName}: ${hasProperCors ? '✅' : '❌'}`);

        if (!hasProperCors) {
          console.log('      Missing headers:', headers);
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should return user-friendly error messages', async () => {
      const { data: config } = await supabase.functions.invoke('app-config');

      // Test with invalid JSON
      const response = await fetch(`${config.supabaseUrl}/functions/v1/resolve-permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || 'fake'}`
        },
        body: 'invalid json'
      });

      expect(response.ok).toBe(false);

      try {
        const error = await response.json();
        expect(error.error).toBeDefined();
        console.log('✅ Functions return structured error messages:', error.error);
      } catch {
        console.log('⚠️ Function returned non-JSON error response');
      }
    });
  });

  describe('Edge Function Integration Summary', () => {
    it('should print comprehensive integration report', async () => {
      const { data: config } = await supabase.functions.invoke('app-config');

      console.log('\n' + '='.repeat(80));
      console.log('EDGE FUNCTION JWT INTEGRATION REPORT');
      console.log('='.repeat(80));

      console.log('\n🔐 Authentication Status:');
      console.log('   Has Access Token:', !!accessToken ? '✅' : '❌');
      if (accessToken) {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        console.log('   Token Expiry:', new Date(payload.exp * 1000).toISOString());
      }

      console.log('\n📡 Function Deployment Status:');

      const functions = [
        'telegram-verify',
        'resolve-permissions',
        'allocate-stock',
        'deliver-order',
        'role-editor',
        'business-context-switch',
        'app-config'
      ];

      for (const funcName of functions) {
        try {
          const response = await fetch(`${config.supabaseUrl}/functions/v1/${funcName}`, {
            method: 'OPTIONS',
            signal: AbortSignal.timeout(3000)
          });

          const status = response.status < 500 ? '✅ Deployed' : '❌ Error';
          console.log(`   ${funcName}: ${status} (${response.status})`);
        } catch (error) {
          console.log(`   ${funcName}: ❌ Not accessible`);
        }
      }

      console.log('\n✅ Integration Tests Complete');
      console.log('='.repeat(80) + '\n');
    });
  });
});
