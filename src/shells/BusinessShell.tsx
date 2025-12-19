import React, { useMemo } from 'react';
import { BaseShell } from './BaseShell';
import { useShellContext } from './BaseShell';
import { UserRole } from './types';

interface BusinessShellProps {
  children: React.ReactNode;
  role: UserRole;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  currentPath: string;
  businessName?: string;
  businessId?: string;
}

function BusinessShellContent({ children, businessName, role }: { children: React.ReactNode; businessName?: string; role: UserRole }) {
  const { navigationItems, onNavigate, currentPath } = useShellContext();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const roleLabel = useMemo(() => {
    const labels: Record<UserRole, string> = {
      business_owner: 'Owner',
      manager: 'Manager',
      warehouse: 'Warehouse',
      dispatcher: 'Dispatcher',
      sales: 'Sales',
      customer_service: 'Support',
      driver: 'Driver',
      customer: 'Customer',
      user: 'User',
      infrastructure_owner: 'Admin'
    };
    return labels[role] || role;
  }, [role]);

  return (
    <div className="layout-shell prevent-overflow">
      <header
        className="layout-shell__header"
        style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          padding: 'var(--spacing-md)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
      >
        <div className="layout-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <button
              className="mobile-only"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                padding: '8px',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              ☰
            </button>
            <div>
              <h1 className="heading-3" style={{ margin: 0, color: 'white' }}>
                {businessName || 'Business Portal'}
              </h1>
              <p className="mobile-only" style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.9 }}>
                {roleLabel}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('/logout')}
            style={{
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <div className="layout-shell__content layout-with-sidebar">
        <nav
          className={`layout-sidebar ${sidebarOpen ? 'mobile-sidebar-open' : ''}`}
          style={{
            background: '#f8f9fa',
            borderRight: '1px solid #e0e0e0',
            padding: 'var(--spacing-md)',
            display: sidebarOpen ? 'flex' : undefined,
            flexDirection: 'column',
            gap: 'var(--spacing-xs)',
            position: sidebarOpen ? 'fixed' : undefined,
            top: sidebarOpen ? 0 : undefined,
            left: sidebarOpen ? 0 : undefined,
            bottom: sidebarOpen ? 0 : undefined,
            zIndex: sidebarOpen ? 200 : undefined,
            boxShadow: sidebarOpen ? '2px 0 8px rgba(0,0,0,0.1)' : undefined
          }}
        >
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                padding: '8px',
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                alignSelf: 'flex-end',
                marginBottom: '8px'
              }}
            >
              ×
            </button>
          )}
          {navigationItems
            .filter(item => !item.requiredRoles || item.requiredRoles.includes(role))
            .map(item => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.path);
                  setSidebarOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px 16px',
                  background: currentPath.startsWith(item.path) ? '#10b981' : 'transparent',
                  color: currentPath.startsWith(item.path) ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>{item.icon}</span>
                <span className="wrap-text">{item.label}</span>
                {item.badge && (
                  <span style={{
                    marginLeft: 'auto',
                    background: '#ef4444',
                    color: 'white',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '12px'
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
        </nav>

        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 199
            }}
            className="mobile-only"
          />
        )}

        <main className="layout-shell__main layout-sidebar-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export function BusinessShell({
  children,
  role,
  onNavigate,
  onLogout,
  currentPath,
  businessName,
  businessId
}: BusinessShellProps) {
  return (
    <BaseShell
      role={role}
      currentPath={currentPath}
      onNavigate={onNavigate}
      onLogout={onLogout}
      title={businessName || 'Business Portal'}
    >
      <BusinessShellContent businessName={businessName} role={role}>
        {children}
      </BusinessShellContent>
    </BaseShell>
  );
}
