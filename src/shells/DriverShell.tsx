import React from 'react';
import { BaseShell } from './BaseShell';
import { UnifiedAppFrame } from '../layouts/UnifiedAppFrame';
import { getNavigationForRole } from './navigationSchema';
import { MenuItemConfig } from '../components/navigation/UnifiedMenuPanel';

interface DriverShellProps {
  children: React.ReactNode;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  currentPath: string;
  driverName?: string;
  driverEarnings?: number;
}

export function DriverShell({
  children,
  onNavigate,
  onLogout,
  currentPath,
  driverName,
  driverEarnings
}: DriverShellProps) {
  const navigationItems = getNavigationForRole('driver');

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
      role="driver"
      currentPath={currentPath}
      onNavigate={onNavigate}
      onLogout={onLogout}
      title="Driver Dashboard"
    >
      <UnifiedAppFrame
        menuItems={menuItems}
        currentPath={currentPath}
        onNavigate={onNavigate}
        title="Driver Menu"
      >
        {children}
      </UnifiedAppFrame>
    </BaseShell>
  );
}
