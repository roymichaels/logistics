import React from 'react';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { hebrew, roleIcons } from '../lib/hebrew';
import { FloatingCreateButton } from './FloatingCreateButton';

interface BottomNavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  userRole?:
    | 'user'
    | 'owner'
    | 'manager'
    | 'dispatcher'
    | 'driver'
    | 'warehouse'
    | 'sales'
    | 'customer_service';
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

  // Check for demo role override
  const demoRole = localStorage.getItem('demo_role');
  const effectiveRole = demoRole || userRole;

  let tabs;
  
  if (effectiveRole === 'user') {
    tabs = [
      { id: 'dashboard', label: hebrew.dashboard, icon: '📊' },
      { id: 'demo', label: 'דמו', icon: '🎮' },
      { id: 'settings', label: hebrew.settings, icon: '⚙️' }
    ];
  } else if (effectiveRole === 'owner' || effectiveRole === 'manager') {
    tabs = [
      { id: 'dashboard', label: hebrew.dashboard, icon: '📊' },
      { id: 'stats', label: hebrew.stats, icon: '📈' },
      { id: 'partners', label: hebrew.partners, icon: '🤝' },
      { id: 'orders', label: hebrew.orders, icon: '🧾' },
      { id: 'settings', label: hebrew.settings, icon: '⚙️' }
    ];
  } else if (effectiveRole === 'dispatcher') {
    tabs = [
      { id: 'dashboard', label: hebrew.dashboard, icon: '📊' },
      { id: 'dispatch-board', label: hebrew.dispatch_board, icon: '🗺️' },
      { id: 'orders', label: hebrew.orders, icon: '📋' },
      { id: 'tasks', label: hebrew.tasks, icon: '✅' },
      { id: 'chat', label: 'צ\'אט', icon: '💬' },
      { id: 'settings', label: hebrew.settings, icon: '⚙️' }
    ];
  } else if (effectiveRole === 'driver') {
    tabs = [
      { id: 'my-deliveries', label: hebrew.my_deliveries, icon: '🚚' },
      { id: 'my-inventory', label: hebrew.my_inventory, icon: '📦' },
      { id: 'my-zones', label: hebrew.my_zones, icon: '🗺️' },
      { id: 'driver-status', label: hebrew.driver_status, icon: '📍' },
      { id: 'settings', label: hebrew.settings, icon: '⚙️' }
    ];
  } else if (effectiveRole === 'warehouse') {
    tabs = [
      { id: 'inventory', label: hebrew.inventory, icon: '📦' },
      { id: 'incoming', label: hebrew.incoming, icon: '🚚' },
      { id: 'restock-requests', label: hebrew.restock_requests, icon: '🔄' },
      { id: 'logs', label: hebrew.logs, icon: '📝' },
      { id: 'settings', label: hebrew.settings, icon: '⚙️' }
    ];
  } else if (effectiveRole === 'sales') {
    tabs = [
      { id: 'orders', label: hebrew.orders, icon: '🧾' },
      { id: 'products', label: hebrew.products, icon: '🛒' },
      { id: 'my-stats', label: hebrew.my_stats, icon: '📈' },
      { id: 'chat', label: 'צ\'אט', icon: '💬' },
      { id: 'settings', label: hebrew.settings, icon: '⚙️' }
    ];
  } else { // customer_service
    tabs = [
      { id: 'dashboard', label: hebrew.dashboard, icon: '📊' },
      { id: 'orders', label: hebrew.orders, icon: '📋' },
      { id: 'customers', label: hebrew.customers, icon: '👥' },
      { id: 'chat', label: 'צ\'אט', icon: '💬' },
      { id: 'settings', label: hebrew.settings, icon: '⚙️' }
    ];
  }

  return (
    <>
      {/* Bottom Navigation Bar */}
      <div style={{
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
      }}>
        {tabs.map((tab) => (
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
        ))}
      </div>

      {/* Floating Create Button - Only show for roles that can create content */}
      {effectiveRole && effectiveRole !== 'user' && (
        <FloatingCreateButton
          userRole={effectiveRole}
          businessId={businessId}
          onCreateOrder={() => onShowCreateOrder?.()}
          onCreateTask={() => onShowCreateTask?.()}
          onScanBarcode={() => onShowScanBarcode?.()}
          onContactCustomer={() => onShowContactCustomer?.()}
          onCheckInventory={() => onShowCheckInventory?.()}
          onCreateRoute={() => onShowCreateRoute?.()}
          onCreateUser={() => onShowCreateUser?.()}
          onCreateProduct={() => onShowCreateProduct?.()}
        />
      )}
    </>
  );
}