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
  const [showOrderWizard, setShowOrderWizard] = useState(false);

  const navigationItems = getNavigationForRole(role);

  const menuItems: MenuItemConfig[] = navigationItems
    .filter(item => item.visible)
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
      title={businessName || 'Business Portal'}
    >
      <UnifiedAppFrame
        menuItems={menuItems}
        currentPath={currentPath}
        onNavigate={onNavigate}
        title="Business Menu"
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
