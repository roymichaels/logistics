import React, { useState, useRef, useEffect } from 'react';
import { Avatar, Text, Divider } from '../atoms';
import { colors, spacing, borderRadius, shadows, zIndex } from '../../styles/design-system';

export interface UserMenuProps {
  user?: {
    name?: string;
    first_name?: string;
    username?: string;
    role?: string;
    photo_url?: string;
  };
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

const roleDisplayMap: Record<string, string> = {
  infrastructure_owner: 'בעל תשתית 👑',
  business_owner: 'בעלים 👑',
  manager: 'מנהל',
  dispatcher: 'מוקדן',
  driver: 'נהג',
  warehouse: 'מחסנאי',
  sales: 'מכירות',
  customer_service: 'שירות',
};

export function UserMenu({ user, onNavigate, onLogout }: UserMenuProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const userName = user?.name || user?.first_name || 'משתמש';
  const userInitial = userName[0]?.toUpperCase() || 'U';
  const roleDisplay = user?.role ? roleDisplayMap[user.role] || user.role : '';

  const getSettingsPath = (role?: string): string => {
    if (!role) return '/store/profile';

    switch (role) {
      case 'superadmin':
      case 'admin':
        return '/admin/system-settings';
      case 'infrastructure_owner':
      case 'accountant':
        return '/infrastructure/settings';
      case 'business_owner':
      case 'manager':
      case 'warehouse':
      case 'dispatcher':
      case 'sales':
      case 'customer_service':
        return '/business/settings';
      case 'driver':
        return '/driver/profile';
      case 'customer':
      case 'user':
      default:
        return '/store/profile';
    }
  };

  const getProfilePath = (role?: string): string => {
    if (!role) return '/store/profile';

    switch (role) {
      case 'driver':
        return '/driver/profile';
      case 'customer':
      case 'user':
        return '/store/profile';
      default:
        return '/store/profile';
    }
  };

  const handleMenuClick = (action: 'profile' | 'settings' | 'logout') => {
    setDropdownOpen(false);
    switch (action) {
      case 'profile':
        onNavigate?.(getProfilePath(user?.role));
        break;
      case 'settings':
        onNavigate?.(getSettingsPath(user?.role));
        break;
      case 'logout':
        onLogout?.();
        break;
    }
  };

  const avatarButtonStyles: React.CSSProperties = {
    width: 'clamp(40px, 10vw, 44px)',
    height: 'clamp(40px, 10vw, 44px)',
    minWidth: '44px',
    minHeight: '44px',
    borderRadius: borderRadius.full,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: user?.photo_url
      ? `url(${user.photo_url}) center/cover`
      : 'rgba(255, 255, 255, 0.05)',
    color: 'rgba(255, 255, 255, 0.7)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'clamp(16px, 5vw, 18px)',
    fontWeight: 700,
    transition: 'all 0.15s ease',
    flexShrink: 0,
    padding: 0,
    boxShadow: dropdownOpen ? '0 0 0 2px rgba(29, 155, 240, 0.5)' : 'none',
  };

  const dropdownStyles: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: 0,
    right: 'auto',
    minWidth: '240px',
    maxWidth: 'calc(100vw - 16px)',
    background: 'rgba(30, 30, 35, 0.98)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.xl,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(12px)',
    zIndex: zIndex.dropdown,
    overflow: 'hidden',
  };

  const userInfoStyles: React.CSSProperties = {
    padding: spacing.lg,
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  };

  const menuItemStyles: React.CSSProperties = {
    width: '100%',
    padding: `${spacing.md} ${spacing.lg}`,
    background: 'transparent',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    cursor: 'pointer',
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '14px',
    transition: 'all 0.15s ease',
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        style={avatarButtonStyles}
        aria-label="User menu"
        aria-expanded={dropdownOpen}
      >
        {!user?.photo_url && userInitial}
      </button>

      {dropdownOpen && (
        <div style={dropdownStyles}>
          <div style={userInfoStyles}>
            <Text variant="body" weight="semibold" style={{ marginBottom: spacing.xs, color: 'rgba(255, 255, 255, 0.95)' }}>
              {userName}
            </Text>
            {user?.username && (
              <Text variant="small" style={{ marginBottom: spacing.xs, color: 'rgba(255, 255, 255, 0.6)' }}>
                @{user.username}
              </Text>
            )}
            {roleDisplay && (
              <Text variant="small" style={{ color: '#1D9BF0' }}>
                {roleDisplay}
              </Text>
            )}
          </div>

          <div style={{ padding: `${spacing.xs} 0` }}>
            <button
              onClick={() => handleMenuClick('profile')}
              style={menuItemStyles}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{ fontSize: '18px' }}>👤</span>
              <span>הפרופיל שלי</span>
            </button>

            <button
              onClick={() => handleMenuClick('settings')}
              style={menuItemStyles}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{ fontSize: '18px' }}>⚙️</span>
              <span>הגדרות</span>
            </button>

            <Divider spacing="xs" />

            <button
              onClick={() => handleMenuClick('logout')}
              style={{ ...menuItemStyles, color: '#FF4444' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 68, 68, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{ fontSize: '18px' }}>🚪</span>
              <span>התנתק</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
