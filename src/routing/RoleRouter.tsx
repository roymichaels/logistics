import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getRoleConfig, getHomePathForRole, type UserRole } from './roleRoutingConfig';

interface RoleRouterProps {
  currentRole: UserRole | null;
  isAuthenticated: boolean;
  children?: React.ReactNode;
}

export function RoleRouter({ currentRole, isAuthenticated, children }: RoleRouterProps) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      if (location.pathname !== '/login' && location.pathname !== '/') {
        navigate('/login');
      }
      return;
    }

    if (!currentRole) {
      navigate('/role-selection');
      return;
    }

    const roleConfig = getRoleConfig(currentRole);
    const homePath = getHomePathForRole(currentRole);

    if (location.pathname === '/' || location.pathname === '/login') {
      navigate(homePath);
    }
  }, [currentRole, isAuthenticated, location.pathname, navigate]);

  return <>{children}</>;
}

export function useRoleBasedNavigation() {
  const navigate = useNavigate();

  const navigateToRoleHome = (role: UserRole) => {
    const homePath = getHomePathForRole(role);
    navigate(homePath);
  };

  const navigateToPath = (path: string) => {
    navigate(path);
  };

  return {
    navigateToRoleHome,
    navigateToPath,
  };
}
