import React from 'react';

import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import { i18n } from '../lib/i18n';
import { useAuth } from '../context/AuthContext';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  page: string;
}

interface RightSidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: 'admin' | 'superadmin' | 'infrastructure_owner' | 'business_owner' | 'manager' | 'driver' | 'warehouse' | 'sales' | 'dispatcher' | 'customer_service' | null;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function RightSidebarMenu({ isOpen, onClose, userRole, currentPage, onNavigate }: RightSidebarMenuProps) {
  const authCtx = useAuth();
  const authRole = (authCtx?.user as any)?.role || null;
  void authRole;

  const getMenuItems = (): MenuItem[] => {
    if (!userRole) return [];

    const t = i18n.getTranslations();

    const menuMap: Record<string, MenuItem[]> = {
      admin: [
        { id: 'platform-dashboard', label: 'Platform Dashboard', icon: '🌐', page: 'platform-dashboard' },
        { id: 'infrastructures', label: 'Infrastructures', icon: '🏗️', page: 'infrastructures' },
        { id: 'businesses', label: 'All Businesses', icon: '🏢', page: 'admin-businesses' },
        { id: 'users', label: 'All Users', icon: '👥', page: 'user-management' },
        { id: 'analytics', label: 'Platform Analytics', icon: '📊', page: 'admin-analytics' },
        { id: 'orders', label: 'All Orders', icon: '📋', page: 'admin-orders' },
        { id: 'drivers', label: 'All Drivers', icon: '🚗', page: 'admin-drivers' },
        { id: 'catalog', label: 'Platform Catalog', icon: '📦', page: 'platform-catalog' },
        { id: 'permissions', label: 'Permissions', icon: '🔐', page: 'admin-permissions' },
        { id: 'settings', label: 'System Settings', icon: '⚙️', page: 'admin-settings' },
        { id: 'logs', label: 'Audit Logs', icon: '📜', page: 'audit-logs' },
        { id: 'feature-flags', label: 'Feature Flags', icon: '🚩', page: 'feature-flags' }
      ],
      superadmin: [
        { id: 'platform-dashboard', label: 'Platform Dashboard', icon: '🌐', page: 'platform-dashboard' },
        { id: 'infrastructures', label: 'Infrastructures', icon: '🏗️', page: 'infrastructures' },
        { id: 'businesses', label: 'All Businesses', icon: '🏢', page: 'admin-businesses' },
        { id: 'users', label: 'All Users', icon: '👥', page: 'user-management' },
        { id: 'analytics', label: 'Platform Analytics', icon: '📊', page: 'admin-analytics' },
        { id: 'orders', label: 'All Orders', icon: '📋', page: 'admin-orders' },
        { id: 'drivers', label: 'All Drivers', icon: '🚗', page: 'admin-drivers' },
        { id: 'catalog', label: 'Platform Catalog', icon: '📦', page: 'platform-catalog' },
        { id: 'permissions', label: 'Permissions', icon: '🔐', page: 'admin-permissions' },
        { id: 'settings', label: 'System Settings', icon: '⚙️', page: 'admin-settings' },
        { id: 'logs', label: 'Audit Logs', icon: '📜', page: 'audit-logs' },
        { id: 'feature-flags', label: 'Feature Flags', icon: '🚩', page: 'feature-flags' },
        { id: 'superadmins', label: 'Super Admins', icon: '👑', page: 'superadmins' }
      ],
      infrastructure_owner: [
        { id: 'dashboard', label: t.dashboard, icon: '🏠', page: 'dashboard' },
        { id: 'orders', label: t.orders, icon: '📦', page: 'orders' },
        { id: 'drivers', label: t.driversManagementPage.title, icon: '🚚', page: 'drivers-management' },
        { id: 'inventory', label: t.manager_inventory, icon: '📊', page: 'manager-inventory' },
        { id: 'products', label: t.products, icon: '🏷️', page: 'products' },
        { id: 'reports', label: t.reports, icon: '📈', page: 'reports' },
        { id: 'businesses', label: t.businesses, icon: '🏢', page: 'businesses' },
        { id: 'zones', label: t.zoneManagementPage.title, icon: '🗺️', page: 'zone-management' },
        { id: 'dispatch', label: t.dispatch_board, icon: '📋', page: 'dispatch-board' },
        { id: 'users', label: t.userManagement.title, icon: '👤', page: 'users' }
      ],
      business_owner: [
        { id: 'dashboard', label: t.dashboard, icon: '🏠', page: 'dashboard' },
        { id: 'orders', label: t.orders, icon: '📦', page: 'orders' },
        { id: 'drivers', label: t.driversManagementPage.title, icon: '🚚', page: 'drivers-management' },
        { id: 'inventory', label: t.manager_inventory, icon: '📊', page: 'manager-inventory' },
        { id: 'products', label: t.products, icon: '🏷️', page: 'products' },
        { id: 'reports', label: t.reports, icon: '📈', page: 'reports' },
        { id: 'businesses', label: t.businesses, icon: '🏢', page: 'businesses' },
        { id: 'zones', label: t.zoneManagementPage.title, icon: '🗺️', page: 'zone-management' },
        { id: 'dispatch', label: t.dispatch_board, icon: '📋', page: 'dispatch-board' },
        { id: 'users', label: t.userManagement.title, icon: '👤', page: 'users' }
      ],
      manager: [
        { id: 'dashboard', label: t.dashboard, icon: '🏠', page: 'dashboard' },
        { id: 'orders', label: t.orders, icon: '📦', page: 'orders' },
        { id: 'drivers', label: t.driversManagementPage.title, icon: '🚚', page: 'drivers-management' },
        { id: 'inventory', label: t.manager_inventory, icon: '📊', page: 'manager-inventory' },
        { id: 'products', label: t.products, icon: '🏷️', page: 'products' },
        { id: 'reports', label: t.reports, icon: '📈', page: 'reports' },
        { id: 'businesses', label: t.businesses, icon: '🏢', page: 'businesses' },
        { id: 'zones', label: t.zoneManagementPage.title, icon: '🗺️', page: 'zone-management' },
        { id: 'dispatch', label: t.dispatch_board, icon: '📋', page: 'dispatch-board' }
      ],
      sales: [
        { id: 'orders', label: t.orders, icon: '📦', page: 'orders' },
        { id: 'products', label: t.products, icon: '🏷️', page: 'products' },
        { id: 'my-stats', label: t.my_stats, icon: '📈', page: 'my-stats' },
        { id: 'customers', label: t.customers, icon: '👥', page: 'customers' }
      ],
      warehouse: [
        { id: 'inventory', label: t.inventory, icon: '📦', page: 'inventory' },
        { id: 'incoming', label: t.incoming, icon: '🚚', page: 'incoming' },
        { id: 'restock', label: t.restock_requests, icon: '🔄', page: 'restock-requests' },
        { id: 'logs', label: t.logs, icon: '📋', page: 'logs' }
      ],
      driver: [
        { id: 'deliveries', label: t.my_deliveries, icon: '🚚', page: 'my-deliveries' },
        { id: 'my-inventory', label: t.my_inventory, icon: '📦', page: 'my-inventory' },
        { id: 'zones', label: t.my_zones, icon: '🗺️', page: 'my-zones' },
        { id: 'status', label: t.driver_status, icon: '🟢', page: 'driver-status' }
      ],
      dispatcher: [
        { id: 'dispatch', label: t.dispatch_board, icon: '📋', page: 'dispatch-board' },
        { id: 'drivers', label: t.driver, icon: '🚚', page: 'driver-status' },
        { id: 'orders', label: t.orders, icon: '📦', page: 'orders' }
      ],
      customer_service: [
        { id: 'orders', label: t.orders, icon: '📦', page: 'orders' },
        { id: 'customers', label: t.customers, icon: '👥', page: 'customers' }
      ]
    };

    return menuMap[userRole] || [];
  };

