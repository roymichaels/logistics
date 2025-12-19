import React from 'react';
import { BaseShell } from './BaseShell';
import { useShellContext } from './BaseShell';

interface AdminShellProps {
  children: React.ReactNode;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  currentPath: string;
  username?: string;
}

function AdminShellContent({ children }: { children: React.ReactNode }) {
  const { navigationItems, onNavigate, currentPath } = useShellContext();

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      <header style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
        color: 'white',
        padding: '16px 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
            Infrastructure Admin
          </h1>
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
          {navigationItems.map(item => (
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

export function AdminShell({
  children,
  onNavigate,
  onLogout,
  currentPath,
  username
}: AdminShellProps) {
  return (
    <BaseShell
      role="infrastructure_owner"
      currentPath={currentPath}
      onNavigate={onNavigate}
      onLogout={onLogout}
      title="Infrastructure Admin"
    >
      <AdminShellContent>
        {children}
      </AdminShellContent>
    </BaseShell>
  );
}
