import React from 'react';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { hebrew } from '../lib/hebrew';
import { useAppServices } from '../context/AppServicesContext';
import { TWITTER_COLORS } from '../styles/twitterTheme';

/**
 * 🧠 ROY MICHAELS MILITARIZED NAVIGATION
 *
 * Each role = isolated sandbox. Zero overlap. Full control.
 * No ambiguity. No cross-contamination. Hardened by design.
 */

type RoleKey =
  | 'user'                    // Unassigned actor - view only, zero power
  | 'infrastructure_owner'    // Infrastructure owner - full platform access
  | 'business_owner'          // Business owner - full business access
  | 'manager'                 // Business manager - full command over their business
  | 'dispatcher'              // Dispatcher - route planning, driver assignment
  | 'sales'                   // Sales agent - fast order creation, own stats
  | 'warehouse'               // Warehouse operator - inventory only, no sales
  | 'driver'                  // Driver - deliveries, personal inventory, zones only
  | 'customer_service';       // Customer service - support, order tracking

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
  onShowCreateOrder?: () => void;
  onShowCreateTask?: () => void;
  onShowScanBarcode?: () => void;
  onShowContactCustomer?: () => void;
  onShowCheckInventory?: () => void;
  onShowCreateRoute?: () => void;
  onShowCreateUser?: () => void;
  onShowCreateProduct?: () => void;
}

