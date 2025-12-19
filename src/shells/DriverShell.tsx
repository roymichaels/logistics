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
    <div className="layout-shell layout-with-bottom-nav prevent-overflow">
      <header
        className="layout-shell__header"
        style={{
          background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
          color: 'white',
          padding: 'var(--spacing-sm)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
      >
        <div className="layout-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="heading-4" style={{ margin: 0, color: 'white' }}>
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
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
                ${driverEarnings.toFixed(2)}
              </p>
            )}
            <button
              onClick={() => onNavigate('/logout')}
              className="tablet-up"
              style={{
                padding: '6px 12px',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                marginTop: '4px'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="layout-shell__main">
        {children}
      </main>

      <nav
        className="bottom-nav"
        style={{
          background: 'white',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: 'var(--spacing-xs) var(--spacing-sm)'
        }}
      >
        {navigationItems.slice(0, 5).map(item => {
          const isActive = currentPath.startsWith(item.path);
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.path)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 12px',
                background: 'transparent',
                color: isActive ? '#f97316' : '#666',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: isActive ? '600' : '400',
                minWidth: '60px',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              <span className="wrap-text" style={{ textAlign: 'center', lineHeight: 1.2 }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
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
