import { Permission, ROLE_PERMISSIONS } from './rolePermissions';
import { logger } from './logger';
import type { User } from '../data/types';

export interface PermissionContext {
  user: User | null;
  businessId?: string;
  requiresBusinessContext: boolean;
}

export function hasPermission(
  userRole: User['role'] | null,
  permission: Permission
): boolean {
  if (!userRole) {
    logger.warn('[PermissionEnforcement] Permission check failed: no user role');
    return false;
  }

  const rolePerms = ROLE_PERMISSIONS[userRole];
  if (!rolePerms) {
    logger.warn(`[PermissionEnforcement] Unknown role: ${userRole}`);
    return false;
  }

  return rolePerms.permissions.includes(permission);
}

export function hasAnyPermission(
  userRole: User['role'] | null,
  permissions: Permission[]
): boolean {
  return permissions.some(permission => hasPermission(userRole, permission));
}

export function hasAllPermissions(
  userRole: User['role'] | null,
  permissions: Permission[]
): boolean {
  return permissions.every(permission => hasPermission(userRole, permission));
}

export function canSeeFinancials(userRole: User['role'] | null): boolean {
  if (!userRole) return false;
  const rolePerms = ROLE_PERMISSIONS[userRole];
  return rolePerms?.canSeeFinancials ?? false;
}

export function canSeeCrossBusinessData(userRole: User['role'] | null): boolean {
  if (!userRole) return false;
  const rolePerms = ROLE_PERMISSIONS[userRole];
  return rolePerms?.canSeeCrossBusinessData ?? false;
}

export function enforceBusinessContext(
  userRole: User['role'] | null,
  businessId: string | undefined
): { allowed: boolean; message?: string } {
  if (!userRole) {
    return { allowed: false, message: 'Not authenticated' };
  }

  const rolePerms = ROLE_PERMISSIONS[userRole];
  if (!rolePerms) {
    return { allowed: false, message: 'Invalid role' };
  }

  if (rolePerms.level === 'business' && !businessId) {
    return {
      allowed: false,
      message: 'Business context required for this role'
    };
  }

  return { allowed: true };
}

export interface PermissionCheckOptions {
  requireBusinessContext?: boolean;
  businessId?: string;
  logFailures?: boolean;
}

export function checkPermission(
  user: User | null,
  permission: Permission,
  options: PermissionCheckOptions = {}
): { allowed: boolean; reason?: string } {
  if (!user) {
    if (options.logFailures) {
      logger.warn('[PermissionEnforcement] User not authenticated');
    }
    return { allowed: false, reason: 'Not authenticated' };
  }

  if (options.requireBusinessContext && !options.businessId) {
    if (options.logFailures) {
      logger.warn('[PermissionEnforcement] Business context required but not provided');
    }
    return { allowed: false, reason: 'Business context required' };
  }

  const businessCheck = enforceBusinessContext(user.role, options.businessId);
  if (!businessCheck.allowed) {
    if (options.logFailures) {
      logger.warn(`[PermissionEnforcement] Business context check failed: ${businessCheck.message}`);
    }
    return { allowed: false, reason: businessCheck.message };
  }

  if (!hasPermission(user.role, permission)) {
    if (options.logFailures) {
      logger.warn(`[PermissionEnforcement] Permission denied: ${user.role} lacks ${permission}`);
    }
    return { allowed: false, reason: `Permission ${permission} required` };
  }

  return { allowed: true };
}

export interface DataAccessFilter {
  infrastructureLevel: boolean;
  businessLevel: boolean;
  ownOnly: boolean;
  businessIds?: string[];
}

export function getDataAccessFilter(
  userRole: User['role'] | null,
  userId: string | null,
  businessId?: string
): DataAccessFilter {
  const filter: DataAccessFilter = {
    infrastructureLevel: false,
    businessLevel: false,
    ownOnly: false
  };

  if (!userRole || !userId) {
    filter.ownOnly = true;
    return filter;
  }

  const rolePerms = ROLE_PERMISSIONS[userRole];
  if (!rolePerms) {
    filter.ownOnly = true;
    return filter;
  }

  if (rolePerms.canSeeCrossBusinessData) {
    filter.infrastructureLevel = true;
    return filter;
  }

  if (rolePerms.level === 'business') {
    filter.businessLevel = true;
    filter.businessIds = businessId ? [businessId] : [];
    return filter;
  }

  switch (userRole) {
    case 'driver':
    case 'sales':
    case 'customer':
    case 'user':
      filter.ownOnly = true;
      break;
    default:
      filter.businessLevel = true;
      filter.businessIds = businessId ? [businessId] : [];
  }

  return filter;
}

export const PERMISSION_DENIED_MESSAGE = 'You do not have permission to perform this action';
export const BUSINESS_CONTEXT_REQUIRED_MESSAGE = 'Please select a business to continue';
export const NOT_AUTHENTICATED_MESSAGE = 'You must be logged in to access this resource';

export class PermissionError extends Error {
  constructor(
    public readonly permission: Permission,
    public readonly userRole: User['role'] | null,
    message?: string
  ) {
    super(message || PERMISSION_DENIED_MESSAGE);
    this.name = 'PermissionError';
  }
}

export class BusinessContextError extends Error {
  constructor(message?: string) {
    super(message || BUSINESS_CONTEXT_REQUIRED_MESSAGE);
    this.name = 'BusinessContextError';
  }
}

export function enforcePermission(
  user: User | null,
  permission: Permission,
  options: PermissionCheckOptions = {}
): void {
  const result = checkPermission(user, permission, options);
  if (!result.allowed) {
    throw new PermissionError(permission, user?.role || null, result.reason);
  }
}

export function enforceAnyPermission(
  user: User | null,
  permissions: Permission[],
  options: PermissionCheckOptions = {}
): void {
  if (!user) {
    throw new PermissionError(permissions[0], null, NOT_AUTHENTICATED_MESSAGE);
  }

  const hasAny = permissions.some(p => checkPermission(user, p, options).allowed);
  if (!hasAny) {
    throw new PermissionError(
      permissions[0],
      user.role,
      `One of these permissions required: ${permissions.join(', ')}`
    );
  }
}

export function enforceAllPermissions(
  user: User | null,
  permissions: Permission[],
  options: PermissionCheckOptions = {}
): void {
  if (!user) {
    throw new PermissionError(permissions[0], null, NOT_AUTHENTICATED_MESSAGE);
  }

  for (const permission of permissions) {
    const result = checkPermission(user, permission, options);
    if (!result.allowed) {
      throw new PermissionError(permission, user.role, result.reason);
    }
  }
}

logger.info('[PermissionEnforcement] Permission enforcement system initialized');
