import React, { useState } from 'react';
import { BaseShell } from './BaseShell';
import { UserRole } from './types';
import { UnifiedAppFrame } from '../layouts/UnifiedAppFrame';
import { getNavigationForRole } from './navigationSchema';
import { MenuItemConfig } from '../components/navigation/UnifiedMenuPanel';
import { BusinessHeaderSelector } from '../components/BusinessHeaderSelector';
import { logger } from '../lib/logger';
import { useBusinessScopedAccess } from '../hooks/useBusinessScopedAccess';

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
  onCreateBusiness?: () => void;
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
  onBusinessSwitch,
  onCreateBusiness
}: BusinessShellProps) {
  const [showOrderWizard, setShowOrderWizard] = useState(false);
  const businessAccess = useBusinessScopedAccess();

  const navigationItems = getNavigationForRole(role);
  const isMultiBusinessOwner = role === 'infrastructure_owner' || (role === 'business_owner' && availableBusinesses.length > 1);

  // Filter menu items - if no business context, only show business selection
  let menuItems: MenuItemConfig[] = [];

  if (businessAccess.isBusinessScopedRole && !businessAccess.hasBusinessContext) {
    // Show only business selection option
    menuItems = [
      {
        id: 'select-business',
        label: 'בחר עסק',
        icon: '🏢',
        path: '/business/businesses',
      }
    ];
  } else {
    menuItems = navigationItems
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
  }

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

  const handleCreateBusiness = () => {
    logger.info('[BusinessShell] Create business clicked');
    if (onCreateBusiness) {
      onCreateBusiness();
    } else {
      onNavigate('/business/businesses?action=create');
    }
  };

  const businessSelector = onBusinessSwitch && availableBusinesses.length > 0 ? (
    <BusinessHeaderSelector
      currentBusinessId={businessId || null}
      businesses={availableBusinesses}
      onSwitch={(id) => onBusinessSwitch(id)}
      onCreateBusiness={handleCreateBusiness}
      loading={false}
    />
  ) : null;

  return (
    <BaseShell
      role={role}
      currentPath={currentPath}
      onNavigate={onNavigate}
      onLogout={onLogout}
      title={businessName || (isMultiBusinessOwner ? 'Multi-Business Portal' : 'Business Portal')}
    >
      <UnifiedAppFrame
        menuItems={menuItems}
        currentPath={currentPath}
        onNavigate={onNavigate}
        title={isMultiBusinessOwner ? 'Multi-Business Menu' : 'Business Menu'}
        businessSelector={businessSelector}
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
