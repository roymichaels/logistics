import { UserRole } from '../../shells/types';
import { canAccessRoute, canViewResource, canEditResource, canCreateResource, canDeleteResource, hasPermission } from './PermissionMatrix';
import { logger } from '../logger';

export class RoleAccessControl {
  private static instance: RoleAccessControl;
  private currentRole: UserRole | null = null;

  private constructor() {}

  static getInstance(): RoleAccessControl {
    if (!RoleAccessControl.instance) {
      RoleAccessControl.instance = new RoleAccessControl();
    }
    return RoleAccessControl.instance;
  }

  setRole(role: UserRole | null): void {
    this.currentRole = role;
    logger.info('🔐 Role access control updated', { role });
  }

  getRole(): UserRole | null {
    return this.currentRole;
  }

  canAccess(path: string, role?: UserRole | null): boolean {
    const roleToCheck = role ?? this.currentRole;
    const result = canAccessRoute(roleToCheck, path);

    if (!result) {
      logger.warn('🚫 Access denied', { role: roleToCheck, path });
    }

    return result;
  }

  canView(resource: string, role?: UserRole | null): boolean {
    const roleToCheck = role ?? this.currentRole;
    return canViewResource(roleToCheck, resource);
  }

  canEdit(resource: string, role?: UserRole | null): boolean {
    const roleToCheck = role ?? this.currentRole;
    return canEditResource(roleToCheck, resource);
  }

  canCreate(resource: string, role?: UserRole | null): boolean {
    const roleToCheck = role ?? this.currentRole;
    return canCreateResource(roleToCheck, resource);
  }

  canDelete(resource: string, role?: UserRole | null): boolean {
    const roleToCheck = role ?? this.currentRole;
    return canDeleteResource(roleToCheck, resource);
  }

  hasPermission(permission: string, role?: UserRole | null): boolean {
    const roleToCheck = role ?? this.currentRole;
    return hasPermission(roleToCheck, permission);
  }

  assertAccess(path: string, role?: UserRole | null): void {
    if (!this.canAccess(path, role)) {
      throw new Error(`Access denied to ${path} for role ${role ?? this.currentRole}`);
    }
  }

  assertPermission(permission: string, role?: UserRole | null): void {
    if (!this.hasPermission(permission, role)) {
      throw new Error(`Permission denied: ${permission} for role ${role ?? this.currentRole}`);
    }
  }
}

export const roleAccessControl = RoleAccessControl.getInstance();
