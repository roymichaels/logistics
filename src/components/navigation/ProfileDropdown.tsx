import React, { useState, useRef, useEffect } from 'react';
import { colors } from '../../styles/design-system';
import { useI18n } from '../../lib/i18n';

interface ProfileDropdownProps {
  user: {
    id: string;
    email?: string;
    wallet_address?: string;
    full_name?: string;
  } | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  compact?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function ProfileDropdown({
  user,
  onNavigate,
  onLogout,
  compact = false,
  position = 'top'
}: ProfileDropdownProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { translations } = useI18n();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  if (!user) return null;

  const displayName = user.full_name || user.email?.split('@')[0] ||
    (user.wallet_address ? `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}` : 'User');

  const getDropdownStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      zIndex: 9999,
      minWidth: '240px',
      background: 'rgba(21, 32, 43, 0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(56, 68, 77, 0.8)',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 1px rgba(29, 161, 242, 0.3)',
      overflow: 'hidden'
    };

    switch (position) {
      case 'bottom':
        return { ...baseStyle, bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px' };
      case 'top':
        return { ...baseStyle, top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px' };
      case 'left':
        return { ...baseStyle, right: '100%', top: '0', marginRight: '8px' };
      case 'right':
        return { ...baseStyle, left: '100%', top: '0', marginLeft: '8px' };
      default:
        return baseStyle;
    }
  };

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        style={{
          display: 'flex',
          flexDirection: compact ? 'column' : 'row',
          alignItems: 'center',
          gap: compact ? '4px' : '8px',
          padding: compact ? '8px 4px' : '8px 12px',
          border: 'none',
          background: dropdownOpen
            ? 'rgba(29, 161, 242, 0.15)'
            : 'transparent',
          borderRadius: '8px',
          color: colors.text.primary,
          cursor: 'pointer',
          fontSize: compact ? '11px' : '14px',
          fontWeight: '600',
          transition: 'all 200ms ease-in-out',
          width: '100%'
        }}
        onMouseEnter={(e) => {
          if (!dropdownOpen) {
            e.currentTarget.style.background = 'rgba(29, 161, 242, 0.1)';
          }
        }}
        onMouseLeave={(e) => {
          if (!dropdownOpen) {
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        <div
          style={{
            width: compact ? '32px' : '40px',
            height: compact ? '32px' : '40px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.secondary})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: compact ? '16px' : '20px',
            fontWeight: '700',
            color: colors.white,
            border: `2px solid ${colors.brand.primary}`,
            boxShadow: '0 2px 8px rgba(29, 161, 242, 0.3)'
          }}
        >
          {displayName.charAt(0).toUpperCase()}
        </div>
        {!compact && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            flex: 1,
            minWidth: 0
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '700',
              color: colors.text.primary,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%'
            }}>
              {displayName}
            </div>
            {(user.email || user.wallet_address) && (
              <div style={{
                fontSize: '12px',
                color: colors.text.secondary,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%'
              }}>
                {user.email || `${user.wallet_address?.slice(0, 6)}...${user.wallet_address?.slice(-4)}`}
              </div>
            )}
          </div>
        )}
        <span style={{
          fontSize: '12px',
          color: colors.text.secondary,
          transition: 'transform 200ms ease-in-out',
          transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
        }}>
          ▼
        </span>
      </button>

      {dropdownOpen && (
        <div style={getDropdownStyle()}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(56, 68, 77, 0.6)',
            background: 'rgba(29, 161, 242, 0.05)'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '700',
              color: colors.text.primary,
              marginBottom: '4px'
            }}>
              {displayName}
            </div>
            {(user.email || user.wallet_address) && (
              <div style={{
                fontSize: '12px',
                color: colors.text.secondary,
                wordBreak: 'break-all'
              }}>
                {user.email || user.wallet_address}
              </div>
            )}
          </div>

          <div style={{ padding: '8px' }}>
            <button
              onClick={() => {
                setDropdownOpen(false);
                onNavigate('/profile');
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                border: 'none',
                background: 'transparent',
                color: colors.text.primary,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                borderRadius: '6px',
                transition: 'all 150ms ease-in-out'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(29, 161, 242, 0.1)';
                e.currentTarget.style.color = colors.brand.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = colors.text.primary;
              }}
            >
              <span style={{ fontSize: '18px' }}>👤</span>
              <span>{translations.profile || 'Profile'}</span>
            </button>

            <button
              onClick={() => {
                setDropdownOpen(false);
                onNavigate('/settings');
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                border: 'none',
                background: 'transparent',
                color: colors.text.primary,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                borderRadius: '6px',
                transition: 'all 150ms ease-in-out'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(29, 161, 242, 0.1)';
                e.currentTarget.style.color = colors.brand.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = colors.text.primary;
              }}
            >
              <span style={{ fontSize: '18px' }}>⚙️</span>
              <span>{translations.settings || 'Settings'}</span>
            </button>
          </div>

          <div style={{
            padding: '8px',
            borderTop: '1px solid rgba(56, 68, 77, 0.6)'
          }}>
            <button
              onClick={() => {
                setDropdownOpen(false);
                onLogout();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                border: 'none',
                background: 'transparent',
                color: colors.status.error,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '700',
                borderRadius: '6px',
                transition: 'all 150ms ease-in-out'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{ fontSize: '18px' }}>🚪</span>
              <span>{translations.logout || 'Logout'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
