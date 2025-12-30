import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { UserRole } from '../../shells/types';
import { roleAccessControl } from './RoleAccessControl';

interface PermissionContextValue {
  canAccess: (path: string) => boolean;
  canView: (resource: string) => boolean;
  canEdit: (resource: string) => boolean;
  canCreate: (resource: string) => boolean;
  canDelete: (resource: string) => boolean;
  hasPermission: (permission: string) => boolean;
  role: UserRole | null;
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

interface PermissionProviderProps {
  children: ReactNode;
  role: UserRole | null;
}

export function PermissionProvider({ children, role }: PermissionProviderProps) {
  useEffect(() => {
    roleAccessControl.setRole(role);
  }, [role]);

  const value: PermissionContextValue = {
    canAccess: (path: string) => roleAccessControl.canAccess(path),
    canView: (resource: string) => roleAccessControl.canView(resource),
    canEdit: (resource: string) => roleAccessControl.canEdit(resource),
    canCreate: (resource: string) => roleAccessControl.canCreate(resource),
    canDelete: (resource: string) => roleAccessControl.canDelete(resource),
    hasPermission: (permission: string) => roleAccessControl.hasPermission(permission),
    role
  };

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissions(): PermissionContextValue {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionProvider');
  }
  return context;
}
