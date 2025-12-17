import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NavigationService, NavigationRoute } from '../services/NavigationService';
import { Permission } from '../lib/rolePermissions';

interface NavigationContextValue {
  navigationService: NavigationService;
  availableRoutes: NavigationRoute[];
  currentPath: string;
  navigate: (path: string) => void;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  canAccessRoute: (route: NavigationRoute) => boolean;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

interface NavigationProviderProps {
  children: ReactNode;
  userRole: string | null;
}

export function NavigationProvider({ children, userRole }: NavigationProviderProps) {
  const location = useLocation();
  const navigateRouter = useNavigate();

  const navigationService = useMemo(() => {
    return new NavigationService(userRole);
  }, [userRole]);

  const availableRoutes = useMemo(() => {
    return navigationService.getNavigationForRole();
  }, [navigationService]);

  const value: NavigationContextValue = {
    navigationService,
    availableRoutes,
    currentPath: location.pathname,
    navigate: navigateRouter,
    hasPermission: (permission: Permission) => navigationService.hasPermission(permission),
    hasAnyPermission: (permissions: Permission[]) =>
      navigationService.hasAnyPermission(permissions),
    hasAllPermissions: (permissions: Permission[]) =>
      navigationService.hasAllPermissions(permissions),
    canAccessRoute: (route: NavigationRoute) => navigationService.canAccessRoute(route),
  };

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}

export function usePermission(permission: Permission): boolean {
  const { hasPermission } = useNavigation();
  return hasPermission(permission);
}

export function usePermissions(permissions: Permission[], requireAll = false): boolean {
  const { hasAnyPermission, hasAllPermissions } = useNavigation();
  return requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
}

export function useRouteAccess(path: string): boolean {
  const { availableRoutes } = useNavigation();
  return availableRoutes.some((route) => {
    if (route.path === path) return true;
    if (route.children) {
      return route.children.some((child) => child.path === path);
    }
    return false;
  });
}
