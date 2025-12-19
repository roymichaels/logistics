/**
 * Unified Diagnostics System
 *
 * FRONTEND-ONLY MODE: Diagnostics adapted for wallet-based authentication
 * No Supabase backend - all authentication via wallet signatures
 * Provides debugging utilities for frontend-only architecture
 */

import { logger } from './logger';
import type { User } from '../data/types';
import { ROLE_PERMISSIONS, hasPermission } from './rolePermissions';
import { authService } from './authService';
import { localSessionManager } from './localSessionManager';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface AuthDebugInfo {
  hasSession: boolean;
  sessionValid: boolean;
  userId: string | null;
  email: string | null;
  appMetadata: Record<string, any>;
  userMetadata: Record<string, any>;
  claims: {
    telegram_id?: string;
    role?: string;
    app_role?: string;
    workspace_id?: string;
    user_id?: string;
  };
  accessToken: string | null;
  expiresAt: number | null;
}

export interface DiagnosticResult {
  timestamp: string;
  checks: {
    telegramData: { status: 'pass' | 'fail' | 'skip'; details: any };
    session: { status: 'pass' | 'fail'; details: any };
    jwtClaims: { status: 'pass' | 'fail'; details: any };
    userRecord: { status: 'pass' | 'fail' | 'skip'; details: any };
  };
  summary: string;
  recommendations: string[];
}

export interface InitializationStatus {
  supabaseInitialized: boolean;
  telegramAvailable: boolean;
  telegramInitData: boolean;
  telegramUser: boolean;
  timestamp: string;
  userAgent: string;
  location: string;
}

export interface RoleDiagnosticReport {
  userId: string;
  userName: string;
  role: string;
  businessId: string | null;
  roleLevel: 'infrastructure' | 'business';
  expectedDashboard: string;
  hasCreateBusinessPermission: boolean;
  hasViewAllBusinessesPermission: boolean;
  canSeeCrossBusinessData: boolean;
  canSeeFinancials: boolean;
  requiresBusinessContext: boolean;
  issues: string[];
  recommendations: string[];
}

export interface ProfileFetchAttempt {
  timestamp: number;
  success: boolean;
  source: string;
  forceRefresh: boolean;
  cacheHit: boolean;
  duration: number;
  error?: string;
  userData?: Partial<User>;
}

// ============================================================================
// Authentication Diagnostics
// ============================================================================

export namespace AuthDiagnostics {
  /**
   * Get current wallet session debug info
   */
  export async function getDebugInfo(): Promise<AuthDebugInfo> {
    logger.info('[FRONTEND-ONLY] Getting wallet session debug info');

    const session = localSessionManager.getSession();
    const authState = authService.getState();

    if (!session || !authState.isAuthenticated) {
      return {
        hasSession: false,
        sessionValid: false,
        userId: null,
        email: null,
        appMetadata: {},
        userMetadata: {},
        claims: {},
        accessToken: null,
        expiresAt: null
      };
    }

    return {
      hasSession: true,
      sessionValid: localSessionManager.isValid(),
      userId: session.wallet,
      email: null,
      appMetadata: { role: session.role, walletType: session.walletType },
      userMetadata: {},
      claims: {
        role: session.role,
        user_id: session.wallet,
      },
      accessToken: session.signature,
      expiresAt: Math.floor(session.expiresAt / 1000)
    };
  }

