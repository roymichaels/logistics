import React from 'react';
import { colors, spacing, borderRadius, typography, transitions } from '../../design-system';

export interface BusinessSidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

interface NavItemData {
  icon: string;
  label: string;
  path: string;
}

const navItems: NavItemData[] = [
  { icon: '📊', label: 'לוח בקרה', path: '/business/dashboard' },
  { icon: '📦', label: 'מוצרים', path: '/business/products' },
  { icon: '📋', label: 'הזמנות', path: '/business/orders' },
  { icon: '🏪', label: 'מלאי', path: '/business/inventory' },
  { icon: '🚗', label: 'נהגים', path: '/business/drivers' },
  { icon: '📍', label: 'אזורים', path: '/business/zones' },
  { icon: '📊', label: 'דוחות', path: '/business/reports' },
];

export function BusinessSidebar({ currentPath, onNavigate }: BusinessSidebarProps) {
  return (
    <aside
      style={{
        width: '240px',
        height: '100%',
        background: colors.ui.card,
        borderLeft: `1px solid ${colors.border.primary}`,
        padding: spacing[4],
        overflowY: 'auto',
        direction: 'rtl',
      }}
    >
      <nav style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
        {navItems.map((item) => {
          const isActive = currentPath.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[3],
                padding: `${spacing[3]} ${spacing[4]}`,
                background: isActive ? colors.brand.primary : 'transparent',
                color: isActive ? colors.white : colors.text.primary,
                border: 'none',
                borderRadius: borderRadius.lg,
                cursor: 'pointer',
                fontSize: typography.fontSize.base,
                fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.normal,
                transition: transitions.normal,
                textAlign: 'right',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = colors.ui.cardHover;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
