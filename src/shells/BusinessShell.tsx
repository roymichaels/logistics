import React from 'react';
import { AppShell, AppHeader, NavItem } from '../layouts/AppShell';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppServices } from '../context/AppServicesContext';

interface BusinessShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

export function BusinessShell({ children, title, subtitle, headerActions }: BusinessShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole } = useAppServices();

  const isActive = (path: string) => location.pathname.startsWith(path);

  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Business Portal</h2>
        {subtitle && <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.7 }}>{subtitle}</p>}
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        <NavItem
          icon="📊"
          label="Dashboard"
          active={isActive('/business/dashboard')}
          onClick={() => navigate('/business/dashboard')}
        />
        <NavItem
          icon="📦"
          label="Products"
          active={isActive('/business/products')}
          onClick={() => navigate('/business/products')}
        />
        <NavItem
          icon="📋"
          label="Orders"
          active={isActive('/business/orders')}
          onClick={() => navigate('/business/orders')}
        />
        <NavItem
          icon="🏪"
          label="Inventory"
          active={isActive('/business/inventory')}
          onClick={() => navigate('/business/inventory')}
        />
        <NavItem
          icon="🚗"
          label="Drivers"
          active={isActive('/business/drivers')}
          onClick={() => navigate('/business/drivers')}
        />
        <NavItem
          icon="📍"
          label="Zones"
          active={isActive('/business/zones')}
          onClick={() => navigate('/business/zones')}
        />
        <NavItem
          icon="💬"
          label="Chat"
          active={isActive('/business/chat')}
          onClick={() => navigate('/business/chat')}
        />

        {(userRole === 'business_owner' || userRole === 'infrastructure_owner') && (
          <>
            <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '8px 16px' }} />
            <NavItem
              icon="💰"
              label="Financials"
              active={isActive('/business/financials')}
              onClick={() => navigate('/business/financials')}
            />
            <NavItem
              icon="📊"
              label="Analytics"
              active={isActive('/business/analytics')}
              onClick={() => navigate('/business/analytics')}
            />
          </>
        )}

        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '8px 16px' }} />
        <NavItem
          icon="⚙️"
          label="Settings"
          active={isActive('/business/settings')}
          onClick={() => navigate('/business/settings')}
        />
      </nav>
    </div>
  );

  const header = (
    <AppHeader
      title={title || 'Business Portal'}
      right={headerActions}
    />
  );

  return (
    <AppShell header={header} sidebar={sidebar}>
      {children}
    </AppShell>
  );
}
