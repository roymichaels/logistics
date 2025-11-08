/**
 * useRoleTheme Hook
 *
 * Provides unified theme based on design system
 * Simplified to use single Twitter-inspired theme across all roles
 */

import { useMemo } from 'react';
import { useAppServices } from '../context/AppServicesContext';
import { colors, spacing, borderRadius, shadows, typography, commonStyles } from '../styles/design-system';
import { logger } from '../lib/logger';

interface UseRoleThemeReturn {
  colors: typeof colors;
  commonStyles: typeof commonStyles;
  roleName: string;
  isLoading: boolean;
}

/**
 * Hook to get the current user's theme (now unified across all roles)
 */
export function useRoleTheme(): UseRoleThemeReturn {
  let contextData: { userRole: any; loading: boolean } | null = null;

  try {
    contextData = useAppServices();
  } catch (error) {
    logger.warn('useRoleTheme: AppServicesContext not available, using defaults');
  }

  const userRole = contextData?.userRole ?? 'user';
  const loading = contextData?.loading ?? true;

  const roleName = useMemo(() => {
    const roleNames: Record<string, string> = {
      infrastructure_owner: 'Infrastructure Owner',
      business_owner: 'Business Owner',
      manager: 'Manager',
      dispatcher: 'Dispatcher',
      driver: 'Driver',
      warehouse: 'Warehouse',
      sales: 'Sales',
      customer_service: 'Customer Service',
      user: 'User',
    };
    return roleNames[userRole] || 'User';
  }, [userRole]);

  return {
    colors,
    commonStyles,
    roleName,
    isLoading: loading,
  };
}

/**
 * Hook to get theme (now returns same theme for all roles)
 */
export function useSpecificRoleTheme(): {
  colors: typeof colors;
  commonStyles: typeof commonStyles;
} {
  return { colors, commonStyles };
}
