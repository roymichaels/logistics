import React from 'react';
import { NavItem, BottomNavItem } from '../layouts/AppShell';

export interface NavigationConfig {
  sidebar?: React.ReactNode;
  bottomNav?: React.ReactNode;
  headerTitle?: string;
}

export function getNavigationConfig(
  role: string | null,
  currentPath: string,
  onNavigate: (path: string) => void
): NavigationConfig {
  const isActive = (path: string) => currentPath.startsWith(path);

  switch (role) {
    case 'business_owner':
    case 'infrastructure_owner':
    case 'owner':
      return {
        headerTitle: 'Business Portal',
        sidebar: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <NavItem
              icon="📊"
              label="Dashboard"
              active={isActive('/business/dashboard')}
              onClick={() => onNavigate('/business/dashboard')}
            />
            <NavItem
              icon="📦"
              label="Products"
              active={isActive('/business/products')}
              onClick={() => onNavigate('/business/products')}
            />
            <NavItem
              icon="📋"
              label="Orders"
              active={isActive('/business/orders')}
              onClick={() => onNavigate('/business/orders')}
            />
            <NavItem
              icon="🏪"
              label="Inventory"
              active={isActive('/business/inventory')}
              onClick={() => onNavigate('/business/inventory')}
            />
            <NavItem
              icon="🚗"
              label="Drivers"
              active={isActive('/business/drivers')}
              onClick={() => onNavigate('/business/drivers')}
            />
            <NavItem
              icon="📍"
              label="Zones"
              active={isActive('/business/zones')}
              onClick={() => onNavigate('/business/zones')}
            />
            <NavItem
              icon="📊"
              label="Reports"
              active={isActive('/business/reports')}
              onClick={() => onNavigate('/business/reports')}
            />
          </div>
        ),
        bottomNav: null,
      };

    case 'manager':
      return {
        headerTitle: 'Manager Portal',
        sidebar: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <NavItem
              icon="📊"
              label="Dashboard"
              active={isActive('/business/dashboard')}
              onClick={() => onNavigate('/business/dashboard')}
            />
            <NavItem
              icon="📦"
              label="Inventory"
              active={isActive('/business/inventory')}
              onClick={() => onNavigate('/business/inventory')}
            />
            <NavItem
              icon="📋"
              label="Orders"
              active={isActive('/business/orders')}
              onClick={() => onNavigate('/business/orders')}
            />
            <NavItem
              icon="🚗"
              label="Drivers"
              active={isActive('/business/drivers')}
              onClick={() => onNavigate('/business/drivers')}
            />
            <NavItem
              icon="📍"
              label="Zones"
              active={isActive('/business/zones')}
              onClick={() => onNavigate('/business/zones')}
            />
          </div>
        ),
        bottomNav: null,
      };

    case 'warehouse':
    case 'infrastructure_warehouse':
      return {
        headerTitle: 'Warehouse Dashboard',
        sidebar: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <NavItem
              icon="📊"
              label="Dashboard"
              active={isActive('/business/warehouse')}
              onClick={() => onNavigate('/business/warehouse')}
            />
            <NavItem
              icon="📦"
              label="Inventory"
              active={isActive('/business/inventory')}
              onClick={() => onNavigate('/business/inventory')}
            />
            <NavItem
              icon="📥"
              label="Incoming"
              active={isActive('/business/incoming')}
              onClick={() => onNavigate('/business/incoming')}
            />
            <NavItem
              icon="🔄"
              label="Restock Requests"
              active={isActive('/business/restock')}
              onClick={() => onNavigate('/business/restock')}
            />
          </div>
        ),
        bottomNav: null,
      };

    case 'driver':
      return {
        headerTitle: 'Driver App',
        sidebar: null,
        bottomNav: (
          <div style={{ display: 'flex' }}>
            <BottomNavItem
              icon="🏠"
              label="Home"
              active={isActive('/driver/dashboard')}
              onClick={() => onNavigate('/driver/dashboard')}
            />
            <BottomNavItem
              icon="📋"
              label="Deliveries"
              active={isActive('/driver/routes') || isActive('/driver/my-deliveries')}
              onClick={() => onNavigate('/driver/routes')}
            />
            <BottomNavItem
              icon="📦"
              label="Inventory"
              active={isActive('/driver/my-inventory')}
              onClick={() => onNavigate('/driver/my-inventory')}
            />
            <BottomNavItem
              icon="📍"
              label="Zones"
              active={isActive('/driver/my-zones')}
              onClick={() => onNavigate('/driver/my-zones')}
            />
            <BottomNavItem
              icon="👤"
              label="Profile"
              active={isActive('/store/profile')}
              onClick={() => onNavigate('/store/profile')}
            />
          </div>
        ),
      };

    case 'dispatcher':
    case 'infrastructure_dispatcher':
      return {
        headerTitle: 'Dispatch Center',
        sidebar: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <NavItem
              icon="🗺️"
              label="Dispatch Board"
              active={isActive('/business/dispatch')}
              onClick={() => onNavigate('/business/dispatch')}
            />
            <NavItem
              icon="🚗"
              label="Drivers"
              active={isActive('/business/drivers')}
              onClick={() => onNavigate('/business/drivers')}
            />
            <NavItem
              icon="📋"
              label="Orders"
              active={isActive('/business/orders')}
              onClick={() => onNavigate('/business/orders')}
            />
            <NavItem
              icon="📍"
              label="Zones"
              active={isActive('/business/zones')}
              onClick={() => onNavigate('/business/zones')}
            />
          </div>
        ),
        bottomNav: null,
      };

    case 'sales':
      return {
        headerTitle: 'Sales Dashboard',
        sidebar: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <NavItem
              icon="📊"
              label="Dashboard"
              active={isActive('/business/dashboard')}
              onClick={() => onNavigate('/business/dashboard')}
            />
            <NavItem
              icon="📋"
              label="Orders"
              active={isActive('/business/orders')}
              onClick={() => onNavigate('/business/orders')}
            />
            <NavItem
              icon="📦"
              label="Products"
              active={isActive('/business/products')}
              onClick={() => onNavigate('/business/products')}
            />
            <NavItem
              icon="📈"
              label="My Stats"
              active={isActive('/my-stats')}
              onClick={() => onNavigate('/my-stats')}
            />
          </div>
        ),
        bottomNav: null,
      };

    case 'customer_service':
      return {
        headerTitle: 'Support Dashboard',
        sidebar: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <NavItem
              icon="📋"
              label="Orders"
              active={isActive('/business/orders')}
              onClick={() => onNavigate('/business/orders')}
            />
            <NavItem
              icon="💬"
              label="Chat"
              active={isActive('/chat')}
              onClick={() => onNavigate('/chat')}
            />
            <NavItem
              icon="👥"
              label="Customers"
              active={isActive('/admin/users')}
              onClick={() => onNavigate('/admin/users')}
            />
          </div>
        ),
        bottomNav: null,
      };

    case 'admin':
    case 'superadmin':
      return {
        headerTitle: 'Admin Portal',
        sidebar: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <NavItem
              icon="📊"
              label="Analytics"
              active={isActive('/admin/analytics')}
              onClick={() => onNavigate('/admin/analytics')}
            />
            <NavItem
              icon="🏢"
              label="Businesses"
              active={isActive('/admin/businesses')}
              onClick={() => onNavigate('/admin/businesses')}
            />
            <NavItem
              icon="👥"
              label="Users"
              active={isActive('/admin/users')}
              onClick={() => onNavigate('/admin/users')}
            />
            <NavItem
              icon="📋"
              label="Orders"
              active={isActive('/business/orders')}
              onClick={() => onNavigate('/business/orders')}
            />
          </div>
        ),
        bottomNav: null,
      };

    case 'client':
    case 'user':
    case 'customer':
    default:
      return {
        headerTitle: 'Store',
        sidebar: null,
        bottomNav: (
          <div style={{ display: 'flex' }}>
            <BottomNavItem
              icon="🏪"
              label="Shop"
              active={isActive('/store/catalog')}
              onClick={() => onNavigate('/store/catalog')}
            />
            <BottomNavItem
              icon="🔍"
              label="Search"
              active={isActive('/store/search')}
              onClick={() => onNavigate('/store/search')}
            />
            <BottomNavItem
              icon="📋"
              label="Orders"
              active={isActive('/store/orders')}
              onClick={() => onNavigate('/store/orders')}
            />
            <BottomNavItem
              icon="👤"
              label="Account"
              active={isActive('/store/profile')}
              onClick={() => onNavigate('/store/profile')}
            />
          </div>
        ),
      };
  }
}