  const handleItemClick = (page: string) => {

    onNavigate(page);
    onClose();
  };

  const getRoleLabel = (): string => {
    const t = i18n.getTranslations();
    switch (userRole) {
      case 'superadmin': return 'Super Administrator';
      case 'admin': return 'Platform Administrator';
      case 'infrastructure_owner': return t.roles.infrastructureOwner;
      case 'business_owner': return t.roles.businessOwner;
      case 'manager': return t.roles.manager;
      case 'sales': return t.roles.sales;
      case 'warehouse': return t.roles.warehouse;
      case 'driver': return t.roles.driver;
      case 'dispatcher': return t.roles.dispatcher;
      case 'customer_service': return t.roles.customerService;
      default: return t.user;
    }
  };

  if (!isOpen) return null;

  const menuItems = getMenuItems();

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          zIndex: 1050,
          animation: 'fadeIn 0.3s ease'
        }}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(320px, 80vw)',
          background: 'linear-gradient(180deg, rgba(25, 0, 80, 0.98) 0%, rgba(12, 2, 25, 0.98) 100%)',
          backdropFilter: 'blur(20px)',
          boxShadow: '-8px 0 40px rgba(0, 0, 0, 0.5)',
          zIndex: 1060,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.3s ease',
          direction: 'rtl',
          borderLeft: `1px solid ${ROYAL_COLORS.cardBorder}`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '24px 20px',
          borderBottom: `1px solid ${ROYAL_COLORS.cardBorder}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: '700',
              color: ROYAL_COLORS.text
            }}>
              {i18n.getTranslations().header.menu}
            </h2>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '13px',
              color: ROYAL_COLORS.muted
            }}>
              {getRoleLabel()}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.1)',
              color: ROYAL_COLORS.text,
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            ✕
          </button>
        </div>

        {/* Menu Items */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 8px'
        }}>
          {menuItems.map((item) => {
            const isActive = currentPage === item.page;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.page)}
                style={{
                  width: '100%',
                  padding: '16px',
                  marginBottom: '8px',
                  borderRadius: '12px',
                  border: 'none',
                  background: isActive
                    ? 'linear-gradient(135deg, #1D9BF0 0%, #1A8CD8 100%)'
                    : 'transparent',
                  color: ROYAL_COLORS.text,
                  fontSize: '15px',
                  fontWeight: isActive ? '600' : '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textAlign: 'right',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 4px 12px rgba(29, 155, 240, 0.3)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(29, 155, 240, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: '22px' }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {isActive && (
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    boxShadow: '0 0 8px rgba(255, 255, 255, 0.8)'
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: `1px solid ${ROYAL_COLORS.cardBorder}`
        }}>
          <div style={{
            fontSize: '11px',
            color: ROYAL_COLORS.muted,
            textAlign: 'center'
          }}>
            {i18n.isRTL() ? 'גרסה 1.0.0' : 'Version 1.0.0'}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
