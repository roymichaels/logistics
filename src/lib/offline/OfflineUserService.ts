import { unifiedDataStore } from '../storage/UnifiedDataStore';
import { logger } from '../logger';
import type { User } from '../../data/types';

export class OfflineUserService {
  private static instance: OfflineUserService;

  private constructor() {}

  static getInstance(): OfflineUserService {
    if (!OfflineUserService.instance) {
      OfflineUserService.instance = new OfflineUserService();
    }
    return OfflineUserService.instance;
  }

  async getUser(userId: string): Promise<User | null> {
    try {
      const user = await unifiedDataStore.get<User>('users', userId);
      return user || null;
    } catch (error) {
      logger.error('Failed to get user', error as Error, { userId });
      return null;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const users = await unifiedDataStore.getAll<User>('users');
      return users;
    } catch (error) {
      logger.error('Failed to get all users', error as Error);
      return [];
    }
  }

  async createUser(user: Omit<User, 'id' | 'created_at'>): Promise<User | null> {
    try {
      const newUser: User = {
        ...user,
        id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        created_at: new Date().toISOString()
      } as User;

      await unifiedDataStore.set('users', newUser.id, newUser);
      logger.info('Created user offline', { userId: newUser.id });
      return newUser;
    } catch (error) {
      logger.error('Failed to create user', error as Error);
      return null;
    }
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    try {
      const existing = await this.getUser(userId);
      if (!existing) {
        logger.warn('User not found for update', { userId });
        return null;
      }

      const updated = { ...existing, ...updates };
      await unifiedDataStore.set('users', userId, updated);
      logger.info('Updated user offline', { userId });
      return updated;
    } catch (error) {
      logger.error('Failed to update user', error as Error, { userId });
      return null;
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      await unifiedDataStore.remove('users', userId);
      logger.info('Deleted user offline', { userId });
      return true;
    } catch (error) {
      logger.error('Failed to delete user', error as Error, { userId });
      return false;
    }
  }

  async searchUsers(query: string): Promise<User[]> {
    try {
      const allUsers = await this.getAllUsers();
      const lowerQuery = query.toLowerCase();

      return allUsers.filter(user => {
        const searchableFields = [
          user.email,
          user.full_name,
          user.telegram_username
        ];

        return searchableFields.some(field =>
          field?.toLowerCase().includes(lowerQuery)
        );
      });
    } catch (error) {
      logger.error('Failed to search users', error as Error, { query });
      return [];
    }
  }

  async getUsersByRole(role: string): Promise<User[]> {
    try {
      const allUsers = await this.getAllUsers();
      return allUsers.filter(user => user.role === role);
    } catch (error) {
      logger.error('Failed to get users by role', error as Error, { role });
      return [];
    }
  }
}

export const offlineUserService = OfflineUserService.getInstance();
