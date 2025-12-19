import React from 'react';
import { UserRole } from '../shells/types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  userRole: UserRole | null;
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, allowedRoles, userRole, fallback }: RoleGuardProps) {
  if (!userRole || !allowedRoles.includes(userRole)) {
    return (
      <>
        {fallback || (
          <div style={{
            padding: '24px',
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '4px',
            color: '#991b1b'
          }}>
            <h2>Access Denied</h2>
            <p>You do not have permission to access this page.</p>
            <p>Your role: {userRole || 'Not authenticated'}</p>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}

export function useCanAccess(userRole: UserRole | null, requiredRoles: UserRole[]): boolean {
  return userRole !== null && requiredRoles.includes(userRole);
}

export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: UserRole[],
  fallback?: React.ReactNode
): React.ComponentType<P & { userRole: UserRole | null }> {
  return function WithRoleGuardComponent(props: P & { userRole: UserRole | null }) {
    const { userRole, ...componentProps } = props;

    return (
      <RoleGuard allowedRoles={allowedRoles} userRole={userRole} fallback={fallback}>
        <Component {...(componentProps as P)} />
      </RoleGuard>
    );
  };
}
