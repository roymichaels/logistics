import React from 'react';
import { BaseShell } from './BaseShell';
import { UnifiedAppFrame } from '../layouts/UnifiedAppFrame';
import { getNavigationForRole } from './navigationSchema';
import { MenuItemConfig } from '../components/navigation/UnifiedMenuPanel';

interface StoreShellProps {
  children: React.ReactNode;
  onNavigate: (path: string) => void;
  onLogout?: () => void;
  currentPath: string;
  isAuthenticated?: boolean;
  cartItemCount?: number;
}

export function StoreShell({
  children,
  onNavigate,
  onLogout,
  currentPath,
  isAuthenticated,
  cartItemCount
}: StoreShellProps) {
  const role = isAuthenticated ? 'customer' : 'user';
  const navigationItems = getNavigationForRole(role);

  const menuItems: MenuItemConfig[] = navigationItems
    .filter(item => item.visible)
    .map(item => ({
      id: item.id,
      label: item.label,
      icon: item.icon || '📌',
      path: item.path,
    }));

  return (
    <BaseShell
      role={role}
      currentPath={currentPath}
      onNavigate={onNavigate}
      onLogout={onLogout || (() => {})}
      title=""
    >
      <UnifiedAppFrame
        menuItems={menuItems}
        currentPath={currentPath}
        onNavigate={onNavigate}
        title="תפריט"
      >
        {children}
      </UnifiedAppFrame>
    </BaseShell>
  );
}
