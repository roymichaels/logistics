import React, { useCallback, useMemo, useContext } from 'react';
import { Button } from './atoms';
import { UserMenu } from './organisms/UserMenu';
import { colors, spacing } from '../styles/design-system';
import { BusinessContextSelector } from './BusinessContextSelector';
import { LanguageToggle } from './LanguageToggle';
import { GlowingPortalLogo } from './GlowingPortalLogo';
import { requiresBusinessContext } from '../lib/rolePermissions';
import { AppServicesContext } from '../context/AppServicesContext';
import {
  useDashboardRefetch,
  useInventoryRefetch,
  useOrdersRefetch
} from '../hooks/useBusinessDataRefetch';

interface HeaderProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
  onCreateBusiness?: () => void;
  onBecomeDriver?: () => void;
  onSearchBusiness?: () => void;
}

export const Header = React.memo(function Header({
  onNavigate,
  onLogout,
  onCreateBusiness,
  onBecomeDriver,
  onSearchBusiness
}: HeaderProps) {
  const context = useContext(AppServicesContext);
  const user = context?.user;
  const dataStore = context?.dataStore;
  const currentBusinessId = context?.currentBusinessId;
  const setBusinessId = context?.setBusinessId;

  const refetchOrders = useOrdersRefetch();
  const refetchInventory = useInventoryRefetch();
  const refetchDashboard = useDashboardRefetch();

  const handleBusinessContextChange = useCallback(
    (businessId: string) => {
      if (businessId === currentBusinessId) {
        return;
      }

      if (setBusinessId) {
        setBusinessId(businessId);
      }

      void Promise.all([
        refetchOrders(businessId),
        refetchInventory(businessId),
        refetchDashboard(businessId)
      ]);
    },
    [currentBusinessId, setBusinessId, refetchOrders, refetchInventory, refetchDashboard]
  );

  const headerStyles: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    borderBottom: `1px solid ${colors.border.primary}`,
    background: 'rgba(10, 14, 20, 0.9)',
    backdropFilter: 'blur(16px)',
    padding: `${spacing.md} ${spacing.xl}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    minHeight: '64px',
  };

  const logoContainerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    cursor: 'pointer',
  };

  const brandTextStyles: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 700,
    color: colors.text.primary,
    whiteSpace: 'nowrap',
  };

  const centerSectionStyles: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  };

  const rightSectionStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
  };

  return (
    <header style={headerStyles}>
      {/* Logo/Brand */}
      <div style={logoContainerStyles} onClick={() => onNavigate('dashboard')}>
        <GlowingPortalLogo size={40} pulseSpeed={2} />
        <div style={brandTextStyles}>UndergroundLab</div>
      </div>

      {/* Center Section - Navigation or Business Context Selector */}
      <div style={centerSectionStyles}>
        {user && dataStore && requiresBusinessContext(user) ? (
          <BusinessContextSelector
            dataStore={dataStore}
            user={user}
            onContextChanged={handleBusinessContextChange}
          />
        ) : (
          user && (
            <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap' }}>
              {onCreateBusiness && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon="🏢"
                  onClick={onCreateBusiness}
                >
                  צור עסק
                </Button>
              )}
              {onBecomeDriver && user?.role !== 'driver' && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon="🚗"
                  onClick={onBecomeDriver}
                >
                  הפוך לנהג
                </Button>
              )}
              {onSearchBusiness && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon="🔍"
                  onClick={onSearchBusiness}
                >
                  חפש עסק
                </Button>
              )}
            </div>
          )
        )}
      </div>

      {/* Right Section - Language Toggle and User Menu */}
      <div style={rightSectionStyles}>
        <LanguageToggle variant="switch" size="small" />
        <UserMenu user={user} onNavigate={onNavigate} onLogout={onLogout} />
      </div>
    </header>
  );
});
