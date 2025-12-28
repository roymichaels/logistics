import React from 'react';
import { BaseShell } from './BaseShell';
import { UnifiedAppFrame } from '../layouts/UnifiedAppFrame';
import { getNavigationForRole } from './navigationSchema';
import { MenuItemConfig } from '../components/navigation/UnifiedMenuPanel';
import { UserRole } from './types';

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

  return (
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
      >
        {children}
      </UnifiedAppFrame>
    </BaseShell>
  );
}
