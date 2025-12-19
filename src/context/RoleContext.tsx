import React, { createContext, useContext, ReactNode } from 'react';
import { UserRole } from '../shells/types';

export interface RoleContextValue {
  role: UserRole | null;
  canAccess: (requiredRoles: UserRole[]) => boolean;
  isRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  hasAllRoles: (roles: UserRole[]) => boolean;
}

const RoleContextAPI = createContext<RoleContextValue | undefined>(undefined);

interface RoleContextProviderProps {
  children: ReactNode;
  role: UserRole | null;
}

export function RoleContextProvider({ children, role }: RoleContextProviderProps) {
  const value: RoleContextValue = {
    role,
    canAccess: (requiredRoles: UserRole[]) => {
      return role !== null && requiredRoles.includes(role);
    },
    isRole: (checkRole: UserRole) => {
      return role === checkRole;
    },
    hasAnyRole: (roles: UserRole[]) => {
      return role !== null && roles.includes(role);
    },
    hasAllRoles: (roles: UserRole[]) => {
      // For single-role system, this is same as hasAnyRole
      return role !== null && roles.includes(role);
    }
  };

  return (
    <RoleContextAPI.Provider value={value}>
      {children}
    </RoleContextAPI.Provider>
  );
}

export function useRoleContext() {
  const context = useContext(RoleContextAPI);
  if (!context) {
    throw new Error('useRoleContext must be used within RoleContextProvider');
  }
  return context;
}

export function useCurrentRole(): UserRole | null {
  const { role } = useRoleContext();
  return role;
}

export function useCanAccess(requiredRoles: UserRole[]): boolean {
  const { canAccess } = useRoleContext();
  return canAccess(requiredRoles);
}

export function useIsRole(role: UserRole): boolean {
  const { isRole } = useRoleContext();
  return isRole(role);
}
