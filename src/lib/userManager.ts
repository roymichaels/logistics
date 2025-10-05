import type { User, UserRegistration } from '../../data/types';
import {
  approveUserRegistrationRecord,
  ApproveUserRegistrationInput,
  deleteUserRegistrationRecord,
  fetchUserRegistrationRecord,
  listUserRegistrationRecords,
  updateUserRegistrationRoleRecord,
  UpdateUserRegistrationRoleInput,
  upsertUserRegistrationRecord,
  UpsertUserRegistrationInput
} from './supabaseDataStore';

const VALID_ROLES: User['role'][] = [
  'infrastructure_owner',
  'business_owner',
  'manager',
  'dispatcher',
  'driver',
  'warehouse',
  'sales',
  'customer_service'
];

function normalizeRole(role?: string | null): User['role'] {
  if (role && (VALID_ROLES as string[]).includes(role)) {
    return role as User['role'];
  }
  return 'manager';
}

class UserManager {
  private adminUsername: string;

  constructor() {
    this.adminUsername = import.meta.env.VITE_FIRST_ADMIN_USERNAME?.toLowerCase().replace(/^@/, '') || 'dancohen';
  }

  isFirstAdmin(username: string): boolean {
    const normalizedUsername = username?.toLowerCase().replace(/^@/, '');
    return normalizedUsername === this.adminUsername;
  }

  async isUserRegistered(telegramId: string): Promise<boolean> {
    const registration = await fetchUserRegistrationRecord(telegramId);
    return Boolean(registration);
  }

  async isUserApproved(telegramId: string): Promise<boolean> {
    const registration = await fetchUserRegistrationRecord(telegramId);
    return registration?.status === 'approved';
  }

  async registerUser(userData: any): Promise<UserRegistration> {
    const telegramId = userData.telegram_id?.toString();

    if (!telegramId) {
      throw new Error('Cannot register user without telegram_id');
    }

    const payload: UpsertUserRegistrationInput = {
      telegram_id: telegramId,
      first_name: userData.first_name || 'משתמש',
      last_name: userData.last_name || null,
      username: userData.username || null,
      photo_url: userData.photo_url || null,
      department: userData.department || null,
      phone: userData.phone || null,
      requested_role: normalizeRole(userData.requested_role)
    };

    return upsertUserRegistrationRecord(payload);
  }

  async approveUser(
    telegramId: string,
    role: string,
    approvedBy: string,
    notes?: string
  ): Promise<boolean> {
    const assignedRole = normalizeRole(role);
    const payload: ApproveUserRegistrationInput = {
      approved_by: approvedBy,
      assigned_role: assignedRole,
      notes: notes ?? null
    };

    const registration = await approveUserRegistrationRecord(telegramId, payload);
    return registration.status === 'approved';
  }

  async updateUserRole(
    telegramId: string,
    role: string,
    updatedBy: string,
    notes?: string
  ): Promise<boolean> {
    const assignedRole = normalizeRole(role);
    const payload: UpdateUserRegistrationRoleInput = {
      assigned_role: assignedRole,
      updated_by: updatedBy,
      notes: notes ?? null
    };

    await updateUserRegistrationRoleRecord(telegramId, payload);
    return true;
  }

  async getPendingUsers(): Promise<UserRegistration[]> {
    return listUserRegistrationRecords({ status: 'pending' });
  }

  async getApprovedUsers(): Promise<UserRegistration[]> {
    return listUserRegistrationRecords({ status: 'approved' });
  }

  async getAllUsers(): Promise<UserRegistration[]> {
    return listUserRegistrationRecords();
  }

  async getUserRegistration(telegramId: string): Promise<UserRegistration | null> {
    return fetchUserRegistrationRecord(telegramId);
  }

  async deleteUser(telegramId: string): Promise<boolean> {
    if (this.isFirstAdmin(telegramId)) {
      return false;
    }

    return deleteUserRegistrationRecord(telegramId);
  }
}

export const userManager = new UserManager();

export type { UserRegistration } from '../../data/types';
