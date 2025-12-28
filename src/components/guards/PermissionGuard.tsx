import React from 'react';
import type { User } from '../../data/types';
import { Permission, checkPermission, PermissionCheckOptions } from '../../lib/permissionEnforcement';
import { logger } from '../../lib/logger';

export interface PermissionGuardProps {
  children: React.ReactNode;
  user: User | null;
  permission: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  businessId?: string;
  fallback?: React.ReactNode;
  onDenied?: () => void;
}

export function PermissionGuard({
  children,
  user,
  permission,
  permissions,
  requireAll = false,
  businessId,
  fallback,
  onDenied
}: PermissionGuardProps) {
  const options: PermissionCheckOptions = {
    businessId,
    logFailures: true
  };

  let allowed = false;
  let reason: string | undefined;

  if (permissions && permissions.length > 0) {
    if (requireAll) {
      allowed = permissions.every(p => checkPermission(user, p, options).allowed);
      const failedPerm = permissions.find(p => !checkPermission(user, p, options).allowed);
      if (failedPerm) {
        reason = `Missing permission: ${failedPerm}`;
      }
    } else {
      allowed = permissions.some(p => checkPermission(user, p, options).allowed);
      if (!allowed) {
        reason = `Missing any of: ${permissions.join(', ')}`;
      }
    }
  } else {
    const result = checkPermission(user, permission, options);
    allowed = result.allowed;
    reason = result.reason;
  }

  if (!allowed) {
    logger.warn(`[PermissionGuard] Access denied: ${reason}`);
    if (onDenied) {
      onDenied();
    }

    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div
        style={{
          padding: '24px',
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: '8px',
          color: '#991b1b',
          maxWidth: '600px',
          margin: '24px auto'
        }}
      >
        <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: 600 }}>
          Access Denied
        </h2>
        <p style={{ margin: '0 0 8px 0' }}>
          You do not have permission to access this resource.
        </p>
        {reason && (
          <p style={{ margin: '0', fontSize: '14px', opacity: 0.8 }}>
            Reason: {reason}
          </p>
        )}
        {user && (
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.8 }}>
            Your role: {user.role}
          </p>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

export function withPermissionGuard<P extends object>(
  Component: React.ComponentType<P>,
  permission: Permission,
  options?: {
    permissions?: Permission[];
    requireAll?: boolean;
    fallback?: React.ReactNode;
    onDenied?: () => void;
  }
): React.ComponentType<P & { user: User | null; businessId?: string }> {
  return function WithPermissionGuardComponent(
    props: P & { user: User | null; businessId?: string }
  ) {
    const { user, businessId, ...componentProps } = props;

    return (
      <PermissionGuard
        user={user}
        permission={permission}
        permissions={options?.permissions}
        requireAll={options?.requireAll}
        businessId={businessId}
        fallback={options?.fallback}
        onDenied={options?.onDenied}
      >
        <Component {...(componentProps as P)} />
      </PermissionGuard>
    );
  };
}

export interface RequirePermissionProps {
  children: React.ReactNode;
  user: User | null;
  permission: Permission;
  businessId?: string;
  message?: string;
}

export function RequirePermission({
  children,
  user,
  permission,
  businessId,
  message
}: RequirePermissionProps) {
  const result = checkPermission(user, permission, { businessId, logFailures: false });

  if (!result.allowed) {
    return null;
  }

  return <>{children}</>;
}

export interface HideIfNoPermissionProps {
  children: React.ReactNode;
  user: User | null;
  permission: Permission;
  businessId?: string;
}

export function HideIfNoPermission({
  children,
  user,
  permission,
  businessId
}: HideIfNoPermissionProps) {
  const result = checkPermission(user, permission, { businessId, logFailures: false });

  if (!result.allowed) {
    return null;
  }

  return <>{children}</>;
}

export interface DisableIfNoPermissionProps {
  children: React.ReactElement;
  user: User | null;
  permission: Permission;
  businessId?: string;
}

export function DisableIfNoPermission({
  children,
  user,
  permission,
  businessId
}: DisableIfNoPermissionProps) {
  const result = checkPermission(user, permission, { businessId, logFailures: false });

  if (!result.allowed) {
    return React.cloneElement(children, { disabled: true, title: 'Permission required' });
  }

  return children;
}

logger.info('[PermissionGuard] Permission guard components initialized');
