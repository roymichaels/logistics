import React from 'react';

export type UserRole =
  | 'infrastructure_owner'
  | 'business_owner'
  | 'manager'
  | 'warehouse'
  | 'dispatcher'
  | 'sales'
  | 'customer_service'
  | 'driver'
  | 'customer'
  | 'user';

export type ShellType = 'admin' | 'business' | 'driver' | 'store';

export interface ShellConfig {
  type: ShellType;
  role: UserRole;
  title: string;
  theme?: 'light' | 'dark' | 'auto';
}

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  badge?: number | string;
  children?: NavigationItem[];
  visible?: boolean;
  requiredRoles?: UserRole[];
}

export interface ShellContextValue {
  role: UserRole | null;
  shellType: ShellType;
  config: ShellConfig | null;
  navigationItems: NavigationItem[];
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export const ShellContext = React.createContext<ShellContextValue | undefined>(undefined);
