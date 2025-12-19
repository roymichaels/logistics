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
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      <header style={{
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
        padding: '16px 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
              {businessName || 'Business Portal'}
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.9 }}>
              Role: {roleLabel}
            </p>
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

      <div style={{ display: 'flex', flex: 1 }}>
        <nav style={{
          width: '250px',
          background: '#f8f9fa',
          borderRight: '1px solid #e0e0e0',
          padding: '16px',
          overflowY: 'auto'
        }}>
          {navigationItems
            .filter(item => !item.requiredRoles || item.requiredRoles.includes(role))
            .map(item => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px 16px',
                  marginBottom: '8px',
                  background: currentPath.startsWith(item.path) ? '#10b981' : 'transparent',
                  color: currentPath.startsWith(item.path) ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  textAlign: 'left'
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
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

        <main style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
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
