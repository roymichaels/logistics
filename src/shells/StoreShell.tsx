import React from 'react';
import { BaseShell } from './BaseShell';
import { useShellContext } from './BaseShell';

interface StoreShellProps {
  children: React.ReactNode;
  onNavigate: (path: string) => void;
  onLogout?: () => void;
  currentPath: string;
  isAuthenticated?: boolean;
  cartItemCount?: number;
}

function StoreShellContent({ children, isAuthenticated, cartItemCount }: { children: React.ReactNode; isAuthenticated?: boolean; cartItemCount?: number }) {
  const { navigationItems, onNavigate, currentPath, onLogout } = useShellContext();

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
            Store
          </h1>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {cartItemCount !== undefined && cartItemCount > 0 && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => onNavigate('/store/cart')}
                  style={{
                    padding: '8px 16px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cart
                </button>
                <span style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {cartItemCount}
                </span>
              </div>
            )}
            {isAuthenticated && (
              <button
                onClick={onLogout}
                style={{
                  padding: '8px 16px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        <nav style={{
          width: '200px',
          background: '#f9fafb',
          borderRight: '1px solid #e5e7eb',
          padding: '16px',
          overflowY: 'auto'
        }}>
          {navigationItems
            .filter(item => !item.requiredRoles || item.requiredRoles.includes('customer') || item.requiredRoles.includes('user'))
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
                  background: currentPath.startsWith(item.path) ? '#3b82f6' : 'transparent',
                  color: currentPath.startsWith(item.path) ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  textAlign: 'left'
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
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

export function StoreShell({
  children,
  onNavigate,
  onLogout,
  currentPath,
  isAuthenticated,
  cartItemCount
}: StoreShellProps) {
  return (
    <BaseShell
      role={isAuthenticated ? 'customer' : 'user'}
      currentPath={currentPath}
      onNavigate={onNavigate}
      onLogout={onLogout || (() => {})}
      title="Store"
    >
      <StoreShellContent isAuthenticated={isAuthenticated} cartItemCount={cartItemCount}>
        {children}
      </StoreShellContent>
    </BaseShell>
  );
}
