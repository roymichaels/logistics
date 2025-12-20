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
          {driverName || 'Driver Dashboard'}
        </h1>
        {driverEarnings !== undefined && (
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          >
            Earnings: ${driverEarnings.toFixed(2)}
          </p>
        )}
      </div>
    </div>
  );

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
        headerContent={headerContent}
      >
        {children}
      </UnifiedAppFrame>
    </BaseShell>
  );
}
