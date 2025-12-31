import React from 'react';
import { BaseShell } from './BaseShell';
import { UnifiedAppFrame } from '../layouts/UnifiedAppFrame';
import { getNavigationForRole } from './navigationSchema';
import { MenuItemConfig } from '../components/navigation/UnifiedMenuPanel';
import { UserRole } from './types';
import { NavigationProvider } from '../contexts/NavigationContext';
import { logger } from '../lib/logger';

interface AdminShellProps {
  children: React.ReactNode;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  currentPath: string;
  username?: string;
  role?: UserRole;
}

export function AdminShell({
  children,
  onNavigate,
  onLogout,
  currentPath,
  username,
  role = 'admin'
}: AdminShellProps) {
  const navigationItems = getNavigationForRole(role);

  // Filter navigation items based on role's required roles
  const filteredItems = navigationItems.filter(item => {
    if (!item.requiredRoles) return true;
    return item.requiredRoles.includes(role);
  });

  const menuItems: MenuItemConfig[] = filteredItems
    .filter(item => item.visible)
    .map(item => ({
      id: item.id,
      label: item.label,
      icon: item.icon || '📌',
      path: item.path,
    }));

  // Determine title based on role
  const shellTitle = role === 'superadmin'
    ? 'Super Administrator'
    : role === 'admin'
      ? 'Platform Administrator'
      : 'Infrastructure Admin';

  const handleShowCreateUser = () => {
    logger.info('[AdminShell] Navigate to user management');
    onNavigate('/admin/users');
  };

  const handleShowCreateTask = () => {
    logger.info('[AdminShell] Navigate to tasks');
    onNavigate('/admin/tasks');
  };

  return (
    <NavigationProvider userRole={role}>
      <BaseShell
        role={role}
        currentPath={currentPath}
        onNavigate={onNavigate}
        onLogout={onLogout}
        title={shellTitle}
      >
        <UnifiedAppFrame
          menuItems={menuItems}
          currentPath={currentPath}
          onNavigate={onNavigate}
          title={`${shellTitle} Menu`}
          onShowCreateUser={handleShowCreateUser}
          onShowCreateTask={handleShowCreateTask}
        >
          {children}
        </UnifiedAppFrame>
      </BaseShell>
    </NavigationProvider>
  );
}
