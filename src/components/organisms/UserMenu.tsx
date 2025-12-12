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

  const handleMenuClick = (action: 'profile' | 'settings' | 'logout') => {
    setDropdownOpen(false);
    switch (action) {
      case 'profile':
        onNavigate?.('profile');
        break;
      case 'settings':
        onNavigate?.('settings');
        break;
      case 'logout':
        onLogout?.();
        break;
    }
  };

  const avatarButtonStyles: React.CSSProperties = {
    width: '40px',
    height: '40px',
    borderRadius: borderRadius.full,
    border: `2px solid ${colors.brand.primary}`,
    background: user?.photo_url
      ? `url(${user.photo_url}) center/cover`
      : colors.brand.primary,
    color: colors.white,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 700,
    transition: 'all 0.2s ease',
    boxShadow: dropdownOpen ? `0 0 0 3px ${colors.brand.primaryFaded}` : shadows.md,
  };

  const dropdownStyles: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: 0,
    right: 'auto',
    minWidth: '240px',
    maxWidth: 'calc(100vw - 16px)',
    background: colors.ui.card,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.xl,
    boxShadow: shadows.xl,
    zIndex: zIndex.dropdown,
    overflow: 'hidden',
  };

  const userInfoStyles: React.CSSProperties = {
    padding: spacing.lg,
    borderBottom: `1px solid ${colors.border.primary}`,
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
    color: colors.text.primary,
    fontSize: '14px',
    transition: 'background 0.2s ease',
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
            <Text variant="body" weight="semibold" style={{ marginBottom: spacing.xs }}>
              {userName}
            </Text>
            {user?.username && (
              <Text variant="small" color="secondary" style={{ marginBottom: spacing.xs }}>
                @{user.username}
              </Text>
            )}
            {roleDisplay && (
              <Text variant="small" style={{ color: colors.brand.primary }}>
                {roleDisplay}
              </Text>
            )}
          </div>

          <div style={{ padding: `${spacing.xs} 0` }}>
            <button
              onClick={() => handleMenuClick('profile')}
              style={menuItemStyles}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.ui.cardHover;
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
                e.currentTarget.style.background = colors.ui.cardHover;
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
              style={{ ...menuItemStyles, color: colors.status.error }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.status.errorFaded;
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
