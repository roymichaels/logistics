import React, { ReactNode } from 'react';
import { AppShell, AppHeader, NavItem, BottomNavItem } from './AppShell';

export interface RoleBasedLayoutProps {
  role: 'business_owner' | 'manager' | 'driver' | 'customer';
  children: ReactNode;
  onNavigate: (path: string) => void;
  currentPath: string;
}

export function RoleBasedLayout({ role, children, onNavigate, currentPath }: RoleBasedLayoutProps) {
  const roleConfig = getRoleConfig(role, onNavigate, currentPath);

  return (
    <AppShell
      header={<AppHeader title={roleConfig.title} right={roleConfig.headerActions} />}
      sidebar={roleConfig.sidebar}
      bottomNav={roleConfig.bottomNav}
    >
      {children}
    </AppShell>
  );
}

function getRoleConfig(role: string, onNavigate: (path: string) => void, currentPath: string) {
  const isActive = (path: string) => currentPath === path;

  switch (role) {
    case 'business_owner':
      return {
        title: 'Business Dashboard',
        headerActions: <div>Profile</div>,
        sidebar: (
          <div>
            <NavItem icon="📊" label="Dashboard" active={isActive('/dashboard')} onClick={() => onNavigate('/dashboard')} />
            <NavItem icon="📦" label="Inventory" active={isActive('/inventory')} onClick={() => onNavigate('/inventory')} />
            <NavItem icon="📋" label="Orders" active={isActive('/orders')} onClick={() => onNavigate('/orders')} />
            <NavItem icon="👥" label="Team" active={isActive('/team')} onClick={() => onNavigate('/team')} />
            <NavItem icon="📊" label="Analytics" active={isActive('/analytics')} onClick={() => onNavigate('/analytics')} />
            <NavItem icon="⚙️" label="Settings" active={isActive('/settings')} onClick={() => onNavigate('/settings')} />
          </div>
        ),
        bottomNav: null,
      };

    case 'manager':
      return {
        title: 'Manager Portal',
        headerActions: <div>Profile</div>,
        sidebar: (
          <div>
            <NavItem icon="📊" label="Dashboard" active={isActive('/dashboard')} onClick={() => onNavigate('/dashboard')} />
            <NavItem icon="📦" label="Inventory" active={isActive('/inventory')} onClick={() => onNavigate('/inventory')} />
            <NavItem icon="📋" label="Orders" active={isActive('/orders')} onClick={() => onNavigate('/orders')} />
            <NavItem icon="🚗" label="Drivers" active={isActive('/drivers')} onClick={() => onNavigate('/drivers')} />
            <NavItem icon="📍" label="Zones" active={isActive('/zones')} onClick={() => onNavigate('/zones')} />
          </div>
        ),
        bottomNav: null,
      };

    case 'driver':
      return {
        title: 'Driver App',
        headerActions: null,
        sidebar: null,
        bottomNav: (
          <div style={{ display: 'flex' }}>
            <BottomNavItem icon="🏠" label="Home" active={isActive('/home')} onClick={() => onNavigate('/home')} />
            <BottomNavItem icon="📋" label="Orders" active={isActive('/orders')} onClick={() => onNavigate('/orders')} />
            <BottomNavItem icon="📍" label="Map" active={isActive('/map')} onClick={() => onNavigate('/map')} />
            <BottomNavItem icon="💰" label="Earnings" active={isActive('/earnings')} onClick={() => onNavigate('/earnings')} />
            <BottomNavItem icon="👤" label="Profile" active={isActive('/profile')} onClick={() => onNavigate('/profile')} />
          </div>
        ),
      };

    case 'customer':
      return {
        title: 'Store',
        headerActions: <div>Cart</div>,
        sidebar: null,
        bottomNav: (
          <div style={{ display: 'flex' }}>
            <BottomNavItem icon="🏪" label="Shop" active={isActive('/shop')} onClick={() => onNavigate('/shop')} />
            <BottomNavItem icon="🔍" label="Search" active={isActive('/search')} onClick={() => onNavigate('/search')} />
            <BottomNavItem icon="📦" label="Orders" active={isActive('/orders')} onClick={() => onNavigate('/orders')} />
            <BottomNavItem icon="👤" label="Account" active={isActive('/account')} onClick={() => onNavigate('/account')} />
          </div>
        ),
      };

    default:
      return {
        title: 'App',
        headerActions: null,
        sidebar: null,
        bottomNav: null,
      };
  }
}
