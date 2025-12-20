import React from 'react';
import { BaseShell } from './BaseShell';
import { UserRole } from './types';
import { UnifiedAppFrame } from '../layouts/UnifiedAppFrame';
import { getNavigationForRole } from './navigationSchema';
import { MenuItemConfig } from '../components/navigation/UnifiedMenuPanel';

interface BusinessShellProps {
  children: React.ReactNode;
  role: UserRole;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  currentPath: string;
  businessName?: string;
  businessId?: string;
}

export function BusinessShell({
  children,
  role,
  onNavigate,
  onLogout,
  currentPath,
  businessName,
  businessId
}: BusinessShellProps) {
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: 'rgba(255, 255, 255, 0.95)',
          }}
        >
          {businessName || 'Business Portal'}
        </h1>
      </div>
    </div>
  );

  return (
    <BaseShell
      role={role}
      currentPath={currentPath}
      onNavigate={onNavigate}
      onLogout={onLogout}
      title={businessName || 'Business Portal'}
    >
      <UnifiedAppFrame
        menuItems={menuItems}
        currentPath={currentPath}
        onNavigate={onNavigate}
        title="Business Menu"
        headerContent={headerContent}
      >
        {children}
      </UnifiedAppFrame>
    </BaseShell>
  );
}
