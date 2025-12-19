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
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="layout-shell prevent-overflow">
      <header
        className="layout-shell__header"
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
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
                fontSize: '20px'
              }}
            >
              ☰
            </button>
            <h1 className="heading-3" style={{ margin: 0, color: 'white' }}>
              Infrastructure Admin
            </h1>
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
                alignSelf: 'flex-end'
              }}
            >
              ×
            </button>
          )}
          {navigationItems.map(item => (
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
                background: currentPath.startsWith(item.path) ? '#3b82f6' : 'transparent',
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
