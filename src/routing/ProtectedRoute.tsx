import React, { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOptionalBusinessContext } from '../context/BusinessContext';
import { canAccessRoute } from './UnifiedRouter';
import { sessionManager } from '../lib/sessionManager';
import { logger } from '../lib/logger';
import { PageLoadingSkeleton } from '../components/LoadingSkeleton';
import { UserRole } from '../shells/types';

export interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole | UserRole[];
  requiresBusinessContext?: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiresBusinessContext = false,
  redirectTo = '/auth/login',
}: ProtectedRouteProps) {
  const { user, role, isAuthenticated } = useAuth();
  const businessContext = useOptionalBusinessContext();
  const location = useLocation();
  const [validatingSession, setValidatingSession] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);

  useEffect(() => {
    async function validateSession() {
      const isValid = await sessionManager.validateSession();
      setSessionValid(isValid);
      setValidatingSession(false);

      if (!isValid) {
        logger.warn('[ProtectedRoute] Session validation failed', {
          path: location.pathname,
        });
      }
    }

    void validateSession();
  }, [location.pathname]);

  if (validatingSession) {
    return <PageLoadingSkeleton />;
  }

  if (!sessionValid || !isAuthenticated || !user) {
    logger.info('[ProtectedRoute] Redirecting to login', {
      path: location.pathname,
      reason: !sessionValid ? 'invalid_session' : 'not_authenticated',
    });
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  if (requiredRole && role) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(role)) {
      logger.warn('[ProtectedRoute] Access denied - insufficient role', {
        path: location.pathname,
        requiredRoles: roles,
        userRole: role,
      });
      return <Navigate to="/unauthorized" replace />;
    }
  }

  const isMultiBusinessOwner = businessContext?.isMultiBusinessOwner ?? false;
  const canAccess = role ? canAccessRoute(role, location.pathname, isMultiBusinessOwner) : false;

  if (!canAccess) {
    logger.warn('[ProtectedRoute] Access denied - route not accessible', {
      path: location.pathname,
      userRole: role,
      isMultiBusinessOwner,
    });
    return <Navigate to="/unauthorized" replace />;
  }

  if (requiresBusinessContext) {
    const requiresBusinessRoles: UserRole[] = [
      'business_owner',
      'manager',
      'warehouse',
      'dispatcher',
      'sales',
      'customer_service',
    ];

    if (role && requiresBusinessRoles.includes(role)) {
      if (!businessContext?.activeBusiness) {
        logger.warn('[ProtectedRoute] Access denied - no business context', {
          path: location.pathname,
          userRole: role,
        });
        return <Navigate to="/business/select" replace />;
      }
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
