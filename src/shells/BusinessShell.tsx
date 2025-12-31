import React, { useState } from 'react';
import { BaseShell } from './BaseShell';
import { UserRole } from './types';
import { UnifiedAppFrame } from '../layouts/UnifiedAppFrame';
import { getNavigationForRole } from './navigationSchema';
import { MenuItemConfig } from '../components/navigation/UnifiedMenuPanel';
import { logger } from '../lib/logger';

interface BusinessShellProps {
  children: React.ReactNode;
  role: UserRole;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  currentPath: string;
  businessName?: string;
  businessId?: string;
  availableBusinesses?: Array<{ id: string; name: string }>;
  onBusinessSwitch?: (businessId: string | null) => void;
}

export function BusinessShell({
  children,
  role,
  onNavigate,
  onLogout,
  currentPath,
  businessName,
  businessId,
  availableBusinesses = [],
  onBusinessSwitch
}: BusinessShellProps) {
  const [showOrderWizard, setShowOrderWizard] = useState(false);

  const navigationItems = getNavigationForRole(role);
  const isMultiBusinessOwner = role === 'infrastructure_owner' || (role === 'business_owner' && availableBusinesses.length > 1);

  const menuItems: MenuItemConfig[] = navigationItems
    .filter(item => item.visible)
    .filter(item => {
      if (!item.requiredRoles) return true;
      return item.requiredRoles.includes(role as any);
    })
    .map(item => ({
      id: item.id,
      label: item.label,
      icon: item.icon || '📌',
      path: item.path,
    }));

  const handleShowModeSelector = () => {
    logger.info('[BusinessShell] Opening order wizard');
    setShowOrderWizard(true);
  };

  const handleShowCreateTask = () => {
    logger.info('[BusinessShell] Navigate to tasks');
    onNavigate('/business/tasks');
  };

  const handleShowScanBarcode = () => {
    logger.info('[BusinessShell] Navigate to incoming');
    onNavigate('/business/incoming');
  };

  const handleShowContactCustomer = () => {
    logger.info('[BusinessShell] Navigate to chat');
    onNavigate('/business/chat');
  };

  const handleShowCheckInventory = () => {
    logger.info('[BusinessShell] Navigate to inventory');
    onNavigate('/business/inventory');
  };

  const handleShowCreateRoute = () => {
    logger.info('[BusinessShell] Navigate to dispatch');
    onNavigate('/business/dispatch');
  };

  const handleShowCreateUser = () => {
    logger.info('[BusinessShell] Navigate to team management');
    onNavigate('/business/team');
  };

  const handleShowCreateProduct = () => {
    logger.info('[BusinessShell] Navigate to products');
    onNavigate('/business/products');
  };

  return (
    <BaseShell
      role={role}
      currentPath={currentPath}
      onNavigate={onNavigate}
      onLogout={onLogout}
      title={businessName || (isMultiBusinessOwner ? 'Multi-Business Portal' : 'Business Portal')}
    >
      {isMultiBusinessOwner && availableBusinesses.length > 0 && onBusinessSwitch && (
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
            value={businessId || ''}
            onChange={(e) => onBusinessSwitch(e.target.value || null)}
            style={{
              padding: '0.5rem',
              borderRadius: '0.25rem',
              border: '1px solid #ddd',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="">All Businesses</option>
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
        title={isMultiBusinessOwner ? 'Multi-Business Menu' : 'Business Menu'}
        onShowModeSelector={handleShowModeSelector}
        onShowCreateTask={handleShowCreateTask}
        onShowScanBarcode={handleShowScanBarcode}
        onShowContactCustomer={handleShowContactCustomer}
        onShowCheckInventory={handleShowCheckInventory}
        onShowCreateRoute={handleShowCreateRoute}
        onShowCreateUser={handleShowCreateUser}
        onShowCreateProduct={handleShowCreateProduct}
      >
        {children}
      </UnifiedAppFrame>
    </BaseShell>
  );
}
