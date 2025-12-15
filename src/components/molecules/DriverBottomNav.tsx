import React from 'react';
import { colors, spacing, transitions } from '../../design-system';

export interface DriverBottomNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

interface NavItemData {
  icon: string;
  label: string;
  path: string;
}

const navItems: NavItemData[] = [
  { icon: '🏠', label: 'Home', path: '/driver/dashboard' },
  { icon: '📋', label: 'Deliveries', path: '/driver/routes' },
  { icon: '📦', label: 'Inventory', path: '/driver/my-inventory' },
  { icon: '📍', label: 'Zones', path: '/driver/my-zones' },
  { icon: '👤', label: 'Profile', path: '/store/profile' },
];

export function DriverBottomNav({ currentPath, onNavigate }: DriverBottomNavProps) {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: colors.ui.card,
        borderTop: `1px solid ${colors.border.primary}`,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: `0 ${spacing[2]}`,
        zIndex: 1000,
      }}
    >
      {navItems.map((item) => {
        const isActive = currentPath.startsWith(item.path);
        return (
          <button
            key={item.path}
            onClick={() => onNavigate(item.path)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: spacing[1],
              padding: spacing[2],
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: isActive ? colors.brand.primary : colors.text.secondary,
              transition: transitions.normal,
            }}
          >
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            <span style={{ fontSize: '11px', fontWeight: isActive ? 600 : 400 }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
