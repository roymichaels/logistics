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

  const headerContent = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <h1
        style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: '600',
          color: 'rgba(255, 255, 255, 0.95)',
        }}
      >
        Shop
      </h1>
      {cartItemCount !== undefined && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.6)',
          }}
        >
          🛒 {cartItemCount}
        </div>
      )}
    </div>
  );

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
        title="Store Menu"
        headerContent={headerContent}
      >
        {children}
      </UnifiedAppFrame>
    </BaseShell>
  );
}
