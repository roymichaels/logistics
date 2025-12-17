import React from 'react';
import { AppShell, AppHeader, BottomNavItem } from '../layouts/AppShell';
import { useNavigate, useLocation } from 'react-router-dom';

interface StoreShellProps {
  children: React.ReactNode;
  title?: string;
  headerActions?: React.ReactNode;
}

export function StoreShell({ children, title, headerActions }: StoreShellProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname.startsWith(path);

  const bottomNav = (
    <div style={{ display: 'flex', width: '100%' }}>
      <BottomNavItem
        icon="🏪"
        label="Shop"
        active={isActive('/store/catalog') || isActive('/store/home')}
        onClick={() => navigate('/store/catalog')}
      />
      <BottomNavItem
        icon="🔍"
        label="Search"
        active={isActive('/store/search')}
        onClick={() => navigate('/store/search')}
      />
      <BottomNavItem
        icon="🛒"
        label="Cart"
        active={isActive('/store/cart')}
        onClick={() => navigate('/store/cart')}
      />
      <BottomNavItem
        icon="📋"
        label="Orders"
        active={isActive('/store/orders')}
        onClick={() => navigate('/store/orders')}
      />
      <BottomNavItem
        icon="👤"
        label="Account"
        active={isActive('/store/profile')}
        onClick={() => navigate('/store/profile')}
      />
    </div>
  );

  const header = (
    <AppHeader
      title={title || 'Store'}
      right={headerActions}
    />
  );

  return (
    <AppShell header={header} bottomNav={bottomNav}>
      {children}
    </AppShell>
  );
}
