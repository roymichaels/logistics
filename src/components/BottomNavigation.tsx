import React from 'react';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { useI18n } from '../lib/i18n';
import { useAppServices } from '../context/AppServicesContext';
import { colors, spacing, navigation } from '../styles/design-system';
import { useAuth } from '../context/AuthContext';

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
  const { translations } = useI18n();
  const authCtx = useAuth();
  const authRole = (authCtx?.user as any)?.role || null;
  void authRole;

  /**
   * 🔐 UNIFIED BOTTOM NAVIGATION
   * Visual RTL: תפריט | משימות | התראות | פעולות | צ'אט
   */
  const roleNavigation: Record<RoleKey, RoleNavigationConfig> = {
    // ⛔ USER: Unassigned - View Only
    user: {
      tabs: [
        { id: 'chat', label: translations.chat, icon: '💬' },
        { id: 'notifications', label: translations.notifications, icon: '🔔' },
        { id: 'tasks', label: translations.tasks, icon: '✅' }
      ],
      action: {
        label: translations.phrases.actions,
        icon: '⚡'
      }
    },

    // 🏗️ INFRASTRUCTURE_OWNER: Platform administrator
    infrastructure_owner: {
      tabs: [
        { id: 'chat', label: translations.chat, icon: '💬' },
        { id: 'notifications', label: translations.notifications, icon: '🔔' },
        { id: 'tasks', label: translations.tasks, icon: '✅' }
      ],
      action: {
        label: translations.phrases.actions,
        icon: '⚡'
      }
    },

    // 👑 BUSINESS_OWNER: Full business access
    business_owner: {
      tabs: [
        { id: 'chat', label: translations.chat, icon: '💬' },
        { id: 'notifications', label: translations.notifications, icon: '🔔' },
        { id: 'tasks', label: translations.tasks, icon: '✅' }
      ],
      action: {
        label: translations.phrases.actions,
        icon: '⚡'
      }
    },

    // 📊 MANAGER: Full management
    manager: {
      tabs: [
        { id: 'chat', label: translations.chat, icon: '💬' },
        { id: 'notifications', label: translations.notifications, icon: '🔔' },
        { id: 'tasks', label: translations.tasks, icon: '✅' }
      ],
      action: {
        label: translations.phrases.actions,
        icon: '⚡'
      }
    },

    // 🚦 DISPATCHER: Route planning and driver assignment
    dispatcher: {
      tabs: [
        { id: 'chat', label: translations.chat, icon: '💬' },
        { id: 'notifications', label: translations.notifications, icon: '🔔' },
        { id: 'tasks', label: translations.tasks, icon: '✅' }
      ],
      action: {
        label: translations.phrases.actions,
        icon: '⚡'
      }
    },

    // 🛒 SALES: Order focused
    sales: {
      tabs: [
        { id: 'chat', label: translations.chat, icon: '💬' },
        { id: 'notifications', label: translations.notifications, icon: '🔔' },
        { id: 'tasks', label: translations.tasks, icon: '✅' }
      ],
      action: {
        label: translations.phrases.actions,
        icon: '⚡'
      }
    },

    // 🏷️ WAREHOUSE: Inventory focused
    warehouse: {
      tabs: [
        { id: 'chat', label: translations.chat, icon: '💬' },
        { id: 'notifications', label: translations.notifications, icon: '🔔' },
        { id: 'tasks', label: translations.tasks, icon: '✅' }
      ],
      action: {
        label: translations.phrases.actions,
        icon: '⚡'
      }
    },

    // 🚚 DRIVER: Delivery focused
    driver: {
      tabs: [
        { id: 'chat', label: translations.chat, icon: '💬' },
        { id: 'notifications', label: translations.notifications, icon: '🔔' },
        { id: 'tasks', label: translations.tasks, icon: '✅' }
      ],
      action: {
        label: translations.phrases.actions,
        icon: '⚡'
      }
    },

    // 📞 CUSTOMER_SERVICE: Support and order tracking
    customer_service: {
      tabs: [
        { id: 'chat', label: translations.chat, icon: '💬' },
        { id: 'notifications', label: translations.notifications, icon: '🔔' },
        { id: 'tasks', label: translations.tasks, icon: '✅' }
      ],
      action: {
        label: translations.phrases.actions,
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
        gap: '4px',
        padding: '8px 4px',
        border: 'none',
        backgroundColor: 'transparent',
        cursor: action?.disabled ? 'not-allowed' : 'pointer',
        fontSize: '11px',
        fontWeight: '600',
        position: 'relative',
        transition: 'all 200ms ease-in-out'
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: action?.disabled
            ? colors.text.tertiary
            : colors.brand.primary,
          color: action?.disabled ? colors.text.secondary : colors.white,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          boxShadow: action?.disabled ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.15)',
          transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          transform: 'scale(1)',
        }}
        onMouseEnter={(e) => {
          if (!action?.disabled) {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(29, 161, 242, 0.3)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = action?.disabled ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.15)';
        }}
        onMouseDown={(e) => {
          if (!action?.disabled) {
            e.currentTarget.style.transform = 'scale(0.95)';
          }
        }}
        onMouseUp={(e) => {
          if (!action?.disabled) {
            e.currentTarget.style.transform = 'scale(1.05)';
          }
        }}
      >
        {action?.icon}
      </div>
      <span style={{
        fontSize: '11px',
        color: action?.disabled ? colors.text.secondary : colors.brand.primary,
        fontWeight: '700',
        whiteSpace: 'nowrap',
        lineHeight: '1.3125'
      }}>
        {action?.label}
      </span>
    </button>
  );

  const navItems: React.ReactNode[] = [];

  // Calculate positions for proper centering in RTL
  const hasSidebarButton = userRole && userRole !== 'user' && onOpenSidebar;
  const totalTabs = tabs.length;

  // For RTL layout with action button in center and תפריט on far right:
  // Structure: [תפריט] [צ'אט] [ACTION] [התראות] [משימות]
  // Visual RTL: משימות | התראות | פעולות | צ'אט | תפריט
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
        gap: '4px',
        padding: '6px 4px',
        border: 'none',
        backgroundColor: 'transparent',
        color: currentPage === tab.id ? colors.brand.primary : colors.text.secondary,
        cursor: 'pointer',
        fontSize: '11px',
        fontWeight: currentPage === tab.id ? '700' : '400',
        position: 'relative',
        transition: 'all 200ms ease-in-out',
        transform: 'scale(1)'
      }}
    >
      <span style={{
        fontSize: '26px',
        transition: 'all 200ms ease-in-out'
      }}>
        {tab.icon}
      </span>
      <span>{tab.label}</span>
      {currentPage === tab.id && (
        <div style={{
          position: 'absolute',
          bottom: '0',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '40px',
          height: '4px',
          background: colors.brand.primary,
          borderRadius: '4px 4px 0 0'
        }} />
      )}
    </button>
  );

  // Add תפריט button first (on the far right in RTL layout)
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
          color: colors.text.secondary,
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: '600',
          position: 'relative',
          transition: 'all 0.2s ease'
        }}
      >
        <span style={{
          fontSize: '26px',
          transition: 'all 200ms ease-in-out'
        }}>
          ☰
        </span>
        <span>תפריט</span>
      </button>
    );
  }

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

  return (
    <>
      <style>{`
        .bottom-nav-container {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(21, 32, 43, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-top: 1px solid rgba(56, 68, 77, 0.6);
          box-shadow: none;
          display: flex;
          padding: 0;
          z-index: 1000;
          direction: rtl;
          height: 53px;
          align-items: center;
          transition: border-color 200ms ease-in-out;
        }

        .bottom-nav-container:hover {
          border-top-color: rgba(56, 68, 77, 0.8);
        }

        @media (min-width: 768px) {
          .bottom-nav-container {
            bottom: 0 !important;
            top: 0 !important;
            left: 0 !important;
            right: auto !important;
            width: 80px !important;
            height: 100vh !important;
            flex-direction: column !important;
            padding: 16px 8px !important;
            border-top: none !important;
            border-right: 1px solid rgba(56, 68, 77, 0.6) !important;
            justify-content: flex-start !important;
            gap: 8px !important;
          }

          .bottom-nav-container:hover {
            border-right-color: rgba(56, 68, 77, 0.8) !important;
          }

          .bottom-nav-container button {
            width: 100% !important;
            flex: 0 0 auto !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .bottom-nav-container,
          .bottom-nav-container button {
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>
      <div
        className="bottom-nav-container"
        data-business-id={currentBusinessId ?? undefined}
      >
        {navItems}
      </div>
    </>
  );
}
