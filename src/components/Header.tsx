import { useState, useRef, useEffect, useCallback } from 'react';
import { ROYAL_COLORS } from '../styles/royalTheme';
import { BusinessContextSelector } from './BusinessContextSelector';
import { requiresBusinessContext } from '../lib/rolePermissions';
import { useAppServices } from '../context/AppServicesContext';
import {
  useDashboardRefetch,
  useInventoryRefetch,
  useOrdersRefetch
} from '../hooks/useBusinessDataRefetch';

interface HeaderProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export function Header({ onNavigate, onLogout }: HeaderProps) {
  const { user, dataStore, currentBusinessId, setBusinessId } = useAppServices();
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

  // Debug: Log user data
  useEffect(() => {
    console.log('🔍 Header: User data received:', {
      hasUser: !!user,
      name: user?.name,
      first_name: (user as any)?.first_name,
      username: user?.username,
      photo_url: user?.photo_url,
      role: user?.role,
      fullUser: user
    });
  }, [user]);

  const userName = user?.name || (user as any)?.first_name || 'משתמש';
  const userInitial = userName[0]?.toUpperCase() || 'U';

  const handleMenuClick = (action: 'profile' | 'settings' | 'logout') => {
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
  };

  const handleBusinessContextChange = useCallback(
    (businessId: string) => {
      if (businessId === currentBusinessId) {
        return;
      }

      setBusinessId(businessId);

      void Promise.all([
        refetchOrders(businessId),
        refetchInventory(businessId),
        refetchDashboard(businessId)
      ]);
    },
    [currentBusinessId, setBusinessId, refetchOrders, refetchInventory, refetchDashboard]
  );

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '60px',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      borderBottom: `1px solid ${ROYAL_COLORS.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      zIndex: 1000,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
    }}>
      {/* Logo/Brand */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        {/* Twitter-style Blue Circle */}
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: '#1DA1F2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: '900',
          fontSize: '18px',
          boxShadow: '0 2px 8px rgba(29, 161, 242, 0.3)'
        }}>
          UL
        </div>

        {/* Brand Text */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{
            fontSize: '16px',
            fontWeight: '700',
            color: ROYAL_COLORS.text,
            letterSpacing: '0.5px'
          }}>
            UndergroundLab
          </div>
          <div style={{
            fontSize: '13px',
            fontFamily: 'cursive',
            color: ROYAL_COLORS.muted,
            fontStyle: 'italic',
            opacity: 0.7
          }}>
            Logistics
          </div>
        </div>
      </div>

      {/* Center Section - Business Context Selector */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 20px'
      }}>
        {user && dataStore && requiresBusinessContext(user) && (
          <BusinessContextSelector
            dataStore={dataStore}
            user={user}
            onContextChanged={handleBusinessContextChange}
          />
        )}
      </div>

      {/* User Avatar Dropdown */}
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: `2px solid ${ROYAL_COLORS.primary}`,
            background: user?.photo_url
              ? `url(${user.photo_url}) center/cover`
              : 'linear-gradient(135deg, #9C6DFF 0%, #7B3FF2 100%)',
            color: ROYAL_COLORS.white,
            fontSize: '16px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            boxShadow: dropdownOpen ? '0 0 0 3px rgba(156, 109, 255, 0.3)' : '0 2px 8px rgba(156, 109, 255, 0.2)',
            transform: dropdownOpen ? 'scale(1.05)' : 'scale(1)'
          }}
          onMouseEnter={(e) => {
            if (!dropdownOpen) {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(156, 109, 255, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if (!dropdownOpen) {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(156, 109, 255, 0.2)';
            }
          }}
        >
          {!user?.photo_url && userInitial}
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            width: '200px',
            background: ROYAL_COLORS.cardBg,
            border: `1px solid ${ROYAL_COLORS.border}`,
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden',
            animation: 'slideDown 0.2s ease'
          }}>
            {/* User Info Section */}
            <div style={{
              padding: '16px',
              borderBottom: `1px solid ${ROYAL_COLORS.border}`,
              background: 'linear-gradient(135deg, rgba(156, 109, 255, 0.2) 0%, rgba(123, 63, 242, 0.2) 100%)'
            }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '700',
                color: ROYAL_COLORS.text,
                marginBottom: '4px'
              }}>
                {userName}
              </div>
              {user?.username && (
                <div style={{
                  fontSize: '12px',
                  color: ROYAL_COLORS.muted
                }}>
                  @{user.username}
                </div>
              )}
              <div style={{
                fontSize: '11px',
                color: ROYAL_COLORS.primary,
                marginTop: '6px',
                padding: '4px 8px',
                background: 'rgba(156, 109, 255, 0.1)',
                borderRadius: '6px',
                display: 'inline-block'
              }}>
                {user?.role === 'owner' ? 'בעלים 👑' :
                 user?.role === 'manager' ? 'מנהל' :
                 user?.role === 'dispatcher' ? 'מוקדן' :
                 user?.role === 'driver' ? 'נהג' :
                 user?.role === 'warehouse' ? 'מחסנאי' :
                 user?.role === 'sales' ? 'מכירות' :
                 user?.role === 'customer_service' ? 'שירות' : user?.role}
              </div>
            </div>

            {/* Menu Items */}
            <div style={{ padding: '8px' }}>
              <button
                onClick={() => handleMenuClick('profile')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  color: ROYAL_COLORS.text,
                  fontSize: '14px',
                  textAlign: 'right',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(156, 109, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <span style={{ fontSize: '18px' }}>👤</span>
                <span style={{ flex: 1 }}>הפרופיל שלי</span>
              </button>

              <button
                onClick={() => handleMenuClick('settings')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  color: ROYAL_COLORS.text,
                  fontSize: '14px',
                  textAlign: 'right',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(156, 109, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <span style={{ fontSize: '18px' }}>⚙️</span>
                <span style={{ flex: 1 }}>הגדרות</span>
              </button>

              <div style={{
                height: '1px',
                background: ROYAL_COLORS.border,
                margin: '8px 0'
              }} />

              <button
                onClick={() => handleMenuClick('logout')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  color: '#ff4757',
                  fontSize: '14px',
                  textAlign: 'right',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 71, 87, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <span style={{ fontSize: '18px' }}>🚪</span>
                <span style={{ flex: 1 }}>התנתק</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </header>
  );
}
