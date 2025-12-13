import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const routes = [
  { path: '/', label: 'Landing Page', category: 'Public' },
  { path: '/login', label: 'Login', category: 'Auth' },
  { path: '/dashboard', label: 'Dashboard', category: 'Main' },
  { path: '/catalog', label: 'Catalog', category: 'Store' },
  { path: '/businesses', label: 'Businesses', category: 'Business' },
  { path: '/orders', label: 'Orders', category: 'Main' },
  { path: '/inventory', label: 'Inventory', category: 'Main' },
  { path: '/drivers', label: 'Drivers', category: 'Driver' },
  { path: '/dispatch', label: 'Dispatch Board', category: 'Driver' },
  { path: '/channels', label: 'Channels', category: 'Social' },
  { path: '/chat', label: 'Chat', category: 'Social' },
  { path: '/profile', label: 'Profile', category: 'User' },
  { path: '/admin', label: 'Admin Panel', category: 'Admin' },
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
