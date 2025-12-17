import React from 'react';
import { AppShell, AppHeader, BottomNavItem } from '../layouts/AppShell';
import { useNavigate, useLocation } from 'react-router-dom';

interface DriverShellProps {
  children: React.ReactNode;
  title?: string;
  headerActions?: React.ReactNode;
}

export function DriverShell({ children, title, headerActions }: DriverShellProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname.startsWith(path);

  const bottomNav = (
    <div style={{ display: 'flex', width: '100%' }}>
      <BottomNavItem
        icon="🏠"
        label="Home"
        active={isActive('/driver/dashboard')}
        onClick={() => navigate('/driver/dashboard')}
      />
      <BottomNavItem
        icon="📋"
        label="Deliveries"
        active={isActive('/driver/routes') || isActive('/driver/deliveries')}
        onClick={() => navigate('/driver/routes')}
      />
      <BottomNavItem
        icon="📦"
        label="Inventory"
        active={isActive('/driver/inventory')}
        onClick={() => navigate('/driver/inventory')}
      />
      <BottomNavItem
        icon="📍"
        label="Zones"
        active={isActive('/driver/zones')}
        onClick={() => navigate('/driver/zones')}
      />
      <BottomNavItem
        icon="💰"
        label="Earnings"
        active={isActive('/driver/earnings')}
        onClick={() => navigate('/driver/earnings')}
      />
    </div>
  );

  const header = (
    <AppHeader
      title={title || 'Driver App'}
      right={headerActions}
    />
  );

  return (
    <AppShell header={header} bottomNav={bottomNav}>
      {children}
    </AppShell>
  );
}
