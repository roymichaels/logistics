import React from 'react';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { hebrew } from '../lib/hebrew';

/**
 * 🧠 ROY MICHAELS MILITARIZED NAVIGATION
 *
 * Each role = isolated sandbox. Zero overlap. Full control.
 * No ambiguity. No cross-contamination. Hardened by design.
 */

type RoleKey =
  | 'user'           // Unassigned actor - view only, zero power
  | 'owner'          // Platform owner - sees ALL businesses
  | 'manager'        // Business manager - full command over their business
  | 'sales'          // Sales agent - fast order creation, own stats
  | 'warehouse'      // Warehouse operator - inventory only, no sales
  | 'driver';        // Driver - deliveries, personal inventory, zones only

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
  businessId?: string;
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
  businessId,
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

  /**
   * 🔐 MILITARIZED ROLE-BASED SANDBOXES
   * Each role has EXACTLY what they need. Nothing more.
   */
  const roleNavigation: Record<RoleKey, RoleNavigationConfig> = {
    // ⛔ USER: Unassigned - View Only, Zero Power
    user: {
      tabs: [
        { id: 'my-role', label: 'תפקידי', icon: '👤' }
      ]
      // NO ACTION BUTTON. No power. Contact manager.
    },

    // 👑 OWNER: Essential tabs + Chat
    owner: {
      tabs: [
        { id: 'dashboard', label: hebrew.dashboard, icon: '🏠' },
        { id: 'chat', label: 'צ\'אט', icon: '💬' },
        { id: 'settings', label: hebrew.settings, icon: '⚙️' }
      ],
      action: {
        label: 'פעולות מהירות',
        icon: '⚡'
      }
    },

    // 👑 MANAGER: Essential tabs + Chat
    manager: {
      tabs: [
        { id: 'dashboard', label: hebrew.dashboard, icon: '🏠' },
        { id: 'chat', label: 'צ\'אט', icon: '💬' },
        { id: 'settings', label: hebrew.settings, icon: '⚙️' }
      ],
      action: {
        label: 'פעולות מהירות',
        icon: '⚡'
      }
    },

    // 🛒 SALES: Orders + Chat + Stats
    sales: {
      tabs: [
        { id: 'orders', label: hebrew.orders, icon: '🛒' },
        { id: 'chat', label: 'צ\'אט', icon: '💬' },
        { id: 'my-stats', label: hebrew.my_stats, icon: '📈' }
      ],
      action: {
        label: 'פעולות מהירות',
        icon: '⚡'
      }
    },

    // 🏷️ WAREHOUSE: Inventory + Chat + Logs
    warehouse: {
      tabs: [
        { id: 'inventory', label: hebrew.inventory, icon: '📦' },
        { id: 'chat', label: 'צ\'אט', icon: '💬' },
        { id: 'logs', label: hebrew.logs, icon: '📊' }
      ],
      action: {
        label: 'פעולות מהירות',
        icon: '⚡'
      }
    },

    // 🚚 DRIVER: Deliveries + Chat + Status
    driver: {
      tabs: [
        { id: 'my-deliveries', label: hebrew.my_deliveries, icon: '🚚' },
        { id: 'chat', label: 'צ\'אט', icon: '💬' },
        { id: 'driver-status', label: hebrew.driver_status, icon: '🟢' }
      ],
      action: {
        label: 'פעולות מהירות',
        icon: '⚡'
      }
    }
  };

  const roleConfig = userRole ? roleNavigation[userRole] : roleNavigation.user;
  const tabs = roleConfig.tabs;
  const action = roleConfig.action;

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
        flex: '0 0 80px',
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
            ? `rgba(100, 100, 120, 0.3)`
            : 'linear-gradient(135deg, #9c6dff 0%, #7c3aed 100%)',
          color: action?.disabled ? theme.hint_color : '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          boxShadow: action?.disabled
            ? 'none'
            : '0 8px 24px rgba(156, 109, 255, 0.5), 0 0 40px rgba(156, 109, 255, 0.3)',
          border: '3px solid rgba(25, 0, 80, 0.95)',
          transform: action?.disabled ? 'scale(1)' : 'scale(1.1)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        onMouseEnter={(e) => {
          if (!action?.disabled) {
            e.currentTarget.style.transform = 'scale(1.15)';
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(156, 109, 255, 0.6), 0 0 50px rgba(156, 109, 255, 0.4)';
          }
        }}
        onMouseLeave={(e) => {
          if (!action?.disabled) {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(156, 109, 255, 0.5), 0 0 40px rgba(156, 109, 255, 0.3)';
          }
        }}
      >
        {action?.icon}
      </div>
      <span style={{
        fontSize: '10px',
        color: action?.disabled ? theme.hint_color : '#bfa9ff',
        marginTop: '6px',
        fontWeight: '600'
      }}>
        {action?.label}
      </span>
    </button>
  );

  const navItems: React.ReactNode[] = [];
  const actionIndex = action ? Math.floor(tabs.length / 2) : null;

  tabs.forEach((tab, index) => {
    if (action && actionIndex !== null && index === actionIndex) {
      navItems.push(renderActionSlot());
    }

    navItems.push(
      <button
        key={tab.id}
        onClick={() => {
          haptic();
          onNavigate(tab.id);
        }}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 4px',
          border: 'none',
          backgroundColor: 'transparent',
          color: currentPage === tab.id ? '#9c6dff' : 'rgba(191, 169, 255, 0.6)',
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
          filter: currentPage === tab.id ? 'drop-shadow(0 0 8px rgba(156, 109, 255, 0.8))' : 'none',
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
            background: 'linear-gradient(90deg, transparent, #9c6dff, transparent)',
            borderRadius: '2px',
            boxShadow: '0 0 8px rgba(156, 109, 255, 0.6)'
          }} />
        )}
      </button>
    );
  });

  if (action && actionIndex !== null && actionIndex >= tabs.length) {
    navItems.push(renderActionSlot());
  }

  // Add תפקידי button on the far right
  if (userRole && userRole !== 'user' && onOpenSidebar) {
    navItems.push(
      <button
        key="sidebar-menu"
        onClick={() => {
          haptic();
          onOpenSidebar();
        }}
        style={{
          flex: '0 0 70px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 4px',
          border: 'none',
          backgroundColor: 'transparent',
          color: 'rgba(191, 169, 255, 0.9)',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: '600',
          position: 'relative',
          transition: 'all 0.2s ease'
        }}
      >
        <span style={{
          fontSize: '22px',
          filter: 'drop-shadow(0 0 6px rgba(156, 109, 255, 0.6))',
          transition: 'all 0.2s ease'
        }}>
          📋
        </span>
        <span>תפקידי</span>
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
          background: 'linear-gradient(180deg, rgba(25, 0, 80, 0.70) 0%, rgba(25, 0, 80, 0.95) 100%)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(156, 109, 255, 0.2)',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          padding: '12px 8px 8px 8px',
          zIndex: 1000,
          direction: 'rtl'
        }}
      >
        {navItems}
      </div>
    </>
  );
}
