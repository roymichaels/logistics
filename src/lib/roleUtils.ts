import { UserRole } from '../shells/types';

export const BUSINESS_SCOPED_ROLES: UserRole[] = [
  'business_owner',
  'manager',
  'warehouse',
  'dispatcher',
  'sales',
  'customer_service'
];

export function isBusinessScopedRole(role: UserRole | null | undefined): boolean {
  if (!role) return false;
  return BUSINESS_SCOPED_ROLES.includes(role);
}

export function requiresBusinessContext(role: UserRole | null | undefined): boolean {
  return isBusinessScopedRole(role);
}
