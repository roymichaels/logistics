import React from 'react';
import { BaseShell } from './BaseShell';
import { useShellContext } from './BaseShell';

interface DriverShellProps {
  children: React.ReactNode;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  currentPath: string;
  driverName?: string;
  driverEarnings?: number;
}

function DriverShellContent({ children, driverName, driverEarnings }: { children: React.ReactNode; driverName?: string; driverEarnings?: number }) {
  const { navigationItems, onNavigate, currentPath } = useShellContext();

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      <header style={{
        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
        color: 'white',
        padding: '16px 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
              Delivery Dashboard
            </h1>
            {driverName && (
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.9 }}>
                {driverName}
              </p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            {driverEarnings !== undefined && (
              <p style={{ margin: 0, fontSize: '14px' }}>
                Total: ${driverEarnings.toFixed(2)}
              </p>
            )}
            <button
              onClick={() => onNavigate('/logout')}
              style={{
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                marginTop: '8px'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        <nav style={{
          width: '200px',
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
                background: currentPath.startsWith(item.path) ? '#f97316' : 'transparent',
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

export function DriverShell({
  children,
  onNavigate,
  onLogout,
  currentPath,
  driverName,
  driverEarnings
}: DriverShellProps) {
  return (
    <BaseShell
      role="driver"
      currentPath={currentPath}
      onNavigate={onNavigate}
      onLogout={onLogout}
      title="Driver Dashboard"
    >
      <DriverShellContent driverName={driverName} driverEarnings={driverEarnings}>
        {children}
      </DriverShellContent>
    </BaseShell>
  );
}
