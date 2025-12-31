import React from 'react';
import { BaseShell } from './BaseShell';
import { UnifiedAppFrame } from '../layouts/UnifiedAppFrame';
import { getNavigationForRole } from './navigationSchema';
import { MenuItemConfig } from '../components/navigation/UnifiedMenuPanel';
import { logger } from '../lib/logger';

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

  const handleShowCheckInventory = () => {
    logger.info('[DriverShell] Navigate to my inventory');
    onNavigate('/driver/my-inventory');
  };

  const handleShowCreateTask = () => {
    logger.info('[DriverShell] Navigate to tasks');
    onNavigate('/driver/tasks');
  };

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
        onShowCheckInventory={handleShowCheckInventory}
        onShowCreateTask={handleShowCreateTask}
      >
        {children}
      </UnifiedAppFrame>
    </BaseShell>
  );
}
