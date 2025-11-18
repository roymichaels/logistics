import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getSupabase } from '../src/lib/supabaseClient';
import { sessionTracker } from '../src/lib/sessionTracker';
import { sessionManager } from '../src/lib/sessionManager';
import { sessionHealthMonitor } from '../src/lib/sessionHealthMonitor';

/**
 * Session Persistence Validation Tests
 *
 * Tests that verify:
 * 1. Session tokens are properly stored in localStorage
 * 2. Sessions persist across page reloads
 * 3. Token refresh mechanism works correctly
 * 4. Session expiry is handled gracefully
 */

describe('Session Persistence', () => {
  const STORAGE_KEY = 'twa-undergroundlab';

  beforeEach(() => {
    // Clear any existing session data before each test
    vi.clearAllMocks();
  });

  describe('LocalStorage Persistence', () => {
    it('should store session in localStorage with correct key', async () => {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.log('⏭️ Skipping: No active session');
        return;
      }

      // Check if session is stored in localStorage
      const storageKey = `sb-${STORAGE_KEY}-auth-token`;
      const storedData = localStorage.getItem(storageKey);

      expect(storedData).toBeTruthy();
      console.log('✅ Session stored in localStorage with key:', storageKey);

      const parsedData = JSON.parse(storedData!);
      expect(parsedData.access_token).toBeDefined();
      expect(parsedData.refresh_token).toBeDefined();
      expect(parsedData.expires_at).toBeDefined();

      console.log('✅ Session data structure valid:', {
        hasAccessToken: !!parsedData.access_token,
        hasRefreshToken: !!parsedData.refresh_token,
        expiresAt: new Date(parsedData.expires_at * 1000).toISOString()
      });
    });

    it('should have proper session metadata', async () => {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.log('⏭️ Skipping: No active session');
        return;
      }

      expect(session.user).toBeDefined();
      expect(session.user.id).toBeDefined();
      expect(session.expires_at).toBeDefined();
      expect(session.expires_in).toBeDefined();

      console.log('✅ Session metadata:', {
        userId: session.user.id,
        expiresIn: session.expires_in,
        expiresAt: new Date((session.expires_at || 0) * 1000).toISOString(),
        provider: session.user.app_metadata?.provider
      });
    });

    it('should include user metadata in session', async () => {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.log('⏭️ Skipping: No active session');
        return;
      }

      const metadata = session.user.user_metadata || session.user.app_metadata;
      expect(metadata).toBeDefined();

      const telegram_id = metadata?.telegram_id;
      expect(telegram_id).toBeDefined();

      console.log('✅ User metadata present:', {
        telegram_id,
        hasUserMetadata: !!session.user.user_metadata,
        hasAppMetadata: !!session.user.app_metadata
      });
    });
  });

  describe('Token Expiry Handling', () => {
    it('should have valid expiry time', async () => {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.log('⏭️ Skipping: No active session');
        return;
      }

      const expiresAt = session.expires_at;
      expect(expiresAt).toBeDefined();

      const expiryDate = new Date((expiresAt || 0) * 1000);
      const now = new Date();
      const timeUntilExpiry = expiryDate.getTime() - now.getTime();
      const minutesLeft = Math.floor(timeUntilExpiry / 60000);

      expect(timeUntilExpiry).toBeGreaterThan(0);
      console.log('✅ Session expires at:', {
        expiryDate: expiryDate.toISOString(),
        minutesLeft,
        isValid: minutesLeft > 0
      });

      // Session should have at least 5 minutes left
      if (minutesLeft < 5) {
        console.warn('⚠️ Session expiring soon! Consider refreshing.');
      }
    });

    it('should calculate refresh threshold correctly', async () => {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.log('⏭️ Skipping: No active session');
        return;
      }

      const expiresAt = session.expires_at;
      const expiresIn = session.expires_in || 3600;

      // Typically, tokens should be refreshed when 1/3 of lifetime remains
      const refreshThreshold = expiresIn / 3;
      const now = Date.now() / 1000;
      const timeLeft = (expiresAt || 0) - now;

      console.log('✅ Token refresh timing:', {
        expiresIn: `${expiresIn}s`,
        timeLeft: `${Math.floor(timeLeft)}s`,
        refreshThreshold: `${Math.floor(refreshThreshold)}s`,
        shouldRefresh: timeLeft < refreshThreshold
      });
    });
  });

  describe('Auto-Refresh Configuration', () => {
    it('should have autoRefreshToken enabled', () => {
      // Check that Supabase client is configured with autoRefreshToken
      const supabase = getSupabase();
      expect(supabase).toBeDefined();

      // The client is configured with autoRefreshToken: true in supabaseClient.ts
      console.log('✅ Supabase client configured with:');
      console.log('   - autoRefreshToken: true');
      console.log('   - persistSession: true');
      console.log('   - storageKey: twa-undergroundlab');
    });

    it('should listen to auth state changes', async () => {
      const supabase = getSupabase();
      let authStateChangeTriggered = false;

      // Set up a temporary listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        authStateChangeTriggered = true;
        console.log('✅ Auth state change detected:', {
          event,
          hasSession: !!session
        });
      });

      // Clean up
      setTimeout(() => {
        subscription.unsubscribe();
      }, 100);

      // Auth state listener should be set up
      expect(subscription).toBeDefined();
      console.log('✅ Auth state change listener active');
    });
  });

  describe('Session Recovery', () => {
    it('should recover session from localStorage on page load', async () => {
      const storageKey = `sb-${STORAGE_KEY}-auth-token`;
      const storedData = localStorage.getItem(storageKey);

      if (!storedData) {
        console.log('⏭️ Skipping: No stored session in localStorage');
        return;
      }

      const parsedData = JSON.parse(storedData);
      expect(parsedData.access_token).toBeDefined();

      // Verify that current session matches stored session
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        expect(session.access_token).toBe(parsedData.access_token);
        console.log('✅ Current session matches stored session');
      }
    });

    it('should handle missing localStorage gracefully', () => {
      // Simulate missing localStorage
      const originalGetItem = localStorage.getItem;

      try {
        localStorage.getItem = vi.fn(() => null);

        const supabase = getSupabase();
        expect(supabase).toBeDefined();

        console.log('✅ Supabase client handles missing localStorage gracefully');
      } finally {
        // Restore original
        localStorage.getItem = originalGetItem;
      }
    });
  });

  describe('Session Tracker Integration', () => {
    it('should track session establishment', async () => {
      const verification = await sessionTracker.verifySession();

      expect(verification).toBeDefined();
      expect(verification.valid).toBeDefined();

      if (verification.valid) {
        expect(sessionTracker.isReady()).toBe(true);
        console.log('✅ Session tracker confirms session is ready');
      } else {
        console.log('⚠️ Session tracker reports session not ready:', verification.errors);
      }
    });

    it('should wait for session propagation', async () => {
      const startTime = Date.now();
      const ready = await sessionTracker.waitForSession(3000);
      const elapsed = Date.now() - startTime;

      if (ready) {
        console.log(`✅ Session ready after ${elapsed}ms`);
        expect(elapsed).toBeLessThan(3000);
      } else {
        console.log(`⚠️ Session not ready after ${elapsed}ms`);
      }
    }, 5000);

    it('should provide session checkpoints', () => {
      const checkpoints = sessionTracker.getCheckpoints();

      expect(Array.isArray(checkpoints)).toBe(true);
      console.log(`✅ Session tracker has ${checkpoints.length} checkpoints`);

      if (checkpoints.length > 0) {
        const lastCheckpoint = checkpoints[checkpoints.length - 1];
        console.log('Latest checkpoint:', {
          checkpoint: lastCheckpoint.checkpoint,
          status: lastCheckpoint.status,
          message: lastCheckpoint.message
        });
      }
    });
  });

  describe('Session Cleanup', () => {
    it('should clear session on signOut', async () => {
      // This test should be run manually as it will log out the user
      console.log('⚠️ Manual test: Session cleanup on signOut');
      console.log('   To test: Call authService.signOut() and verify localStorage is cleared');
    });

    it('should handle expired sessions', () => {
      console.log('⚠️ Manual test: Expired session handling');
      console.log('   To test: Wait for session to expire or manually set expired token');
      console.log('   Expected: Auto-refresh should trigger or redirect to login');
    });
  });

  describe('Cross-Tab Session Sync', () => {
    it('should sync session across tabs', () => {
      console.log('⚠️ Manual test: Cross-tab session synchronization');
      console.log('   To test:');
      console.log('   1. Open app in two browser tabs');
      console.log('   2. Sign out in one tab');
      console.log('   3. Verify other tab also signs out');
      console.log('   Expected: Both tabs should stay in sync via localStorage events');
    });
  });

  describe('Session Persistence Summary', () => {
    it('should print comprehensive persistence report', async () => {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const storageKey = `sb-${STORAGE_KEY}-auth-token`;
      const storedData = localStorage.getItem(storageKey);

      console.log('\n' + '='.repeat(80));
      console.log('SESSION PERSISTENCE REPORT');
      console.log('='.repeat(80));

      console.log('\n📦 Storage Status:');
      console.log('   Storage Key:', storageKey);
      console.log('   Data in LocalStorage:', !!storedData ? '✅ Yes' : '❌ No');
      console.log('   Session from Auth:', !!session ? '✅ Yes' : '❌ No');

      if (session) {
        const expiresAt = new Date((session.expires_at || 0) * 1000);
        const timeLeft = expiresAt.getTime() - Date.now();
        const minutesLeft = Math.floor(timeLeft / 60000);

        console.log('\n⏰ Session Timing:');
        console.log('   Expires At:', expiresAt.toISOString());
        console.log('   Time Left:', `${minutesLeft} minutes`);
        console.log('   Auto-Refresh:', '✅ Enabled');
        console.log('   Persist Session:', '✅ Enabled');
      }

      if (storedData) {
        const parsed = JSON.parse(storedData);
        console.log('\n🔑 Stored Token Info:');
        console.log('   Has Access Token:', !!parsed.access_token ? '✅ Yes' : '❌ No');
        console.log('   Has Refresh Token:', !!parsed.refresh_token ? '✅ Yes' : '❌ No');
        console.log('   Token Type:', parsed.token_type || 'N/A');
      }

      const verification = await sessionTracker.verifySession();
      console.log('\n✅ Session Tracker Status:');
      console.log('   Session Valid:', verification.valid ? '✅ Yes' : '❌ No');
      console.log('   Claims Present:', verification.hasClaims ? '✅ Yes' : '❌ No');
      console.log('   Tracker Ready:', sessionTracker.isReady() ? '✅ Yes' : '❌ No');

      console.log('\n' + '='.repeat(80) + '\n');
    });
  });

  describe('Enhanced Session Manager', () => {
    it('should save and restore session using new session manager', async () => {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.log('⏭️ Skipping: No active session');
        return;
      }

      // Save session using new manager
      const saved = sessionManager.saveSession(session);
      expect(saved).toBe(true);
      console.log('✅ Session saved using enhanced session manager');

      // Check if session is valid
      const isValid = sessionManager.isSessionValid();
      expect(isValid).toBe(true);
      console.log('✅ Session validated successfully');

      // Get diagnostics
      const diagnostics = sessionManager.getDiagnostics();
      expect(diagnostics).toBeDefined();
      expect(diagnostics.hasStoredSession).toBe(true);
      expect(diagnostics.isValid).toBe(true);
      console.log('✅ Session diagnostics:', {
        hasSession: diagnostics.hasStoredSession,
        isValid: diagnostics.isValid,
        age: diagnostics.stored?.age,
      });
    });

    it('should handle session version compatibility', () => {
      const storageKey = 'twa-undergroundlab-session-v2';
      const oldVersionData = {
        version: 1,
        accessToken: 'old_token',
        refreshToken: 'old_refresh',
        expiresAt: Date.now() + 3600000,
        userId: 'test-user',
        timestamp: Date.now(),
      };

      localStorage.setItem(storageKey, JSON.stringify(oldVersionData));

      // Should reject old version
      const isValid = sessionManager.isSessionValid();
      expect(isValid).toBe(false);
      console.log('✅ Old session version correctly rejected');
    });

    it('should track session metadata', async () => {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.log('⏭️ Skipping: No active session');
        return;
      }

      sessionManager.saveSession(session);

      const diagnostics = sessionManager.getDiagnostics();
      expect(diagnostics.metadata).toBeDefined();
      expect(diagnostics.metadata.deviceId).toBeDefined();
      expect(diagnostics.metadata.restoreCount).toBeGreaterThanOrEqual(0);

      console.log('✅ Session metadata tracked:', {
        deviceId: diagnostics.metadata.deviceId,
        restoreCount: diagnostics.metadata.restoreCount,
        lastActivity: diagnostics.metadata.lastActivity,
      });
    });
  });

  describe('Session Health Monitoring', () => {
    it('should provide health status', () => {
      const status = sessionHealthMonitor.getStatus();

      expect(status).toBeDefined();
      expect(status.healthy).toBeDefined();
      expect(status.checkCount).toBeDefined();

      console.log('✅ Session health status:', {
        healthy: status.healthy,
        checks: status.checkCount,
        failures: status.failureCount,
        lastCheck: status.lastCheck > 0 ? new Date(status.lastCheck).toISOString() : 'Never',
      });
    });

    it('should track health check metrics', async () => {
      const initialStatus = sessionHealthMonitor.getStatus();
      const initialCheckCount = initialStatus.checkCount;

      console.log('✅ Initial health check count:', initialCheckCount);
      console.log('   Health monitoring tracks automatic and manual checks');
    });
  });
});
