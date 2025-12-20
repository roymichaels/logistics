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
          background: 'linear-gradient(135deg, #6A4BFF 0%, #5A3FE8 100%)',
          color: 'white',
          padding: 'var(--spacing-md)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <div className="layout-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            className="mobile-only"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              padding: '8px',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            ☰
          </button>
          <button
            onClick={() => onNavigate('/logout')}
            style={{
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'background 0.2s ease'
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
          >
            Logout
          </button>
        </div>
      </header>

      <div className="layout-shell__content layout-with-sidebar">
        <nav
          className={`layout-sidebar ${sidebarOpen ? 'mobile-sidebar-open' : ''}`}
          style={{
            background: '#1A1F2A',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            padding: 'var(--spacing-lg) var(--spacing-md)',
            display: sidebarOpen ? 'flex' : undefined,
            flexDirection: 'column',
            gap: 'var(--spacing-xs)',
            position: sidebarOpen ? 'fixed' : undefined,
            top: sidebarOpen ? 0 : undefined,
            right: sidebarOpen ? 0 : undefined,
            bottom: sidebarOpen ? 0 : undefined,
            width: sidebarOpen ? '280px' : undefined,
            zIndex: sidebarOpen ? 200 : undefined,
            boxShadow: sidebarOpen ? '-2px 0 12px rgba(0,0,0,0.3)' : undefined
          }}
        >
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                padding: '8px',
                background: 'transparent',
                border: 'none',
                fontSize: '28px',
                cursor: 'pointer',
                alignSelf: 'flex-end',
                marginBottom: '16px',
                color: '#FFFFFF'
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
                  padding: '14px 16px',
                  background: currentPath.startsWith(item.path)
                    ? 'linear-gradient(135deg, #6A4BFF 0%, #5A3FE8 100%)'
                    : 'transparent',
                  color: currentPath.startsWith(item.path) ? '#FFFFFF' : '#D0D3DB',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: currentPath.startsWith(item.path) ? 600 : 400,
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  minHeight: '44px'
                }}
                onMouseOver={(e) => {
                  if (!currentPath.startsWith(item.path)) {
                    e.currentTarget.style.background = 'rgba(106, 75, 255, 0.1)';
                    e.currentTarget.style.color = '#FFFFFF';
                  }
                }}
                onMouseOut={(e) => {
                  if (!currentPath.startsWith(item.path)) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#D0D3DB';
                  }
                }}
              >
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                <span className="wrap-text">{item.label}</span>
                {item.badge && (
                  <span style={{
                    marginLeft: 'auto',
                    background: '#F87171',
                    color: 'white',
                    borderRadius: '12px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 600
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