export function BottomNavigation({
  currentPage,
  onNavigate,
  userRole,
  onShowActionMenu,
  onOpenSidebar,
  onShowCreateOrder,
  onShowCreateTask,
  onShowScanBarcode,
  onShowContactCustomer,
  onShowCheckInventory,
  onShowCreateRoute,
  onShowCreateUser,
  onShowCreateProduct
}: BottomNavigationProps) {
  const { theme, haptic } = useTelegramUI();
  const { currentBusinessId } = useAppServices();

  /**
   * 🔐 UNIFIED BOTTOM NAVIGATION
   * תפקידי | צ'אט | פעולות מהירות | התראות | משימות
   * All role-specific pages accessible via תפקידי sidebar
   */
  const roleNavigation: Record<RoleKey, RoleNavigationConfig> = {
    // ⛔ USER: Unassigned - View Only
    user: {
      tabs: [
        { id: 'chat', label: 'צ\'אט', icon: '💬' },
        { id: 'notifications', label: 'התראות', icon: '🔔' },
        { id: 'tasks', label: 'משימות', icon: '✅' }
      ],
      action: {
        label: 'פעולות מהירות',
        icon: '⚡'
      }
    },

    // 🏗️ INFRASTRUCTURE_OWNER: Platform administrator
    infrastructure_owner: {
      tabs: [
        { id: 'chat', label: 'צ\'אט', icon: '💬' },
        { id: 'notifications', label: 'התראות', icon: '🔔' },
        { id: 'tasks', label: 'משימות', icon: '✅' }
      ],
      action: {
        label: 'פעולות מהירות',
        icon: '⚡'
      }
    },

    // 👑 BUSINESS_OWNER: Full business access
    business_owner: {
      tabs: [
        { id: 'chat', label: 'צ\'אט', icon: '💬' },
        { id: 'notifications', label: 'התראות', icon: '🔔' },
        { id: 'tasks', label: 'משימות', icon: '✅' }
      ],
      action: {
        label: 'פעולות מהירות',
        icon: '⚡'
      }
    },

    // 📊 MANAGER: Full management
    manager: {
      tabs: [
        { id: 'chat', label: 'צ\'אט', icon: '💬' },
        { id: 'notifications', label: 'התראות', icon: '🔔' },
        { id: 'tasks', label: 'משימות', icon: '✅' }
      ],
      action: {
        label: 'פעולות מהירות',
        icon: '⚡'
      }
    },

    // 🚦 DISPATCHER: Route planning and driver assignment
    dispatcher: {
      tabs: [
        { id: 'chat', label: 'צ\'אט', icon: '💬' },
        { id: 'notifications', label: 'התראות', icon: '🔔' },
        { id: 'tasks', label: 'משימות', icon: '✅' }
      ],
      action: {
        label: 'פעולות מהירות',
        icon: '⚡'
      }
    },

    // 🛒 SALES: Order focused
    sales: {
      tabs: [
        { id: 'chat', label: 'צ\'אט', icon: '💬' },
        { id: 'notifications', label: 'התראות', icon: '🔔' },
        { id: 'tasks', label: 'משימות', icon: '✅' }
      ],
      action: {
        label: 'פעולות מהירות',
        icon: '⚡'
      }
    },

    // 🏷️ WAREHOUSE: Inventory focused
    warehouse: {
      tabs: [
        { id: 'chat', label: 'צ\'אט', icon: '💬' },
        { id: 'notifications', label: 'התראות', icon: '🔔' },
        { id: 'tasks', label: 'משימות', icon: '✅' }
      ],
      action: {
        label: 'פעולות מהירות',
        icon: '⚡'
      }
    },

    // 🚚 DRIVER: Delivery focused
    driver: {
      tabs: [
        { id: 'chat', label: 'צ\'אט', icon: '💬' },
        { id: 'notifications', label: 'התראות', icon: '🔔' },
        { id: 'tasks', label: 'משימות', icon: '✅' }
      ],
      action: {
        label: 'פעולות מהירות',
        icon: '⚡'
      }
    },

    // 📞 CUSTOMER_SERVICE: Support and order tracking
    customer_service: {
      tabs: [
        { id: 'chat', label: 'צ\'אט', icon: '💬' },
        { id: 'notifications', label: 'התראות', icon: '🔔' },
        { id: 'tasks', label: 'משימות', icon: '✅' }
      ],
      action: {
        label: 'פעולות מהירות',
        icon: '⚡'
      }
    }
  };

  const roleConfig = userRole && roleNavigation[userRole] ? roleNavigation[userRole] : roleNavigation.user;
  const tabs = roleConfig?.tabs || [];
  const action = roleConfig?.action;

  const handleActionClick = () => {
    if (action?.disabled) return;
    haptic();
    onShowActionMenu?.();
  };

  const renderActionSlot = () => (
    <button
      key="action-slot"
      onClick={handleActionClick}
      disabled={action?.disabled}
      style={{
        flex: '0 0 90px',
        minWidth: '90px',
        maxWidth: '90px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        background: 'transparent',
        cursor: action?.disabled ? 'not-allowed' : 'pointer',
        padding: '0',
        position: 'relative',
        marginTop: '-24px'
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: action?.disabled
            ? TWITTER_COLORS.textTertiary
            : TWITTER_COLORS.gradientPrimary,
          color: action?.disabled ? TWITTER_COLORS.textSecondary : TWITTER_COLORS.white,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          boxShadow: action?.disabled
            ? 'none'
            : TWITTER_COLORS.glow,
          border: `3px solid ${TWITTER_COLORS.background}`,
          transform: action?.disabled ? 'scale(1)' : 'scale(1.1)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        onMouseEnter={(e) => {
          if (!action?.disabled) {
            e.currentTarget.style.transform = 'scale(1.15)';
            e.currentTarget.style.boxShadow = TWITTER_COLORS.glowLarge;
          }
        }}
        onMouseLeave={(e) => {
          if (!action?.disabled) {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = TWITTER_COLORS.glow;
          }
        }}
      >
        {action?.icon}
      </div>
      <span style={{
        fontSize: '10px',
        color: action?.disabled ? TWITTER_COLORS.textSecondary : TWITTER_COLORS.primary,
        marginTop: '6px',
        fontWeight: '600'
      }}>
        {action?.label}
      </span>
    </button>
  );

  const navItems: React.ReactNode[] = [];

  // Calculate positions for proper centering in RTL
  const hasSidebarButton = userRole && userRole !== 'user' && onOpenSidebar;
  const totalTabs = tabs.length;

  // In RTL: sidebar (right) | tabs | ACTION (center) | tabs | empty space (left)
  // We need to balance tabs on both sides of the center action button
  const leftSideTabs = Math.floor(totalTabs / 2); // tabs to the left of center button
  const rightSideTabs = totalTabs - leftSideTabs; // tabs to the right of center button

  // Add תפקידי button on the far right (first in RTL layout)
  if (hasSidebarButton) {
    navItems.push(
      <button
        key="sidebar-menu"
        onClick={() => {
          haptic();
          onOpenSidebar();
        }}
        style={{
          flex: '1',
          minWidth: '0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 4px',
          border: 'none',
          backgroundColor: 'transparent',
          color: TWITTER_COLORS.textSecondary,
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: '600',
          position: 'relative',
          transition: 'all 0.2s ease'
        }}
      >
        <span style={{
          fontSize: '22px',
          filter: `drop-shadow(0 0 6px ${TWITTER_COLORS.accentGlow})`,
          transition: 'all 0.2s ease'
        }}>
          📋
        </span>
        <span>תפקידי</span>
      </button>
    );
  }

  // Add right side tabs (before center button in RTL)
  for (let i = 0; i < rightSideTabs; i++) {
    const tab = tabs[i];
    navItems.push(
      <button
        key={tab.id}
        onClick={() => {
          haptic();
          onNavigate(tab.id);
        }}
        style={{
          flex: 1,
          minWidth: '0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 4px',
          border: 'none',
          backgroundColor: 'transparent',
          color: currentPage === tab.id ? TWITTER_COLORS.primary : TWITTER_COLORS.textSecondary,
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: currentPage === tab.id ? '600' : '500',
          position: 'relative',
          transition: 'all 0.2s ease',
          transform: currentPage === tab.id ? 'scale(1.05)' : 'scale(1)'
        }}
      >
        <span style={{
          fontSize: currentPage === tab.id ? '24px' : '22px',
          filter: currentPage === tab.id ? `drop-shadow(0 0 8px ${TWITTER_COLORS.accentGlow})` : 'none',
          transition: 'all 0.2s ease'
        }}>
          {tab.icon}
        </span>
        <span>{tab.label}</span>
        {currentPage === tab.id && (
          <div style={{
            position: 'absolute',
            bottom: '4px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '32px',
            height: '3px',
            background: `linear-gradient(90deg, transparent, ${TWITTER_COLORS.primary}, transparent)`,
            borderRadius: '2px',
            boxShadow: `0 0 8px ${TWITTER_COLORS.accentGlow}`
          }} />
        )}
      </button>
    );
  }

  // Add center action button
  if (action) {
    navItems.push(renderActionSlot());
  }

  // Add left side tabs (after center button in RTL)
  for (let i = rightSideTabs; i < totalTabs; i++) {
    const tab = tabs[i];
    navItems.push(
      <button
        key={tab.id}
        onClick={() => {
          haptic();
          onNavigate(tab.id);
        }}
        style={{
          flex: 1,
          minWidth: '0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 4px',
          border: 'none',
          backgroundColor: 'transparent',
          color: currentPage === tab.id ? TWITTER_COLORS.primary : TWITTER_COLORS.textSecondary,
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: currentPage === tab.id ? '600' : '500',
          position: 'relative',
          transition: 'all 0.2s ease',
          transform: currentPage === tab.id ? 'scale(1.05)' : 'scale(1)'
        }}
      >
        <span style={{
          fontSize: currentPage === tab.id ? '24px' : '22px',
          filter: currentPage === tab.id ? `drop-shadow(0 0 8px ${TWITTER_COLORS.accentGlow})` : 'none',
          transition: 'all 0.2s ease'
        }}>
          {tab.icon}
        </span>
        <span>{tab.label}</span>
        {currentPage === tab.id && (
          <div style={{
            position: 'absolute',
            bottom: '4px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '32px',
            height: '3px',
            background: `linear-gradient(90deg, transparent, ${TWITTER_COLORS.primary}, transparent)`,
            borderRadius: '2px',
            boxShadow: `0 0 8px ${TWITTER_COLORS.accentGlow}`
          }} />
        )}
      </button>
    );
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: TWITTER_COLORS.navBackground,
          backdropFilter: TWITTER_COLORS.navBackdrop,
          borderTop: `1px solid ${TWITTER_COLORS.navBorder}`,
          boxShadow: TWITTER_COLORS.shadowLarge,
          display: 'flex',
          padding: '12px 8px 18px 8px',
          zIndex: 1000,
          direction: 'rtl'
        }}
        data-business-id={currentBusinessId ?? undefined}
      >
        {navItems}
      </div>
    </>
  );
}
