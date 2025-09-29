import { DataStore, User } from '../../data/types';

export interface UserRegistration {
  telegram_id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  role: 'manager' | 'dispatcher' | 'driver' | 'warehouse' | 'sales' | 'customer_service';
  department?: string;
  phone?: string;
  approved: boolean;
  created_at: string;
  approved_by?: string;
  approved_at?: string;
}

class UserManager {
  private registeredUsers: Map<string, UserRegistration> = new Map();
  private adminTelegramId: string;

  constructor() {
    // Get first admin from environment or default
    this.adminTelegramId = import.meta.env.VITE_FIRST_ADMIN_TELEGRAM_ID || '123456789';
    this.loadRegisteredUsers();
  }

  private loadRegisteredUsers() {
    try {
      const stored = localStorage.getItem('registered_users');
      if (stored) {
        const users = JSON.parse(stored);
        this.registeredUsers = new Map(Object.entries(users));
      }
    } catch (error) {
      console.error('Failed to load registered users:', error);
    }
  }

  private saveRegisteredUsers() {
    try {
      const users = Object.fromEntries(this.registeredUsers);
      localStorage.setItem('registered_users', JSON.stringify(users));
    } catch (error) {
      console.error('Failed to save registered users:', error);
    }
  }

  isFirstAdmin(telegramId: string): boolean {
    return telegramId === this.adminTelegramId;
  }

  isUserRegistered(telegramId: string): boolean {
    return this.registeredUsers.has(telegramId);
  }

  isUserApproved(telegramId: string): boolean {
    const user = this.registeredUsers.get(telegramId);
    return user?.approved || false;
  }

  registerUser(userData: any): UserRegistration {
    const telegramId = userData.telegram_id.toString();
    
    // Check if user already exists
    if (this.registeredUsers.has(telegramId)) {
      return this.registeredUsers.get(telegramId)!;
    }

    // Create new user registration
    const registration: UserRegistration = {
      telegram_id: telegramId,
      first_name: userData.first_name,
      last_name: userData.last_name,
      username: userData.username,
      photo_url: userData.photo_url,
      role: 'driver', // Default role
      approved: this.isFirstAdmin(telegramId), // Auto-approve first admin
      created_at: new Date().toISOString(),
      approved_by: this.isFirstAdmin(telegramId) ? telegramId : undefined,
      approved_at: this.isFirstAdmin(telegramId) ? new Date().toISOString() : undefined
    };

    this.registeredUsers.set(telegramId, registration);
    this.saveRegisteredUsers();

    return registration;
  }

  approveUser(telegramId: string, role: string, approvedBy: string): boolean {
    const user = this.registeredUsers.get(telegramId);
    if (!user) return false;

    user.approved = true;
    user.role = role as any;
    user.approved_by = approvedBy;
    user.approved_at = new Date().toISOString();

    this.registeredUsers.set(telegramId, user);
    this.saveRegisteredUsers();

    return true;
  }

  updateUserRole(telegramId: string, role: string, updatedBy: string): boolean {
    const user = this.registeredUsers.get(telegramId);
    if (!user || !user.approved) return false;

    user.role = role as any;
    this.registeredUsers.set(telegramId, user);
    this.saveRegisteredUsers();

    return true;
  }

  getPendingUsers(): UserRegistration[] {
    return Array.from(this.registeredUsers.values())
      .filter(user => !user.approved)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getAllUsers(): UserRegistration[] {
    return Array.from(this.registeredUsers.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getApprovedUsers(): UserRegistration[] {
    return Array.from(this.registeredUsers.values())
      .filter(user => user.approved)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getUserRegistration(telegramId: string): UserRegistration | null {
    return this.registeredUsers.get(telegramId) || null;
  }

  deleteUser(telegramId: string): boolean {
    if (this.isFirstAdmin(telegramId)) {
      return false; // Cannot delete first admin
    }

    const deleted = this.registeredUsers.delete(telegramId);
    if (deleted) {
      this.saveRegisteredUsers();
    }
    return deleted;
  }
}

export const userManager = new UserManager();