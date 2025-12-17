import React from 'react';
import { BusinessShell } from './BusinessShell';
import { DriverShell } from './DriverShell';
import { StoreShell } from './StoreShell';
import { AdminShell } from './AdminShell';
import { UnifiedShell } from './UnifiedShell';
import { useAppServices } from '../context/AppServicesContext';

interface ShellFactoryProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  forceShellType?: 'business' | 'driver' | 'store' | 'admin' | 'unified';
}

/**
 * ShellFactory automatically selects the appropriate shell based on user role
 * or allows explicit shell type override
 */
export function ShellFactory({
  children,
  title,
  subtitle,
  headerActions,
  forceShellType
}: ShellFactoryProps) {
  const { userRole } = useAppServices();

  // Determine which shell to use
  const shellType = forceShellType || getShellTypeForRole(userRole);

  // Render the appropriate shell
  switch (shellType) {
    case 'business':
      return (
        <BusinessShell title={title} subtitle={subtitle} headerActions={headerActions}>
          {children}
        </BusinessShell>
      );

    case 'driver':
      return (
        <DriverShell title={title} headerActions={headerActions}>
          {children}
        </DriverShell>
      );

    case 'store':
      return (
        <StoreShell title={title} headerActions={headerActions}>
          {children}
        </StoreShell>
      );

    case 'admin':
      return (
        <AdminShell title={title} subtitle={subtitle} headerActions={headerActions}>
          {children}
        </AdminShell>
      );

    case 'unified':
    default:
      return (
        <UnifiedShell title={title} actions={headerActions}>
          {children}
        </UnifiedShell>
      );
  }
}

/**
 * Determine shell type based on user role
 */
function getShellTypeForRole(role: string | null): 'business' | 'driver' | 'store' | 'admin' | 'unified' {
  if (!role) return 'unified';

  switch (role) {
    case 'infrastructure_owner':
      return 'admin';

    case 'business_owner':
    case 'manager':
    case 'warehouse':
    case 'dispatcher':
    case 'sales':
    case 'customer_service':
      return 'business';

    case 'driver':
      return 'driver';

    case 'user':
    case 'customer':
    default:
      return 'store';
  }
}

/**
 * Hook to get the current shell type for the user
 */
export function useShellType(): 'business' | 'driver' | 'store' | 'admin' | 'unified' {
  const { userRole } = useAppServices();
  return getShellTypeForRole(userRole);
}

/**
 * Hook to check if user is in a specific shell context
 */
export function useIsInShell(shellType: 'business' | 'driver' | 'store' | 'admin'): boolean {
  const currentShellType = useShellType();
  return currentShellType === shellType;
}
