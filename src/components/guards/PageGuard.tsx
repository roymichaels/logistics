import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { UserRole } from '../../shells/types';
import { canAccessRoute } from '../../lib/permissions/PermissionMatrix';
import { logger } from '../../lib/logger';

interface PageGuardProps {
  children: ReactNode;
  userRole: UserRole | null;
  requiredPath?: string;
  fallbackPath?: string;
}

export function PageGuard({ children, userRole, requiredPath, fallbackPath = '/unauthorized' }: PageGuardProps) {
  const location = useLocation();
  const pathToCheck = requiredPath || location.pathname;

  const hasAccess = canAccessRoute(userRole, pathToCheck);

  if (!hasAccess) {
    logger.warn('🚫 PageGuard: Access denied', {
      role: userRole,
      path: pathToCheck,
      from: location.pathname
    });

    return <Navigate to={fallbackPath} replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