  /**
   * Log formatted authentication debug info
   */
  export async function logDebug(): Promise<void> {
    const info = await getDebugInfo();

    console.group('🔐 Authentication Debug Info');
    logger.info('Session Status:', info.hasSession ? '✅ Active' : '❌ No Session');
    logger.info('Session Valid:', info.sessionValid ? '✅ Valid' : '⚠️ Expired');
    logger.info('User ID:', info.userId || 'N/A');
    logger.info('Email:', info.email || 'N/A');

    console.group('📋 JWT Claims (app_metadata)');
    logger.info('role:', info.claims.role || '❌ MISSING');
    logger.info('app_role:', info.claims.app_role || '⚠️ Not set');
    logger.info('workspace_id:', info.claims.workspace_id || '⚠️ Not set');
    logger.info('user_id:', info.claims.user_id || '⚠️ Not set');
    logger.info('telegram_id:', info.claims.telegram_id || '❌ MISSING');
    console.groupEnd();

    logger.info('Full app_metadata:', info.appMetadata);
    logger.info('Full user_metadata:', info.userMetadata);

    if (info.expiresAt) {
      const expiresIn = info.expiresAt - Math.floor(Date.now() / 1000);
      logger.info('Expires in:', expiresIn > 0 ? `${Math.floor(expiresIn / 60)} minutes` : 'EXPIRED');
    }

    console.groupEnd();
  }

  /**
   * Check if session has required claims for user management
   */
  export async function validateUserManagementAccess(): Promise<{
    hasAccess: boolean;
    missingClaims: string[];
    role: string | null;
  }> {
    const info = await getDebugInfo();

    if (!info.hasSession || !info.sessionValid) {
      return {
        hasAccess: false,
        missingClaims: ['Session'],
        role: null
      };
    }

    const requiredClaims = ['role', 'user_id', 'telegram_id'];
    const missingClaims = requiredClaims.filter(claim => {
      return !info.claims[claim as keyof typeof info.claims];
    });

    const managementRoles = ['infrastructure_owner', 'owner', 'business_owner', 'manager'];
    const hasManagementRole = info.claims.role && managementRoles.includes(info.claims.role);

    return {
      hasAccess: hasManagementRole && missingClaims.length === 0,
      missingClaims,
      role: info.claims.role || null
    };
  }

  /**
   * Test RLS access (not available in frontend-only mode)
   */
  export async function testRLSAccess(): Promise<any> {
    logger.warn('[FRONTEND-ONLY] RLS not available - no database backend');
    return { error: 'RLS not available in frontend-only mode' };
  }

