import React, { ReactNode } from 'react';
import { usePermissions } from '../../lib/permissions/PermissionContext';

interface ActionGuardProps {
  children: ReactNode;
  action?: string;
  resource?: string;
  requireEdit?: boolean;
  requireCreate?: boolean;
  requireDelete?: boolean;
  fallback?: ReactNode;
  hideWhenDenied?: boolean;
}

export function ActionGuard({
  children,
  action,
  resource,
  requireEdit,
  requireCreate,
  requireDelete,
  fallback,
  hideWhenDenied = false
}: ActionGuardProps) {
  const permissions = usePermissions();

  let hasAccess = true;

  if (action) {
    hasAccess = permissions.hasPermission(action);
  }

  if (resource) {
    if (requireEdit) {
      hasAccess = hasAccess && permissions.canEdit(resource);
    }
    if (requireCreate) {
      hasAccess = hasAccess && permissions.canCreate(resource);
    }
    if (requireDelete) {
      hasAccess = hasAccess && permissions.canDelete(resource);
    }
    if (!requireEdit && !requireCreate && !requireDelete) {
      hasAccess = hasAccess && permissions.canView(resource);
    }
  }

  if (!hasAccess) {
    if (hideWhenDenied) {
      return null;
    }
    if (fallback) {
      return <>{fallback}</>;
    }
    return null;
  }

  return <>{children}</>;
}
