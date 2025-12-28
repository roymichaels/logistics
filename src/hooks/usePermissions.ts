import { useMemo, useCallback } from 'react';
import type { User } from '../data/types';
import {
  Permission,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canSeeFinancials,
  canSeeCrossBusinessData,
  checkPermission,
  enforcePermission,
  PermissionCheckOptions,
  getDataAccessFilter,
  DataAccessFilter
} from '../lib/permissionEnforcement';
import { logger } from '../lib/logger';

export interface UsePermissionsOptions {
  user: User | null;
  businessId?: string;
  logFailures?: boolean;
}

export interface PermissionsAPI {
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  checkPermission: (permission: Permission) => { allowed: boolean; reason?: string };
  enforcePermission: (permission: Permission) => void;
  canSeeFinancials: boolean;
  canSeeCrossBusinessData: boolean;
  dataAccessFilter: DataAccessFilter;
  isAuthenticated: boolean;
  userRole: User['role'] | null;
  businessId?: string;
}

export function usePermissions(options: UsePermissionsOptions): PermissionsAPI {
  const { user, businessId, logFailures = false } = options;

  const permissionOptions: PermissionCheckOptions = useMemo(
    () => ({
      businessId,
      logFailures,
      requireBusinessContext: false
    }),
    [businessId, logFailures]
  );

  const hasPermissionFn = useCallback(
    (permission: Permission): boolean => {
      return hasPermission(user?.role || null, permission);
    },
    [user?.role]
  );

  const hasAnyPermissionFn = useCallback(
    (permissions: Permission[]): boolean => {
      return hasAnyPermission(user?.role || null, permissions);
    },
    [user?.role]
  );

  const hasAllPermissionsFn = useCallback(
    (permissions: Permission[]): boolean => {
      return hasAllPermissions(user?.role || null, permissions);
    },
    [user?.role]
  );

  const checkPermissionFn = useCallback(
    (permission: Permission): { allowed: boolean; reason?: string } => {
      return checkPermission(user, permission, permissionOptions);
    },
    [user, permissionOptions]
  );

  const enforcePermissionFn = useCallback(
    (permission: Permission): void => {
      enforcePermission(user, permission, permissionOptions);
    },
    [user, permissionOptions]
  );

  const canSeeFinancialsValue = useMemo(
    () => canSeeFinancials(user?.role || null),
    [user?.role]
  );

  const canSeeCrossBusinessDataValue = useMemo(
    () => canSeeCrossBusinessData(user?.role || null),
    [user?.role]
  );

  const dataAccessFilter = useMemo(
    () => getDataAccessFilter(user?.role || null, user?.id || null, businessId),
    [user?.role, user?.id, businessId]
  );

  return {
    hasPermission: hasPermissionFn,
    hasAnyPermission: hasAnyPermissionFn,
    hasAllPermissions: hasAllPermissionsFn,
    checkPermission: checkPermissionFn,
    enforcePermission: enforcePermissionFn,
    canSeeFinancials: canSeeFinancialsValue,
    canSeeCrossBusinessData: canSeeCrossBusinessDataValue,
    dataAccessFilter,
    isAuthenticated: !!user,
    userRole: user?.role || null,
    businessId
  };
}

export function usePermission(
  user: User | null,
  permission: Permission,
  businessId?: string
): boolean {
  return useMemo(() => {
    const result = checkPermission(user, permission, { businessId });
    return result.allowed;
  }, [user, permission, businessId]);
}

export function useCanSeeFinancials(user: User | null): boolean {
  return useMemo(() => canSeeFinancials(user?.role || null), [user?.role]);
}

export function useCanSeeCrossBusinessData(user: User | null): boolean {
  return useMemo(() => canSeeCrossBusinessData(user?.role || null), [user?.role]);
}

export function useDataAccessFilter(
  user: User | null,
  businessId?: string
): DataAccessFilter {
  return useMemo(
    () => getDataAccessFilter(user?.role || null, user?.id || null, businessId),
    [user?.role, user?.id, businessId]
  );
}

export function useGuardedAction<T extends (...args: any[]) => any>(
  user: User | null,
  permission: Permission,
  action: T,
  options?: { businessId?: string; onDenied?: () => void }
): T {
  return useCallback(
    (...args: Parameters<T>): ReturnType<T> | undefined => {
      const result = checkPermission(user, permission, {
        businessId: options?.businessId,
        logFailures: true
      });

      if (!result.allowed) {
        logger.warn(`[useGuardedAction] Action blocked: ${result.reason}`);
        options?.onDenied?.();
        return undefined;
      }

      return action(...args);
    },
    [user, permission, action, options]
  ) as T;
}

logger.info('[usePermissions] Permission hooks initialized');
