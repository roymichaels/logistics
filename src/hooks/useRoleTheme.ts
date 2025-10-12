/**
 * useRoleTheme Hook
 *
 * Provides dynamic theme based on current user's role
 * Returns theme colors and styles that automatically adapt to the user's role
 */

import { useMemo } from 'react';
import { useAppServices } from '../context/AppServicesContext';
import { getRoleTheme, getRoleColors, getRoleStyles, ADMIN_THEME } from '../styles/roleThemes';
import type { RoleTheme } from '../styles/roleThemes';

interface UseRoleThemeReturn {
  theme: RoleTheme;
  colors: RoleTheme['colors'];
  styles: ReturnType<typeof getRoleStyles>;
  roleName: string;
  isLoading: boolean;
}

/**
 * Hook to get the current user's role-based theme
 */
export function useRoleTheme(): UseRoleThemeReturn {
  let context;
  try {
    context = useAppServices();
  } catch (error) {
    console.warn('useRoleTheme: AppServicesContext not available, using default theme');
    context = { userRole: null, loading: false };
  }

  const { userRole, loading } = context;

  const theme = useMemo(() => {
    if (!userRole) return ADMIN_THEME;
    return getRoleTheme(userRole);
  }, [userRole]);

  const colors = useMemo(() => {
    if (!userRole) return ADMIN_THEME.colors;
    return getRoleColors(userRole);
  }, [userRole]);

  const styles = useMemo(() => {
    if (!userRole) return getRoleStyles('infrastructure_owner');
    return getRoleStyles(userRole);
  }, [userRole]);

  return {
    theme,
    colors,
    styles,
    roleName: theme.name,
    isLoading: loading,
  };
}

/**
 * Hook to get a specific role's theme (useful for previews or admin views)
 */
export function useSpecificRoleTheme(role: Parameters<typeof getRoleTheme>[0]): {
  theme: RoleTheme;
  colors: RoleTheme['colors'];
  styles: ReturnType<typeof getRoleStyles>;
} {
  const theme = useMemo(() => getRoleTheme(role), [role]);
  const colors = useMemo(() => getRoleColors(role), [role]);
  const styles = useMemo(() => getRoleStyles(role), [role]);

  return { theme, colors, styles };
}
