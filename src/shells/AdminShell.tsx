import React from 'react';
import { AppShell, AppHeader, NavItem } from '../layouts/AppShell';
import { useNavigate, useLocation } from 'react-router-dom';

interface AdminShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

export function AdminShell({ children, title, subtitle, headerActions }: AdminShellProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname.startsWith(path);

  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Platform Admin</h2>
        {subtitle && <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.7 }}>{subtitle}</p>}
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        <NavItem
          icon="📊"
          label="Dashboard"
          active={isActive('/admin/dashboard')}
          onClick={() => navigate('/admin/dashboard')}
        />
        <NavItem
          icon="🏢"
          label="Businesses"
          active={isActive('/admin/businesses')}
          onClick={() => navigate('/admin/businesses')}
        />
        <NavItem
          icon="👥"
          label="Users"
          active={isActive('/admin/users')}
          onClick={() => navigate('/admin/users')}
        />
        <NavItem
          icon="🚗"
          label="Drivers"
          active={isActive('/admin/drivers')}
          onClick={() => navigate('/admin/drivers')}
        />
        <NavItem
          icon="📋"
          label="Orders"
          active={isActive('/admin/orders')}
          onClick={() => navigate('/admin/orders')}
        />

        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '8px 16px' }} />

        <NavItem
          icon="💰"
          label="Financials"
          active={isActive('/admin/financials')}
          onClick={() => navigate('/admin/financials')}
        />
        <NavItem
          icon="📈"
          label="Analytics"
          active={isActive('/admin/analytics')}
          onClick={() => navigate('/admin/analytics')}
        />
        <NavItem
          icon="📊"
          label="Reports"
          active={isActive('/admin/reports')}
          onClick={() => navigate('/admin/reports')}
        />

        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '8px 16px' }} />

        <NavItem
          icon="🔧"
          label="Infrastructure"
          active={isActive('/admin/infrastructure')}
          onClick={() => navigate('/admin/infrastructure')}
        />
        <NavItem
          icon="📝"
          label="Audit Logs"
          active={isActive('/admin/logs')}
          onClick={() => navigate('/admin/logs')}
        />
        <NavItem
          icon="⚙️"
          label="Settings"
          active={isActive('/admin/settings')}
          onClick={() => navigate('/admin/settings')}
        />
      </nav>
    </div>
  );

  const header = (
    <AppHeader
      title={title || 'Platform Admin'}
      right={headerActions}
    />
  );

  return (
    <AppShell header={header} sidebar={sidebar}>
      {children}
    </AppShell>
  );
}