  /**
   * Run comprehensive authentication diagnostics
   */
  export async function runFullDiagnostics(): Promise<DiagnosticResult> {
    logger.info('🔍 Running authentication diagnostics...');

    const result: DiagnosticResult = {
      timestamp: new Date().toISOString(),
      checks: {
        telegramData: { status: 'skip', details: {} },
        session: { status: 'fail', details: {} },
        jwtClaims: { status: 'fail', details: {} },
        userRecord: { status: 'skip', details: {} }
      },
      summary: '',
      recommendations: []
    };

    // Check 1: Telegram WebApp data
    logger.info('\n📱 Check 1: Telegram WebApp Data');
    try {
      const WebApp = (window as any)?.Telegram?.WebApp;
      if (WebApp) {
        const initData = WebApp.initData || '';
        const user = WebApp.initDataUnsafe?.user;

        result.checks.telegramData = {
          status: initData && user ? 'pass' : 'fail',
          details: {
            hasInitData: !!initData,
            initDataLength: initData.length,
            hasUser: !!user,
            userId: user?.id,
            username: user?.username,
            firstName: user?.first_name
          }
        };

        if (initData && user) {
          logger.info('✅ Telegram data available', result.checks.telegramData.details);
        } else {
          logger.error('❌ Telegram data missing or incomplete', result.checks.telegramData.details);
          result.recommendations.push('App must be opened from Telegram to access WebApp data');
        }
      } else {
        result.checks.telegramData.status = 'fail';
        result.checks.telegramData.details = { error: 'Telegram WebApp SDK not loaded' };
        logger.error('❌ Telegram WebApp SDK not available');
        result.recommendations.push('Ensure app is running inside Telegram Mini App');
      }
    } catch (err) {
      result.checks.telegramData.status = 'fail';
      result.checks.telegramData.details = { error: String(err) };
      logger.error('❌ Error checking Telegram data', err);
    }

    // Check 2: Wallet session
    logger.info('\n🔐 Check 2: Wallet Session');
    try {
      const session = localSessionManager.getSession();
      const error = null;

      if (error) {
        result.checks.session = {
          status: 'fail',
          details: { error: error.message }
        };
        logger.error('❌ Session error', error);
        result.recommendations.push('Check Supabase configuration and network connectivity');
      } else if (!session) {
        result.checks.session = {
          status: 'fail',
          details: { error: 'No active wallet session' }
        };
        logger.error('❌ No active wallet session');
        result.recommendations.push('Authentication may have failed - connect wallet to authenticate');
      } else {
        result.checks.session = {
          status: 'pass',
          details: {
            userId: session.wallet,
            walletType: session.walletType,
            role: session.role,
            expiresAt: session.expiresAt
          }
        };
        logger.info('✅ Wallet session active', result.checks.session.details);

        // Check 3: Session Claims
        logger.info('\n🎫 Check 3: Session Claims');
        const claims = {
          wallet: session.wallet,
          walletType: session.walletType,
          role: session.role
        };

        const requiredClaims = ['wallet', 'walletType', 'role'];
        const missingClaims = requiredClaims.filter(c => !claims[c as keyof typeof claims]);

        result.checks.jwtClaims = {
          status: missingClaims.length === 0 ? 'pass' : 'fail',
          details: {
            claims,
            missingClaims,
            hasAllRequired: missingClaims.length === 0
          }
        };

        if (missingClaims.length === 0) {
          logger.info('✅ All required session claims present', claims);
        } else {
          logger.error('❌ Missing session claims:', missingClaims);
          result.recommendations.push('Session missing required claims - wallet authentication may have failed');
        }

        if (typeof window !== 'undefined') {
          (window as any).__SESSION_CLAIMS__ = claims;
        }

        // Check 4: User record (skip in frontend-only mode)
        logger.info('\n👤 Check 4: User Record (Frontend-Only Mode)');
        result.checks.userRecord = {
          status: 'pass',
          details: {
            wallet: session.wallet,
            role: session.role,
            note: 'Frontend-only mode - no database backend'
          }
        };
        logger.info('✅ Frontend-only mode active - wallet auth working');
      }
    } catch (err) {
      logger.error('❌ Error during session check', err);
    }

    // Generate summary
    const statuses = Object.values(result.checks)
      .filter(c => c.status !== 'skip')
      .map(c => c.status);

    const passCount = statuses.filter(s => s === 'pass').length;
    const totalCount = statuses.length;

    if (passCount === totalCount) {
      result.summary = '✅ All checks passed - authentication is working correctly';
    } else if (passCount === 0) {
      result.summary = '❌ All checks failed - authentication is not working';
    } else {
      result.summary = `⚠️ ${passCount}/${totalCount} checks passed - authentication is partially working`;
    }

    logger.info('\n' + '='.repeat(60));
    logger.info(result.summary);
    logger.info('='.repeat(60));

    if (result.recommendations.length > 0) {
      logger.info('\n💡 Recommendations:');
      result.recommendations.forEach((rec, i) => {
        logger.info(`${i + 1}. ${rec}`);
      });
    }

    logger.info('\n📊 Full diagnostic result stored in window.__AUTH_DIAGNOSTICS__');
    if (typeof window !== 'undefined') {
      (window as any).__AUTH_DIAGNOSTICS__ = result;
    }

    return result;
  }
}

// ============================================================================
// Initialization Diagnostics
// ============================================================================

export namespace InitDiagnostics {
  export function getStatus(): InitializationStatus {
    const tg = (window as any).Telegram?.WebApp;

    return {
      supabaseInitialized: !!(window as any).__SUPABASE_INITIALIZED__,
      telegramAvailable: !!(window as any).Telegram?.WebApp,
      telegramInitData: !!(tg?.initData && tg.initData.length > 0),
      telegramUser: !!tg?.initDataUnsafe?.user,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      location: window.location.href,
    };
  }

