import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

export interface ProtectedRouteProps {
  children: ReactNode;
  isAuthenticated: boolean;
  requiredRole?: string | string[];
  userRole?: string;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  isAuthenticated,
  requiredRole,
  userRole,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  if (requiredRole && userRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(userRole)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}

export interface RoleBasedRouteProps {
  children: ReactNode;
  allowedRoles: string[];
  userRole?: string;
  fallback?: ReactNode;
}

export function RoleBasedRoute({ children, allowedRoles, userRole, fallback }: RoleBasedRouteProps) {
  if (!userRole || !allowedRoles.includes(userRole)) {
    return fallback ? <>{fallback}</> : <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
