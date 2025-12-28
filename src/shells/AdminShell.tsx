import React from 'react';
import { BaseShell } from './BaseShell';
import { UnifiedAppFrame } from '../layouts/UnifiedAppFrame';
import { getNavigationForRole } from './navigationSchema';
import { MenuItemConfig } from '../components/navigation/UnifiedMenuPanel';

interface AdminShellProps {
  children: React.ReactNode;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  currentPath: string;
  username?: string;
}

export function AdminShell({
  children,
  onNavigate,
  onLogout,
  currentPath,
  username
}: AdminShellProps) {
  const navigationItems = getNavigationForRole('infrastructure_owner');

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
      role="infrastructure_owner"
      currentPath={currentPath}
      onNavigate={onNavigate}
      onLogout={onLogout}
      title="Infrastructure Admin"
    >
      <UnifiedAppFrame
        menuItems={menuItems}
        currentPath={currentPath}
        onNavigate={onNavigate}
        title="Admin Menu"
      >
        {children}
      </UnifiedAppFrame>
    </BaseShell>
  );
}
