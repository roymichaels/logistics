import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useNavigation } from '../../contexts/NavigationContext';
import { Permission } from '../../lib/rolePermissions';

interface NavigationGuardProps {
  children: ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  roles?: string | string[];
  fallbackPath?: string;
  fallbackComponent?: ReactNode;
}

export function NavigationGuard({
  children,
  permission,
  permissions = [],
  requireAll = false,
  roles,
  fallbackPath = '/unauthorized',
  fallbackComponent,
}: NavigationGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, navigationService } =
    useNavigation();

  let hasAccess = true;

  if (permission) {
    hasAccess = hasPermission(permission);
  }

  if (permissions.length > 0) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
  }

  if (roles && hasAccess) {
    hasAccess = navigationService.hasRole(roles);
  }

  if (!hasAccess) {
    if (fallbackComponent) {
      return <>{fallbackComponent}</>;
    }
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}

interface PermissionGateProps {
  children: ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  fallback?: ReactNode;
}

export function PermissionGate({
  children,
  permission,
  permissions = [],
  requireAll = false,
  fallback = null,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useNavigation();

  let hasAccess = true;

  if (permission) {
    hasAccess = hasPermission(permission);
  }

  if (permissions.length > 0) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface RoleGateProps {
  children: ReactNode;
  role: string | string[];
  fallback?: ReactNode;
}

export function RoleGate({ children, role, fallback = null }: RoleGateProps) {
  const { navigationService } = useNavigation();

  if (!navigationService.hasRole(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
