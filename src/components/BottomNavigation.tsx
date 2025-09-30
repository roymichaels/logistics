import React from 'react';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { hebrew } from '../lib/hebrew';
import { FloatingCreateButton } from './FloatingCreateButton';

type RoleKey =
  | 'user'
  | 'owner'
  | 'manager'
  | 'dispatcher'
  | 'driver'
  | 'warehouse'
  | 'sales'
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
  businessId?: string;
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

  const demoRole = localStorage.getItem('demo_role');
  const effectiveRole: RoleKey | null = (demoRole || userRole || null) as RoleKey | null;

  const roleNavigation: Record<RoleKey, RoleNavigationConfig> = {
    user: {
      tabs: [
        { id: 'dashboard', label: hebrew.dashboard, icon: '📊' },
        { id: 'demo', label: 'דמו', icon: '🎮' },
        { id: 'settings', label: hebrew.settings, icon: '⚙️' }
      ]
    },
    owner: {
      tabs: [
        { id: 'dashboard', label: hebrew.dashboard, icon: '📊' },
        { id: 'stats', label: hebrew.stats, icon: '📈' },
        { id: 'partners', label: hebrew.partners, icon: '🤝' },
        { id: 'orders', label: hebrew.orders, icon: '🧾' },
        { id: 'manager-inventory', label: hebrew.manager_inventory, icon: '🏬' },
        { id: 'settings', label: hebrew.settings, icon: '⚙️' }
      ],
      action: {
        label: 'פקודה חדשה',
        icon: '✳️'
      }
    },
    manager: {
      tabs: [
        { id: 'dashboard', label: hebrew.dashboard, icon: '📊' },
        { id: 'stats', label: hebrew.stats, icon: '📈' },
        { id: 'partners', label: hebrew.partners, icon: '🤝' },
        { id: 'orders', label: hebrew.orders, icon: '🧾' },
        { id: 'manager-inventory', label: hebrew.manager_inventory, icon: '🏬' },
        { id: 'settings', label: hebrew.settings, icon: '⚙️' }
      ],
      action: {
        label: 'פקודה חדשה',
        icon: '✳️'
      }
    },
    dispatcher: {
      tabs: [
        { id: 'dashboard', label: hebrew.dashboard, icon: '📊' },
        { id: 'dispatch-board', label: hebrew.dispatch_board, icon: '🗺️' },
        { id: 'orders', label: hebrew.orders, icon: '📋' },
        { id: 'tasks', label: hebrew.tasks, icon: '✅' },
        { id: 'chat', label: "צ'אט", icon: '💬' },
        { id: 'settings', label: hebrew.settings, icon: '⚙️' }
      ]
    },
    driver: {
      tabs: [
        { id: 'my-deliveries', label: hebrew.my_deliveries, icon: '🚚' },
        { id: 'my-inventory', label: hebrew.my_inventory, icon: '📦' },
        { id: 'my-zones', label: hebrew.my_zones, icon: '🗺️' },
        { id: 'driver-status', label: hebrew.driver_status, icon: '📍' },
        { id: 'settings', label: hebrew.settings, icon: '⚙️' }
      ],
      action: {
        label: 'בקרוב',
        icon: '🚚',
        disabled: true
      }
    },
    warehouse: {
      tabs: [
        { id: 'warehouse-dashboard', label: hebrew.warehouse_dashboard, icon: '🏭' },
        { id: 'inventory', label: hebrew.inventory, icon: '📦' },
        { id: 'incoming', label: hebrew.incoming, icon: '🚚' },
        { id: 'restock-requests', label: hebrew.restock_requests, icon: '🔄' },
        { id: 'logs', label: hebrew.logs, icon: '📝' },
        { id: 'settings', label: hebrew.settings, icon: '⚙️' }
      ],
      action: {
        label: 'פעולת מלאי',
        icon: '🛠️'
      }
    },
    sales: {
      tabs: [
        { id: 'orders', label: hebrew.orders, icon: '🧾' },
        { id: 'products', label: hebrew.products, icon: '🛒' },
        { id: 'my-stats', label: hebrew.my_stats, icon: '📈' },
        { id: 'chat', label: "צ'אט", icon: '💬' },
        { id: 'settings', label: hebrew.settings, icon: '⚙️' }
      ],
      action: {
        label: 'הזמנה חדשה',
        icon: '🆕'
      }
    },
    customer_service: {
      tabs: [
        { id: 'dashboard', label: hebrew.dashboard, icon: '📊' },
        { id: 'orders', label: hebrew.orders, icon: '📋' },
        { id: 'customers', label: hebrew.customers, icon: '👥' },
        { id: 'chat', label: "צ'אט", icon: '💬' },
        { id: 'settings', label: hebrew.settings, icon: '⚙️' }
      ]
    }
  };

  const roleConfig = effectiveRole ? roleNavigation[effectiveRole] : roleNavigation.user;
  const tabs = roleConfig.tabs;
  const action = roleConfig.action;

  const renderActionSlot = () => (
    <div
      key="action-slot"
      style={{
        flex: '0 0 80px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        pointerEvents: 'none'
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: action?.disabled ? `${theme.hint_color}30` : theme.button_color,
          color: action?.disabled ? theme.hint_color : theme.button_text_color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          marginBottom: '4px',
          boxShadow: action?.disabled ? 'none' : '0 4px 12px rgba(0,0,0,0.2)'
        }}
      >
        {action?.icon}
      </div>
      <span style={{ fontSize: '11px', color: theme.hint_color }}>{action?.label}</span>
    </div>
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
          gap: '4px',
          padding: '8px 4px',
          border: 'none',
          backgroundColor: 'transparent',
          color: currentPage === tab.id ? theme.button_color : theme.hint_color,
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: currentPage === tab.id ? '600' : '400'
        }}
      >
        <span style={{ fontSize: '20px' }}>{tab.icon}</span>
        <span>{tab.label}</span>
      </button>
    );
  });

  if (action && actionIndex !== null && actionIndex >= tabs.length) {
    navItems.push(renderActionSlot());
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: theme.secondary_bg_color || '#f1f1f1',
          borderTop: `1px solid ${theme.hint_color}20`,
          display: 'flex',
          padding: '8px 0',
          zIndex: 1000,
          direction: 'rtl'
        }}
      >
        {navItems}
      </div>

      {effectiveRole && action && (
        <FloatingCreateButton
          userRole={effectiveRole}
          businessId={businessId}
          actionLabel={action.label}
          actionIcon={action.icon}
          disabled={action.disabled}
          onCreateOrder={() => onShowCreateOrder?.()}
          onCreateTask={() => onShowCreateTask?.()}
          onScanBarcode={() => onShowScanBarcode?.()}
          onContactCustomer={() => onShowContactCustomer?.()}
          onCheckInventory={() => onShowCheckInventory?.()}
          onCreateRoute={() => onShowCreateRoute?.()}
          onCreateUser={() => onShowCreateUser?.()}
          onCreateProduct={() => onShowCreateProduct?.()}
          onNavigate={onNavigate}
        />
      )}
    </>
  );
}
