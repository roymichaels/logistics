import React from 'react';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { useAppServices } from '../context/AppServicesContext';
import { NavigationTab } from './molecules/NavigationTab';
import { Button } from './atoms';
import { colors, spacing, shadows, zIndex } from '../styles/design-system';

type RoleKey =
  | 'user'
  | 'infrastructure_owner'
  | 'business_owner'
  | 'manager'
  | 'dispatcher'
  | 'sales'
  | 'warehouse'
  | 'driver'
  | 'customer_service';

interface TabDefinition {
  id: string;
  label: string;
  icon: string;
}

interface RoleNavigationConfig {
  tabs: TabDefinition[];
  action?: {
    label: string;
    icon: string;
    disabled?: boolean;
  };
}

interface BottomNavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  userRole?: RoleKey;
  onShowActionMenu?: () => void;
  onOpenSidebar?: () => void;
}

const roleNavigation: Record<RoleKey, RoleNavigationConfig> = {
  user: {
    tabs: [
      { id: 'chat', label: 'צ\'אט', icon: '💬' },
      { id: 'notifications', label: 'התראות', icon: '🔔' },
      { id: 'tasks', label: 'משימות', icon: '✅' }
    ],
    action: { label: 'פעולות', icon: '⚡' }
  },
  infrastructure_owner: {
    tabs: [
      { id: 'chat', label: 'צ\'אט', icon: '💬' },
      { id: 'notifications', label: 'התראות', icon: '🔔' },
      { id: 'tasks', label: 'משימות', icon: '✅' }
    ],
    action: { label: 'פעולות', icon: '⚡' }
  },
  business_owner: {
    tabs: [
      { id: 'chat', label: 'צ\'אט', icon: '💬' },
      { id: 'notifications', label: 'התראות', icon: '🔔' },
      { id: 'orders', label: 'הזמנות', icon: '📦' }
    ],
    action: { label: 'יצירה', icon: '➕' }
  },
  manager: {
    tabs: [
      { id: 'orders', label: 'הזמנות', icon: '📦' },
      { id: 'notifications', label: 'התראות', icon: '🔔' },
      { id: 'tasks', label: 'משימות', icon: '✅' }
    ],
    action: { label: 'יצירה', icon: '➕' }
  },
  dispatcher: {
    tabs: [
      { id: 'orders', label: 'הזמנות', icon: '📦' },
      { id: 'drivers', label: 'נהגים', icon: '🚗' },
      { id: 'tasks', label: 'משימות', icon: '✅' }
    ],
    action: { label: 'שיבוץ', icon: '🎯' }
  },
  sales: {
    tabs: [
      { id: 'orders', label: 'הזמנות', icon: '📦' },
      { id: 'notifications', label: 'התראות', icon: '🔔' },
      { id: 'my-stats', label: 'סטטיסטיקה', icon: '📊' }
    ],
    action: { label: 'הזמנה', icon: '➕' }
  },
  warehouse: {
    tabs: [
      { id: 'inventory', label: 'מלאי', icon: '📋' },
      { id: 'incoming', label: 'קבלה', icon: '📥' },
      { id: 'tasks', label: 'משימות', icon: '✅' }
    ],
    action: { label: 'סריקה', icon: '📱' }
  },
  driver: {
    tabs: [
      { id: 'my-deliveries', label: 'משלוחים', icon: '🚚' },
      { id: 'my-inventory', label: 'מלאי', icon: '📦' },
      { id: 'my-zones', label: 'אזורים', icon: '🗺️' }
    ],
    action: { label: 'ניווט', icon: '🧭' }
  },
  customer_service: {
    tabs: [
      { id: 'chat', label: 'צ\'אט', icon: '💬' },
      { id: 'notifications', label: 'התראות', icon: '🔔' },
      { id: 'orders', label: 'הזמנות', icon: '📦' }
    ],
    action: { label: 'תיק קריאה', icon: '📞' }
  }
};

export function BottomNavigation({
  currentPage,
  onNavigate,
  userRole = 'user',
  onShowActionMenu,
  onOpenSidebar
}: BottomNavigationProps) {
  const { haptic } = useTelegramUI();
  const { currentBusinessId } = useAppServices();

  const config = roleNavigation[userRole];
  const { tabs, action } = config;

  const navStyles: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: zIndex.fixed,
    background: 'rgba(10, 14, 20, 0.95)',
    backdropFilter: 'blur(16px)',
    borderTop: `1px solid ${colors.border.primary}`,
    boxShadow: shadows.xl,
    padding: `${spacing.xs} ${spacing.sm}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: spacing.xs,
    minHeight: '64px',
    direction: 'rtl',
  };

  const actionButtonStyles: React.CSSProperties = {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: action?.disabled ? colors.interactive.disabled : colors.brand.primary,
    color: action?.disabled ? colors.text.secondary : colors.text.inverse,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    boxShadow: action?.disabled ? 'none' : shadows.glow,
    border: 'none',
    cursor: action?.disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
  };

  const handleActionClick = () => {
    if (action?.disabled) return;
    haptic();
    onShowActionMenu?.();
  };

  // Split tabs for RTL layout with action in center
  const leftTabs = tabs.slice(0, 1);
  const rightTabs = tabs.slice(1);

  return (
    <nav style={navStyles}>
      {/* Left tabs (in RTL, appears on right visually) */}
      {leftTabs.map((tab) => (
        <NavigationTab
          key={tab.id}
          {...tab}
          active={currentPage === tab.id}
          onClick={() => {
            haptic();
            onNavigate(tab.id);
          }}
        />
      ))}

      {/* Center action button */}
      {action && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.xs }}>
          <button
            onClick={handleActionClick}
            disabled={action.disabled}
            style={actionButtonStyles}
            aria-label={action.label}
          >
            {action.icon}
          </button>
          <span
            style={{
              fontSize: '10px',
              color: action.disabled ? colors.text.secondary : colors.brand.primary,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {action.label}
          </span>
        </div>
      )}

      {/* Right tabs (in RTL, appears on left visually) */}
      {rightTabs.map((tab) => (
        <NavigationTab
          key={tab.id}
          {...tab}
          active={currentPage === tab.id}
          onClick={() => {
            haptic();
            onNavigate(tab.id);
          }}
        />
      ))}
    </nav>
  );
}
