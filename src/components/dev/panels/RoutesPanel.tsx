import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const routes = [
  { path: '/store/catalog', label: 'Catalog', category: 'Store' },
  { path: '/store/cart', label: 'Cart', category: 'Store' },
  { path: '/store/checkout', label: 'Checkout', category: 'Store' },
  { path: '/store/orders', label: 'Store Orders', category: 'Store' },
  { path: '/store/profile', label: 'Store Profile', category: 'Store' },
  { path: '/business/dashboard', label: 'Business Dashboard', category: 'Business' },
  { path: '/business/products', label: 'Products', category: 'Business' },
  { path: '/business/orders', label: 'Orders', category: 'Business' },
  { path: '/business/restock', label: 'Restock', category: 'Business' },
  { path: '/business/inventory', label: 'Inventory', category: 'Business' },
  { path: '/business/incoming', label: 'Incoming', category: 'Business' },
  { path: '/business/reports', label: 'Reports', category: 'Business' },
  { path: '/business/drivers', label: 'Drivers', category: 'Business' },
  { path: '/business/zones', label: 'Zones', category: 'Business' },
  { path: '/business/warehouse', label: 'Warehouse', category: 'Business' },
  { path: '/business/dispatch', label: 'Dispatch', category: 'Business' },
  { path: '/driver/dashboard', label: 'Driver Dashboard', category: 'Driver' },
  { path: '/driver/tasks', label: 'Tasks', category: 'Driver' },
  { path: '/driver/my-deliveries', label: 'My Deliveries', category: 'Driver' },
  { path: '/driver/my-inventory', label: 'My Inventory', category: 'Driver' },
  { path: '/driver/my-zones', label: 'My Zones', category: 'Driver' },
  { path: '/driver/status', label: 'Status', category: 'Driver' },
  { path: '/admin/analytics', label: 'Analytics', category: 'Admin' },
  { path: '/admin/businesses', label: 'Businesses', category: 'Admin' },
  { path: '/admin/users', label: 'Users', category: 'Admin' },
  { path: '/admin/logs', label: 'Logs', category: 'Admin' },
  { path: '/channels', label: 'Channels', category: 'Social' },
  { path: '/chat', label: 'Chat', category: 'Social' },
  { path: '/notifications', label: 'Notifications', category: 'Social' },
  { path: '/user-homepage', label: 'Homepage', category: 'User' },
  { path: '/social-feed', label: 'Feed', category: 'User' },
  { path: '/social-profile', label: 'Social Profile', category: 'User' },
  { path: '/social-analytics', label: 'Social Analytics', category: 'User' },
  { path: '/my-stats', label: 'My Stats', category: 'User' },
  { path: '/my-role', label: 'My Role', category: 'User' },
  { path: '/sandbox', label: 'Sandbox', category: 'Dev' },
  { path: '/start-new', label: 'Start New', category: 'Dev' },
  { path: '/kyc', label: 'KYC Flow', category: 'Verification' },
];

export function RoutesPanel() {
  const location = useLocation();
  const navigate = useNavigate();

  const categories = Array.from(new Set(routes.map((r) => r.category)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div
        style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
        }}
      >
        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
          Current Route
        </div>
        <div
          style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#60a5fa',
            fontFamily: 'monospace',
          }}
        >
          {location.pathname}
        </div>
      </div>

      {categories.map((category) => (
        <div key={category}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: '600',
              color: 'rgba(255, 255, 255, 0.4)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {category}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {routes
              .filter((r) => r.category === category)
              .map((route) => {
                const isActive = location.pathname === route.path;
                return (
                  <button
                    key={route.path}
                    onClick={() => navigate(route.path)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: isActive
                        ? 'rgba(59, 130, 246, 0.15)'
                        : 'rgba(255, 255, 255, 0.03)',
                      color: isActive ? '#60a5fa' : 'rgba(255, 255, 255, 0.7)',
                      fontSize: '13px',
                      fontWeight: isActive ? '500' : '400',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                      }
                    }}
                  >
                    <span>{route.label}</span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: 'rgba(255, 255, 255, 0.3)',
                      }}
                    >
                      {route.path}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
