import React, { ReactNode, useCallback, useMemo } from 'react';
import { ShellContext, ShellContextValue, UserRole } from './types';
import { getNavigationForRole, getShellTypeForRole } from './navigationSchema';

interface BaseShellProps {
  children: ReactNode;
  role: UserRole | null;
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  title?: string;
  subtitle?: string;
}

export function BaseShell({
  children,
  role,
  currentPath,
  onNavigate,
  onLogout,
  title,
  subtitle
}: BaseShellProps) {
  const shellType = getShellTypeForRole(role);
  const navigationItems = useMemo(() => getNavigationForRole(role), [role]);

  const contextValue: ShellContextValue = useMemo(
    () => ({
      role,
      shellType,
      config: {
        type: shellType,
        role: role || 'user',
        title: title || 'Logistics Platform'
      },
      navigationItems,
      currentPath,
      onNavigate,
      onLogout
    }),
    [role, shellType, navigationItems, currentPath, onNavigate, onLogout, title]
  );

  return (
    <ShellContext.Provider value={contextValue}>
      {children}
    </ShellContext.Provider>
  );
}

export function useShellContext() {
  const context = React.useContext(ShellContext);
  if (!context) {
    throw new Error('useShellContext must be used within a BaseShell');
  }
  return context;
}
