import React, { useState, useRef, useEffect, useCallback, useMemo, useContext } from 'react';
import { colors, spacing, borderRadius, shadows, typography, transitions, navigation, gradients } from '../styles/design-system';
import { Button } from './atoms/Button';
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
import '../styles/header.css';

interface HeaderProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
  onCreateBusiness?: () => void;
  onBecomeDriver?: () => void;
  onSearchBusiness?: () => void;
}

export const Header = React.memo(function Header({ onNavigate, onLogout, onCreateBusiness, onBecomeDriver, onSearchBusiness }: HeaderProps) {
  const context = useContext(AppServicesContext);
  const user = context?.user;
  const dataStore = context?.dataStore;
  const currentBusinessId = context?.currentBusinessId;
  const setBusinessId = context?.setBusinessId;

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const refetchOrders = useOrdersRefetch();
  const refetchInventory = useInventoryRefetch();
  const refetchDashboard = useDashboardRefetch();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  const userName = useMemo(() => user?.name || (user as any)?.first_name || 'משתמש', [user]);
  const userInitial = useMemo(() => userName[0]?.toUpperCase() || 'U', [userName]);

  const handleMenuClick = useCallback((action: 'profile' | 'settings' | 'logout') => {
    setDropdownOpen(false);

    switch (action) {
      case 'profile':
        onNavigate('profile');
        break;
      case 'settings':
        onNavigate('settings');
        break;
      case 'logout':
        onLogout();
        break;
    }
  }, [onNavigate, onLogout]);

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

  return (
    <header
      className="header-container"
      style={{
        borderBottom: `1px solid ${navigation.border}`,
        background: navigation.background,
        backdropFilter: navigation.backdropFilter
      }}
    >
      {/* Logo/Brand */}
      <div className="header-logo-container">
        <GlowingPortalLogo size={40} pulseSpeed={2} />
        <div className="header-brand-container">
          <div className="header-brand-title" style={{ color: colors.text.primary }}>
            UndergroundLab
          </div>
        </div>
      </div>

      {/* Center Section - Navigation or Business Context Selector */}
      <div className="header-center-section">
        {user && dataStore && requiresBusinessContext(user) ? (
          <BusinessContextSelector
            dataStore={dataStore}
            user={user}
            onContextChanged={handleBusinessContextChange}
          />
        ) : user && (
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            {onCreateBusiness && (
              <Button
                onClick={onCreateBusiness}
                variant="primary"
                size="sm"
                leftIcon={<span>🏢</span>}
              >
                צור עסק
              </Button>
            )}
            {onBecomeDriver && user?.role !== 'driver' && (
              <Button
                onClick={onBecomeDriver}
                variant="secondary"
                size="sm"
                leftIcon={<span>🚗</span>}
              >
                הפוך לנהג
              </Button>
            )}
            {onSearchBusiness && (
              <Button
                onClick={onSearchBusiness}
                variant="secondary"
                size="sm"
                leftIcon={<span>🔍</span>}
              >
                חפש עסק
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Language Toggle and User Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <LanguageToggle variant="switch" size="small" />

        <div ref={dropdownRef} className="header-dropdown-container">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`header-avatar-button ${dropdownOpen ? 'open' : ''}`}
            style={{
              border: `2px solid ${colors.brand.primary}`,
              background: user?.photo_url
                ? `url(${user.photo_url}) center/cover`
                : gradients.primary,
              color: colors.white,
              boxShadow: dropdownOpen
                ? shadows.glow
                : shadows.sm
            }}
          >
            {!user?.photo_url && userInitial}
          </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div
            className="header-dropdown-menu"
            style={{
              background: colors.ui.card,
              border: `1px solid ${colors.border.primary}`
            }}
          >
            {/* User Info Section */}
            <div
              className="header-dropdown-user-info"
              style={{ borderBottom: `1px solid ${colors.border.primary}` }}
            >
              <div className="header-dropdown-username" style={{ color: colors.text.primary }}>
                {userName}
              </div>
              {user?.username && (
                <div className="header-dropdown-handle" style={{ color: colors.text.secondary }}>
                  @{user.username}
                </div>
              )}
              <div className="header-dropdown-role" style={{ color: colors.brand.primary }}>
                {user?.role === 'infrastructure_owner' ? 'בעל תשתית 👑' :
                 user?.role === 'business_owner' ? 'בעלים 👑' :
                 user?.role === 'manager' ? 'מנהל' :
                 user?.role === 'dispatcher' ? 'מוקדן' :
                 user?.role === 'driver' ? 'נהג' :
                 user?.role === 'warehouse' ? 'מחסנאי' :
                 user?.role === 'sales' ? 'מכירות' :
                 user?.role === 'customer_service' ? 'שירות' : user?.role}
              </div>
            </div>

            {/* Menu Items */}
            <div className="header-dropdown-items">
              <button
                onClick={() => handleMenuClick('profile')}
                className="header-dropdown-button"
                style={{ color: colors.text.primary }}
              >
                <span className="header-dropdown-button-icon">👤</span>
                <span className="header-dropdown-button-text">הפרופיל שלי</span>
              </button>

              <button
                onClick={() => handleMenuClick('settings')}
                className="header-dropdown-button"
                style={{ color: colors.text.primary }}
              >
                <span className="header-dropdown-button-icon">⚙️</span>
                <span className="header-dropdown-button-text">הגדרות</span>
              </button>

              <div
                className="header-dropdown-divider"
                style={{ background: colors.border.primary }}
              />

              <button
                onClick={() => handleMenuClick('logout')}
                className="header-dropdown-button logout"
              >
                <span className="header-dropdown-button-icon">🚪</span>
                <span className="header-dropdown-button-text">התנתק</span>
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </header>
  );
});