  export function logStatus() {
    const status = getStatus();
    logger.info('📊 Initialization Status:', status);

    if (!status.supabaseInitialized) {
      logger.warn('⚠️ Supabase is not initialized');
    }

    if (!status.telegramAvailable) {
      logger.warn('⚠️ Telegram WebApp SDK is not available');
    }

    if (!status.telegramInitData) {
      logger.warn('⚠️ Telegram initData is empty');
    }

    if (!status.telegramUser) {
      logger.warn('⚠️ Telegram user data is not available');
    }

    return status;
  }

  export function runFullDiagnostics() {
    logger.info('🔍 === FULL INITIALIZATION DIAGNOSTICS ===');

    const status = logStatus();

    logger.info('\n📦 Window Objects:');
    logger.info('  __SUPABASE_CLIENT__:', !!(window as any).__SUPABASE_CLIENT__);
    logger.info('  __SUPABASE_INITIALIZED__:', !!(window as any).__SUPABASE_INITIALIZED__);
    logger.info('  __SUPABASE_SESSION__:', !!(window as any).__SUPABASE_SESSION__);
    logger.info('  __JWT_CLAIMS__:', !!(window as any).__JWT_CLAIMS__);
    logger.info('  Browser Environment:', 'Standard web browser');

    if ((window as any).__SUPABASE_SESSION__) {
      const session = (window as any).__SUPABASE_SESSION__;
      logger.info('\n🔐 Session Details:');
      logger.info('  user.id:', session.user?.id);
      logger.info('  access_token length:', session.access_token?.length || 0);
      logger.info('  expires_at:', session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'none');
    }

    if ((window as any).__JWT_CLAIMS__) {
      logger.info('\n🎫 JWT Claims:', (window as any).__JWT_CLAIMS__);
    }

    logger.info('\n🔍 === END DIAGNOSTICS ===\n');

    return status;
  }
}

// ============================================================================
// Role Diagnostics
// ============================================================================

export namespace RoleDiagnostics {
  /**
   * Generate a comprehensive diagnostic report for a user's role and permissions
   */
  export function generateReport(user: User | null): RoleDiagnosticReport | null {
    if (!user) {
      logger.warn('⚠️ Cannot generate role diagnostic: user is null');
      return null;
    }

    const roleInfo = ROLE_PERMISSIONS[user.role];
    if (!roleInfo) {
      logger.error('❌ Invalid role detected:', user.role);
      return null;
    }

    const issues: string[] = [];
    const recommendations: string[] = [];

    if (user.role === 'infrastructure_owner' && user.business_id) {
      issues.push('Infrastructure owner should not have business_id set');
      recommendations.push('Set business_id to NULL for infrastructure owners');
    }

    if (user.role === 'business_owner' && !user.business_id) {
      // Note: business_owner without business_id is valid - they may not have created a business yet
      recommendations.push('Business owner can create a business through the Businesses page');
    }

    let expectedDashboard = 'Unknown';
    switch (user.role) {
      case 'infrastructure_owner':
        expectedDashboard = 'InfrastructureOwnerDashboard';
        break;
      case 'business_owner':
        expectedDashboard = 'BusinessOwnerDashboard';
        break;
      case 'manager':
        expectedDashboard = 'ManagerDashboard';
        break;
      case 'driver':
        expectedDashboard = 'DriverDashboard';
        break;
      case 'warehouse':
        expectedDashboard = 'WarehouseDashboard';
        break;
      case 'dispatcher':
        expectedDashboard = 'DispatchBoard';
        break;
      case 'sales':
      case 'customer_service':
        expectedDashboard = 'Orders';
        break;
      default:
        expectedDashboard = 'UserWelcome';
    }

    return {
      userId: user.id,
      userName: user.name || 'Unknown',
      role: user.role,
      businessId: user.business_id || null,
      roleLevel: roleInfo.level,
      expectedDashboard,
      hasCreateBusinessPermission: hasPermission(user, 'business:create'),
      hasViewAllBusinessesPermission: hasPermission(user, 'business:view_all'),
      canSeeCrossBusinessData: roleInfo.canSeeCrossBusinessData,
      canSeeFinancials: roleInfo.canSeeFinancials,
      requiresBusinessContext: user.role !== 'infrastructure_owner',
      issues,
      recommendations
    };
  }

