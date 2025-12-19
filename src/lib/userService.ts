import { logger } from './logger';
import { AuthUser } from './authService';
import { CANONICAL_TO_LEGACY_ROLE } from './roleMappings';

export interface UserProfile extends AuthUser {
  created_at?: string;
  updated_at?: string;
}

class UserService {
  private profileCache: Map<string, { profile: UserProfile; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000;
  private readonly LOCAL_USERS_KEY = 'local-users';

  private getLocalUsers(): Record<string, UserProfile> {
    try {
      const stored = localStorage.getItem(this.LOCAL_USERS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      logger.error('Failed to load local users', error);
      return {};
    }
  }

  private saveLocalUsers(users: Record<string, UserProfile>): void {
    try {
      localStorage.setItem(this.LOCAL_USERS_KEY, JSON.stringify(users));
    } catch (error) {
      logger.error('Failed to save local users', error);
    }
  }

  async getUserProfile(userId: string, forceRefresh = false): Promise<UserProfile> {
    if (userId && (userId.startsWith('0x') || userId.length > 40)) {
      logger.warn('Wallet address passed to getUserProfile, using wallet lookup instead', { userId });
      return this.getUserProfileByWallet(userId, forceRefresh);
    }

    if (!forceRefresh) {
      const cached = this.profileCache.get(userId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.profile;
      }
    }

    const users = this.getLocalUsers();
    const profile = users[userId];

    if (!profile) {
      const mockProfile: UserProfile = {
        id: userId,
        username: `user_${userId.substring(0, 8)}`,
        name: `User ${userId.substring(0, 8)}`,
        role: 'user',
        global_role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      users[userId] = mockProfile;
      this.saveLocalUsers(users);

      this.profileCache.set(userId, {
        profile: mockProfile,
        timestamp: Date.now(),
      });

      return mockProfile;
    }

    this.profileCache.set(userId, {
      profile,
      timestamp: Date.now(),
    });

    return profile;
  }

  async getUserProfileByWallet(walletAddress: string, forceRefresh = false): Promise<UserProfile> {
    const users = this.getLocalUsers();
    const lowerWallet = walletAddress.toLowerCase();

    const profile = Object.values(users).find(
      (u) =>
        u.wallet_address_eth?.toLowerCase() === lowerWallet ||
        u.wallet_address_sol?.toLowerCase() === lowerWallet
    );

    if (!profile) {
      const mockProfile: UserProfile = {
        id: `user_${lowerWallet.substring(0, 12)}`,
        username: `wallet_${lowerWallet.substring(0, 8)}`,
        name: `Wallet User ${lowerWallet.substring(0, 8)}`,
        wallet_address_eth: walletAddress.startsWith('0x') ? walletAddress : undefined,
        wallet_address_sol: !walletAddress.startsWith('0x') ? walletAddress : undefined,
        role: 'user',
        global_role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      users[mockProfile.id] = mockProfile;
      this.saveLocalUsers(users);

      this.profileCache.set(mockProfile.id, {
        profile: mockProfile,
        timestamp: Date.now(),
      });

      return mockProfile;
    }

    this.profileCache.set(profile.id, {
      profile,
      timestamp: Date.now(),
    });

    return profile;
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const users = this.getLocalUsers();
    const profile = users[userId];

    if (!profile) {
      throw new Error('User profile not found');
    }

    const allowedFields = ['username', 'name', 'photo_url'];
    const filteredUpdates = Object.keys(updates)
      .filter((key) => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key as keyof UserProfile];
        return obj;
      }, {} as any);

    const updatedProfile: UserProfile = {
      ...profile,
      ...filteredUpdates,
      updated_at: new Date().toISOString(),
    };

    users[userId] = updatedProfile;
    this.saveLocalUsers(users);

    this.profileCache.set(userId, {
      profile: updatedProfile,
      timestamp: Date.now(),
    });

    return updatedProfile;
  }

  async getUserRole(userId: string): Promise<string> {
    const profile = await this.getUserProfile(userId);
    return profile.role;
  }

  clearCache(userId?: string) {
    if (userId) {
      this.profileCache.delete(userId);
    } else {
      this.profileCache.clear();
    }
  }

  async getBusinessMemberships(userId: string): Promise<any[]> {
    logger.info('[LOCAL] getBusinessMemberships - returning empty array (local mode)');
    return [];
  }

  async getPrimaryBusiness(userId: string): Promise<any | null> {
    logger.info('[LOCAL] getPrimaryBusiness - returning null (local mode)');
    return null;
  }
}

export const userService = new UserService();
