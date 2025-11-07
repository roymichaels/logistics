import React from 'react';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { hebrew } from '../lib/i18n';
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
   * Visual RTL: תפריט | משימות | התראות | פעולות | צ'אט
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
        label: 'פעולות',
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
        label: 'פעולות',
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
        label: 'פעולות',
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
        label: 'פעולות',
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
        label: 'פעולות',
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
        label: 'פעולות',
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
        label: 'פעולות',
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
        label: 'פעולות',
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
        label: 'פעולות',
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
        flex: 1,
        minWidth: '0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '8px 4px',
        border: 'none',
        backgroundColor: 'transparent',
        cursor: action?.disabled ? 'not-allowed' : 'pointer',
        fontSize: '11px',
        fontWeight: '600',
        position: 'relative',
        transition: 'all 0.2s ease'
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: action?.disabled
            ? TWITTER_COLORS.textTertiary
            : TWITTER_COLORS.gradientPrimary,
          color: action?.disabled ? TWITTER_COLORS.textSecondary : TWITTER_COLORS.buttonPrimaryText,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          boxShadow: action?.disabled ? 'none' : TWITTER_COLORS.shadow,
          transition: 'all 0.2s ease'
        }}
      >
        {action?.icon}
      </div>
      <span style={{
        fontSize: '10px',
        color: action?.disabled ? TWITTER_COLORS.textSecondary : TWITTER_COLORS.primary,
        fontWeight: '600',
        whiteSpace: 'nowrap'
      }}>
        {action?.label}
      </span>
    </button>
  );

  const navItems: React.ReactNode[] = [];

  // Calculate positions for proper centering in RTL
  const hasSidebarButton = userRole && userRole !== 'user' && onOpenSidebar;
  const totalTabs = tabs.length;

  // For RTL layout with action button in center:
  // Structure: [צ'אט] [ACTION] [התראות] [משימות] [תפריט]
  // Visual RTL: תפריט | משימות | התראות | פעולות | צ'אט
  // With 3 tabs total: צ'אט (0), התראות (1), משימות (2)
  // Split: 1 tab left of action (צ'אט), 2 tabs right of action (התראות, משימות)
  const leftSideTabs = 1; // tabs to the left of center button
  const rightSideTabs = totalTabs - leftSideTabs; // tabs to the right of center button

  // Render function for tab buttons
  const renderTab = (tab: TabDefinition) => (
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

  // Add left side tabs (shown on right in RTL)
  for (let i = 0; i < leftSideTabs; i++) {
    const tab = tabs[i];
    navItems.push(renderTab(tab));
  }

  // Add center action button
  if (action) {
    navItems.push(renderActionSlot());
  }

  // Add right side tabs (shown on left in RTL)
  for (let i = leftSideTabs; i < totalTabs; i++) {
    const tab = tabs[i];
    navItems.push(renderTab(tab));
  }

  // Add תפריט button on the far left (shown on far right in RTL layout)
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
          ☰
        </span>
        <span>תפריט</span>
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
          padding: '8px 8px 12px 8px',
          zIndex: 1000,
          direction: 'rtl',
          height: '72px',
          alignItems: 'center'
        }}
        data-business-id={currentBusinessId ?? undefined}
      >
        {navItems}
      </div>
    </>
  );
}
