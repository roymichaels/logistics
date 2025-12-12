import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canView } from '../lib/auth/canView';
import { migrationFlags } from '../migration/flags';

/**
 * Minimal driver-focused wrapper.
 * Keeps the view lightweight for mobile drivers.
 */
export function DriverLayout({ children }: { children?: React.ReactNode }) {
  const { user } = useAuth();
  const role = (user as any)?.role || null;

  if (migrationFlags.unifiedShell || migrationFlags.unifiedApp) {
    return null;
  }

  if (!canView('driver', role || '')) {
    return <Navigate to="/business/dashboard" replace />;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0b1220',
        color: '#e2e8f0',
        width: '100vw',
        overflowX: 'hidden',
        padding: '0 clamp(14px, 3vw, 26px)',
        boxSizing: 'border-box',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          width: '100%',
        }}
      >
        <div style={{ fontWeight: 700 }}>Driver</div>
        <div style={{ fontSize: '12px', opacity: 0.8 }}>Status • Active</div>
      </header>
      <main style={{ width: '100%' }}>
        <Outlet />
      </main>
    </div>
  );
}
