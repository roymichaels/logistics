/**
 * Role Diagnostics Utility
 *
 * Provides debugging tools for investigating role-based access control issues
 * including mismatched roles, incorrect dashboard routing, and permission problems.
 */

import type { User } from '../data/types';
import { ROLE_PERMISSIONS, hasPermission } from './rolePermissions';

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

/**
 * Generate a comprehensive diagnostic report for a user's role and permissions
 */
export function generateRoleDiagnostic(user: User | null): RoleDiagnosticReport | null {
  if (!user) {
    console.warn('⚠️ Cannot generate role diagnostic: user is null');
    return null;
  }

  const roleInfo = ROLE_PERMISSIONS[user.role];
  if (!roleInfo) {
    console.error('❌ Invalid role detected:', user.role);
    return null;
  }

  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check role-business context consistency
  if (user.role === 'infrastructure_owner' && user.business_id) {
    issues.push('Infrastructure owner should not have business_id set');
    recommendations.push('Set business_id to NULL for infrastructure owners');
  }

  if (user.role === 'business_owner' && !user.business_id) {
    issues.push('Business owner missing business_id');
    recommendations.push('Assign business_id to this business owner');
  }

  // Determine expected dashboard
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

  const report: RoleDiagnosticReport = {
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

  return report;
}

/**
 * Log a formatted diagnostic report to console (silent mode - data available for debugging)
 */
export function logRoleDiagnostic(user: User | null): void {
  const report = generateRoleDiagnostic(user);
  // Silent - report generated but not logged to console
  // Use generateRoleDiagnostic directly if you need the data
}

/**
 * Verify role consistency between different parts of the system
 */
export function verifyRoleConsistency(
  user: User,
  jwtRole?: string,
  dbRole?: string
): { consistent: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check JWT vs User object
  if (jwtRole && jwtRole !== user.role) {
    issues.push(`JWT role (${jwtRole}) does not match user object role (${user.role})`);
  }

  // Check DB vs User object
  if (dbRole && dbRole !== user.role) {
    issues.push(`Database role (${dbRole}) does not match user object role (${user.role})`);
  }

  // Check JWT vs DB
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

  if (user.role !== 'infrastructure_owner') {
    return {
      show: false,
      reason: `Role '${user.role}' does not have permission to create businesses. Only 'infrastructure_owner' can create businesses.`
    };
  }

  if (!hasPermission(user, 'business:create')) {
    return {
      show: false,
      reason: 'User does not have business:create permission despite having infrastructure_owner role. This indicates a permission system misconfiguration.'
    };
  }

  return {
    show: true,
    reason: 'User is infrastructure owner with business:create permission'
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
        warnings.push('Business owner missing business_id - will show error screen');
        return {
          component: 'BusinessOwnerDashboard',
          props: { userId: user.id, businessId: null },
          warnings
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

/**
 * Global debug helper - can be called from browser console
 * Usage: window.debugUserRole()
 */
export function installRoleDebugger(): void {
  if (typeof window !== 'undefined') {
    (window as any).debugUserRole = (user?: User) => {
      if (!user) {
        console.warn('⚠️ No user provided. Please pass user object as parameter.');
        console.log('Usage: window.debugUserRole(user)');
        return;
      }
      logRoleDiagnostic(user);
    };

    (window as any).checkCreateBusinessButton = (user?: User) => {
      if (!user) {
        console.warn('⚠️ No user provided. Please pass user object as parameter.');
        return;
      }
      const result = shouldShowCreateBusinessButton(user);
      console.log('🔍 Create Business Button Check:');
      console.log('Show:', result.show ? '✅ YES' : '❌ NO');
      console.log('Reason:', result.reason);
    };

    console.log('✅ Role debugging tools installed:');
    console.log('  - window.debugUserRole(user)');
    console.log('  - window.checkCreateBusinessButton(user)');
  }
}
