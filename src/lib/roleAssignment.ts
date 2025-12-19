import { localSessionManager } from './localSessionManager';
import { logger } from './logger';

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

export interface RoleAssignment {
  walletAddress: string;
  role: UserRole;
  assignedAt: number;
  assignedBy?: string;
}

const ADMIN_ROLE_ASSIGNMENTS_KEY = 'admin-role-assignments';

export class RoleAssignmentManager {
  assignRoleToWallet(walletAddress: string, role: UserRole, adminWallet?: string): void {
    const now = Date.now();
    const assignment: RoleAssignment = {
      walletAddress: walletAddress.toLowerCase(),
      role,
      assignedAt: now,
      assignedBy: adminWallet,
    };

    localSessionManager.assignRoleToWallet(walletAddress, role);

    try {
      const assignments = this.getAllAssignments();
      assignments[walletAddress.toLowerCase()] = assignment;
      localStorage.setItem(ADMIN_ROLE_ASSIGNMENTS_KEY, JSON.stringify(assignments));
      logger.info(`[ADMIN] Role assignment updated: ${walletAddress} → ${role}`);
    } catch (error) {
      logger.error('[ADMIN] Failed to save role assignment', error);
    }
  }

  getRoleForWallet(walletAddress: string): UserRole | null {
    const role = localSessionManager.loadRoleForWallet(walletAddress);
    return (role as UserRole) || null;
  }

  getAllAssignments(): Record<string, RoleAssignment> {
    try {
      const stored = localStorage.getItem(ADMIN_ROLE_ASSIGNMENTS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      logger.error('[ADMIN] Failed to load assignments', error);
      return {};
    }
  }

  revokeRole(walletAddress: string): void {
    try {
      const assignments = this.getAllAssignments();
      delete assignments[walletAddress.toLowerCase()];
      localStorage.setItem(ADMIN_ROLE_ASSIGNMENTS_KEY, JSON.stringify(assignments));
      localSessionManager.assignRoleToWallet(walletAddress, 'customer');
      logger.info(`[ADMIN] Role revoked for ${walletAddress}, defaulting to "customer"`);
    } catch (error) {
      logger.error('[ADMIN] Failed to revoke role', error);
    }
  }

  isAdmin(walletAddress: string): boolean {
    const role = this.getRoleForWallet(walletAddress);
    return role === 'infrastructure_owner';
  }

  isBusiness(walletAddress: string): boolean {
    const role = this.getRoleForWallet(walletAddress);
    return ['business_owner', 'manager', 'warehouse', 'dispatcher', 'sales', 'customer_service'].includes(role || '');
  }

  isDriver(walletAddress: string): boolean {
    const role = this.getRoleForWallet(walletAddress);
    return role === 'driver';
  }
}

export const roleAssignmentManager = new RoleAssignmentManager();
