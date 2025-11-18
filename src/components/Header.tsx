import React, { useState, useRef, useEffect, useCallback, useMemo, useContext } from 'react';
import { colors, spacing, borderRadius, shadows, typography, transitions, navigation, gradients } from '../styles/design-system';
import { Button } from './atoms/Button';
import { LanguageToggle } from './LanguageToggle';
import { GlowingPortalLogo } from './GlowingPortalLogo';
import { requiresBusinessContext } from '../lib/rolePermissions';
import { AppServicesContext } from '../context/AppServicesContext';
import { UserBusinessAccess } from '../data/types';
import {
  useDashboardRefetch,
  useInventoryRefetch,
  useOrdersRefetch
} from '../hooks/useBusinessDataRefetch';
import { logger } from '../lib/logger';
import { useI18n } from '../lib/i18n';
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
  const { t, translations } = useI18n();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [businessDropdownOpen, setBusinessDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const businessDropdownRef = useRef<HTMLDivElement>(null);
  const [businesses, setBusinesses] = useState<UserBusinessAccess[]>([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);
  const refetchOrders = useOrdersRefetch();
  const refetchInventory = useInventoryRefetch();
  const refetchDashboard = useDashboardRefetch();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (businessDropdownRef.current && !businessDropdownRef.current.contains(event.target as Node)) {
        setBusinessDropdownOpen(false);
      }
    }

    if (dropdownOpen || businessDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen, businessDropdownOpen]);

  useEffect(() => {
    if (user && dataStore && requiresBusinessContext(user)) {
      loadBusinesses();
    }
  }, [user, dataStore]);

  const loadBusinesses = async () => {
    if (!dataStore.getUserBusinesses) return;

    try {
      setLoadingBusinesses(true);
      const userBusinesses = await dataStore.getUserBusinesses();
      setBusinesses(userBusinesses);
    } catch (error: any) {
      logger.error('Failed to load businesses:', error);
    } finally {
      setLoadingBusinesses(false);
    }
  };

  const userName = useMemo(() => user?.name || (user as any)?.first_name || t('phrases', 'user'), [user, translations]);
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

      {/* Center Section - Compact Business Selector */}
      <div className="header-center-section">
        {user && dataStore && requiresBusinessContext(user) ? (
          <div ref={businessDropdownRef} className="header-dropdown-container">
            <button
              onClick={() => setBusinessDropdownOpen(!businessDropdownOpen)}
              className={`header-business-button ${businessDropdownOpen ? 'open' : ''}`}
              style={{
                background: colors.ui.card,
                border: `1px solid ${colors.border.primary}`,
                color: colors.text.primary,
                boxShadow: businessDropdownOpen ? shadows.glow : shadows.sm
              }}
            >
              <span style={{ fontSize: '18px' }}>🏢</span>
            </button>

            {businessDropdownOpen && (
              <div
                className="header-dropdown-menu header-business-dropdown"
                style={{
                  background: colors.ui.card,
                  border: `1px solid ${colors.border.primary}`
                }}
              >
                <div
                  className="header-dropdown-user-info"
                  style={{ borderBottom: `1px solid ${colors.border.primary}` }}
                >
                  <div className="header-dropdown-username" style={{ color: colors.text.primary }}>
                    {translations.header.myBusinesses}
                  </div>
                </div>

                <div className="header-dropdown-items">
                  {loadingBusinesses ? (
                    <div style={{ padding: '12px 16px', color: colors.text.secondary, textAlign: 'center' }}>
                      {translations.header.loading}
                    </div>
                  ) : businesses.length === 0 ? (
                    <div style={{ padding: '12px 16px', color: colors.text.secondary, textAlign: 'center' }}>
                      {translations.header.noBusinesses}
                    </div>
                  ) : (
                    businesses.map(business => {
                      const isActive = business.business_id === currentBusinessId;
                      return (
                        <button
                          key={business.business_id}
                          onClick={() => {
                            handleBusinessContextChange(business.business_id);
                            onNavigate('businesses');
                            setBusinessDropdownOpen(false);
                          }}
                          className="header-dropdown-button"
                          style={{
                            color: colors.text.primary,
                            background: isActive ? 'rgba(29, 161, 242, 0.1)' : 'transparent'
                          }}
                        >
                          <span className="header-dropdown-button-icon">
                            {isActive ? '✓' : '🏢'}
                          </span>
                          <div style={{ flex: 1, textAlign: 'right' }}>
                            <div className="header-dropdown-button-text">
                              {business.business_name}
                            </div>
                            <div style={{ fontSize: '11px', color: colors.text.tertiary, marginTop: '2px' }}>
                              {business.business_role}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
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
                {translations.header.createBusiness}
              </Button>
            )}
            {onBecomeDriver && user?.role !== 'driver' && (
              <Button
                onClick={onBecomeDriver}
                variant="secondary"
                size="sm"
                leftIcon={<span>🚗</span>}
              >
                {translations.header.becomeDriver}
              </Button>
            )}
            {onSearchBusiness && (
              <Button
                onClick={onSearchBusiness}
                variant="secondary"
                size="sm"
                leftIcon={<span>🔍</span>}
              >
                {translations.header.searchBusiness}
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
                {user?.role === 'infrastructure_owner' ? translations.roles.infrastructureOwner :
                 user?.role === 'business_owner' ? translations.roles.businessOwner :
                 user?.role === 'manager' ? translations.roles.manager :
                 user?.role === 'dispatcher' ? translations.roles.dispatcher :
                 user?.role === 'driver' ? translations.roles.driver :
                 user?.role === 'warehouse' ? translations.roles.warehouse :
                 user?.role === 'sales' ? translations.roles.sales :
                 user?.role === 'customer_service' ? translations.roles.customerService : user?.role}
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
                <span className="header-dropdown-button-text">{translations.header.myProfile}</span>
              </button>

              <button
                onClick={() => handleMenuClick('settings')}
                className="header-dropdown-button"
                style={{ color: colors.text.primary }}
              >
                <span className="header-dropdown-button-icon">⚙️</span>
                <span className="header-dropdown-button-text">{translations.settings}</span>
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
                <span className="header-dropdown-button-text">{translations.header.logout}</span>
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </header>
  );
});
