import React from 'react';
import { useNavigate } from 'react-router-dom';

const pages = [
  { id: 'landing', label: 'Landing Page', components: 5, routes: 1, path: '/' },
  { id: 'dashboard', label: 'Dashboard', components: 12, routes: 1, path: '/business/dashboard' },
  { id: 'catalog', label: 'Catalog', components: 8, routes: 1, path: '/store/catalog' },
  { id: 'business-dashboard', label: 'Business Dashboard', components: 15, routes: 1, path: '/business/dashboard' },
  { id: 'driver-dashboard', label: 'Driver Dashboard', components: 10, routes: 1, path: '/driver/dashboard' },
  { id: 'orders', label: 'Orders', components: 9, routes: 1, path: '/business/orders' },
  { id: 'inventory', label: 'Inventory', components: 7, routes: 1, path: '/business/inventory' },
  { id: 'dispatch', label: 'Dispatch Board', components: 11, routes: 1, path: '/business/dispatch' },
  { id: 'chat', label: 'Chat', components: 6, routes: 1, path: '/chat' },
  { id: 'profile', label: 'Profile', components: 4, routes: 1, path: '/store/profile' },
];

export function PagesPanel() {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div
        style={{
          fontSize: '11px',
          fontWeight: '600',
          color: 'rgba(255, 255, 255, 0.4)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Page Inspector
      </div>

      {pages.map((page) => (
        <div
          key={page.id}
          onClick={() => navigate(page.path)}
          style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
          }}
        >
          <div
            style={{
              fontSize: '13px',
              fontWeight: '500',
              color: 'rgba(255, 255, 255, 0.9)',
              marginBottom: '8px',
            }}
          >
            {page.label}
          </div>
          <div
            style={{
              display: 'flex',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.5)',
              }}
            >
              <span>📦</span>
              <span>{page.components} components</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.5)',
              }}
            >
              <span>🗺️</span>
              <span>{page.routes} routes</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