  /**
   * Verify role consistency between different parts of the system
   */
  export function verifyConsistency(
    user: User,
    jwtRole?: string,
    dbRole?: string
  ): { consistent: boolean; issues: string[] } {
    const issues: string[] = [];

    if (jwtRole && jwtRole !== user.role) {
      issues.push(`JWT role (${jwtRole}) does not match user object role (${user.role})`);
    }

    if (dbRole && dbRole !== user.role) {
      issues.push(`Database role (${dbRole}) does not match user object role (${user.role})`);
    }

    if (jwtRole && dbRole && jwtRole !== dbRole) {
      issues.push(`JWT role (${jwtRole}) does not match database role (${dbRole})`);
    }

    return {
      consistent: issues.length === 0,
      issues
    };
  }

  /**
   * Check if a user should see the "Create Business" button
   */
  export function shouldShowCreateBusinessButton(user: User | null): {
    show: boolean;
    reason: string;
  } {
    if (!user) {
      return { show: false, reason: 'User is not authenticated' };
    }

    // Both infrastructure_owner and business_owner can create businesses
    const canCreateBusiness =
      user.role === 'infrastructure_owner' ||
      (user as any).global_role === 'infrastructure_owner' ||
      user.role === 'business_owner' ||
      (user as any).global_role === 'business_owner';

    if (!canCreateBusiness) {
      return {
        show: false,
        reason: `Role '${user.role}' does not have permission to create businesses. Only 'infrastructure_owner' and 'business_owner' can create businesses.`
      };
    }

    if (!hasPermission(user, 'business:create')) {
      return {
        show: false,
        reason: 'User does not have business:create permission. This indicates a permission system misconfiguration.'
      };
    }

    return {
      show: true,
      reason: `User with role '${user.role}' has business:create permission`
    };
  }

  /**
   * Determine which dashboard component should be rendered for a user
   */
  export function getDashboardComponent(user: User | null): {
    component: string;
    props: Record<string, any>;
    warnings: string[];
  } {
    const warnings: string[] = [];

    if (!user) {
      return {
        component: 'AuthRequired',
        props: {},
        warnings: ['User not authenticated']
      };
    }

    switch (user.role) {
      case 'infrastructure_owner':
        if (user.business_id) {
          warnings.push('Infrastructure owner has business_id set - this may cause context issues');
        }
        return {
          component: 'InfrastructureOwnerDashboard',
          props: { user },
          warnings
        };

      case 'business_owner':
        if (!user.business_id) {
          // Business owner without business_id is valid - they can create one
          return {
            component: 'BusinessOwnerDashboard',
            props: { userId: user.id, businessId: '' },
            warnings: ['Business owner can create or select a business']
          };
        }
        return {
          component: 'BusinessOwnerDashboard',
          props: { userId: user.id, businessId: user.business_id },
          warnings
        };

      case 'manager':
        return {
          component: 'ManagerDashboard',
          props: { user },
          warnings
        };

      case 'driver':
        return {
          component: 'DriverDashboard',
          props: { user },
          warnings
        };

      case 'warehouse':
        return {
          component: 'WarehouseDashboard',
          props: { user },
          warnings
        };

      case 'dispatcher':
        return {
          component: 'DispatchBoard',
          props: { user },
          warnings
        };

      case 'sales':
      case 'customer_service':
        return {
          component: 'OrdersPage',
          props: { user },
          warnings
        };

      case 'user':
        return {
          component: 'UserWelcome',
          props: { user },
          warnings
        };

      default:
        warnings.push(`Unknown role: ${user.role}`);
        return {
          component: 'ErrorScreen',
          props: { error: `Invalid role: ${user.role}` },
          warnings
        };
    }
  }
}

// ============================================================================
// Profile Fetch Diagnostics
// ============================================================================

