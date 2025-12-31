import React from 'react';
import { BaseShell } from './BaseShell';
import { UnifiedAppFrame } from '../layouts/UnifiedAppFrame';
import { getNavigationForRole } from './navigationSchema';
import { MenuItemConfig } from '../components/navigation/UnifiedMenuPanel';
import { logger } from '../lib/logger';

interface InfrastructureShellProps {
  children: React.ReactNode;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  currentPath: string;
  username?: string;
  currentBusinessId?: string | null;
  availableBusinesses?: Array<{ id: string; name: string }>;
  onBusinessSwitch?: (businessId: string | null) => void;
}

export function InfrastructureShell({
  children,
  onNavigate,
  onLogout,
  currentPath,
  username,
  currentBusinessId,
  availableBusinesses = [],
  onBusinessSwitch
}: InfrastructureShellProps) {
  const navigationItems = getNavigationForRole('infrastructure_owner');

  const menuItems: MenuItemConfig[] = navigationItems
    .filter(item => item.visible)
    .filter(item => {
      if (!item.requiredRoles) return true;
      return item.requiredRoles.includes('infrastructure_owner');
    })
    .map(item => ({
      id: item.id,
      label: item.label,
      icon: item.icon || '📌',
      path: item.path,
    }));

  const handleShowCreateUser = () => {
    logger.info('[InfrastructureShell] Navigate to team management');
    onNavigate('/infrastructure/team');
  };

  const handleShowCreateTask = () => {
    logger.info('[InfrastructureShell] Navigate to tasks');
    onNavigate('/infrastructure/tasks');
  };

  return (
    <BaseShell
      role="infrastructure_owner"
      currentPath={currentPath}
      onNavigate={onNavigate}
      onLogout={onLogout}
      title="Infrastructure Owner"
    >
      {/* Business Switcher UI - can be added to header */}
      {availableBusinesses.length > 0 && onBusinessSwitch && (
        <div style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 1000,
          background: 'white',
          padding: '0.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <select
            value={currentBusinessId || ''}
            onChange={(e) => onBusinessSwitch(e.target.value || null)}
            style={{
              padding: '0.5rem',
              borderRadius: '0.25rem',
              border: '1px solid #ddd',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="">All Businesses (Infrastructure View)</option>
            {availableBusinesses.map(business => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <UnifiedAppFrame
        menuItems={menuItems}
        currentPath={currentPath}
        onNavigate={onNavigate}
        title="Infrastructure Menu"
        onShowCreateUser={handleShowCreateUser}
        onShowCreateTask={handleShowCreateTask}
      >
        {children}
      </UnifiedAppFrame>
    </BaseShell>
  );
}
