import React, { ReactNode } from 'react';
import { usePermissions } from '../../lib/permissions/PermissionContext';

interface DataGuardProps {
  children: ReactNode;
  resource: string;
  requireView?: boolean;
  requireEdit?: boolean;
  fallback?: ReactNode;
}

export function DataGuard({
  children,
  resource,
  requireView = true,
  requireEdit = false,
  fallback
}: DataGuardProps) {
  const permissions = usePermissions();

  let hasAccess = true;

  if (requireView) {
    hasAccess = permissions.canView(resource);
  }

  if (requireEdit) {
    hasAccess = hasAccess && permissions.canEdit(resource);
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <div style={{
        padding: '20px',
        background: '#fee2e2',
        border: '1px solid #fca5a5',
        borderRadius: '8px',
        color: '#991b1b'
      }}>
        <p>You don't have permission to view this data.</p>
      </div>
    );
  }

  return <>{children}</>;
}