export namespace ProfileDiagnostics {
  class ProfileDebugger {
    private attempts: ProfileFetchAttempt[] = [];
    private readonly MAX_HISTORY = 50;

    logAttempt(attempt: ProfileFetchAttempt): void {
      this.attempts.unshift(attempt);

      if (this.attempts.length > this.MAX_HISTORY) {
        this.attempts = this.attempts.slice(0, this.MAX_HISTORY);
      }
    }

    getHistory(): ProfileFetchAttempt[] {
      return [...this.attempts];
    }

    getStats(): {
      total: number;
      successful: number;
      failed: number;
      cacheHits: number;
      avgDuration: number;
      recentFailures: number;
    } {
      const total = this.attempts.length;
      const successful = this.attempts.filter(a => a.success).length;
      const failed = this.attempts.filter(a => !a.success).length;
      const cacheHits = this.attempts.filter(a => a.cacheHit).length;
      const avgDuration = total > 0
        ? this.attempts.reduce((sum, a) => sum + a.duration, 0) / total
        : 0;
      const recentFailures = this.attempts
        .slice(0, 5)
        .filter(a => !a.success).length;

      return {
        total,
        successful,
        failed,
        cacheHits,
        avgDuration: Math.round(avgDuration),
        recentFailures
      };
    }

    printReport(): void {
      const stats = this.getStats();

      console.group('📊 Profile Fetch Report');
      logger.info('Total attempts:', stats.total);
      logger.info('Successful:', stats.successful);
      logger.info('Failed:', stats.failed);
      logger.info('Cache hits:', stats.cacheHits);
      logger.info('Avg duration:', `${stats.avgDuration}ms`);
      logger.info('Recent failures (last 5):', stats.recentFailures);

      if (stats.recentFailures > 0) {
        logger.warn('⚠️ Recent failures detected!');
        console.table(this.attempts.slice(0, 5).map(a => ({
          timestamp: new Date(a.timestamp).toLocaleString(),
          source: a.source,
          success: a.success,
          error: a.error || 'N/A',
          duration: `${a.duration}ms`
        })));
      }

      console.groupEnd();
    }

    clear(): void {
      this.attempts = [];
      logger.info('🗑️ Profile fetch history cleared');
    }
  }

  export const profileDebugger = new ProfileDebugger();

  export function trackFetch<T>(
    source: string,
    forceRefresh: boolean,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();

    return fetchFn()
      .then((result) => {
        const duration = Date.now() - startTime;

        profileDebugger.logAttempt({
          timestamp: startTime,
          success: true,
          source,
          forceRefresh,
          cacheHit: false,
          duration,
          userData: result as any
        });

        return result;
      })
      .catch((error) => {
        const duration = Date.now() - startTime;

        profileDebugger.logAttempt({
          timestamp: startTime,
          success: false,
          source,
          forceRefresh,
          cacheHit: false,
          duration,
          error: error instanceof Error ? error.message : String(error)
        });

        throw error;
      });
  }

  export function trackCacheHit<T>(
    source: string,
    userData: T
  ): T {
    profileDebugger.logAttempt({
      timestamp: Date.now(),
      success: true,
      source,
      forceRefresh: false,
      cacheHit: true,
      duration: 0,
      userData: userData as any
    });

    return userData;
  }
}

// ============================================================================
// Global Window Helpers
// ============================================================================

if (typeof window !== 'undefined') {
  (window as any).runAuthDiagnostics = AuthDiagnostics.runFullDiagnostics;
  (window as any).runInitDiagnostics = InitDiagnostics.runFullDiagnostics;
  (window as any).getInitStatus = InitDiagnostics.getStatus;
  (window as any).__profileDebugger = ProfileDiagnostics.profileDebugger;

  logger.info('💡 Diagnostics available:');
  logger.info('  - window.runAuthDiagnostics()');
  logger.info('  - window.runInitDiagnostics()');
  logger.info('  - window.getInitStatus()');
  logger.info('  - window.__profileDebugger');
}
