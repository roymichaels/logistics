import { logger } from './logger';
import { getSupabase } from './supabaseClient';
import { AuthUser } from './authService';
import { CANONICAL_TO_LEGACY_ROLE } from './roleMappings';

export interface UserProfile extends AuthUser {
  created_at?: string;
  updated_at?: string;
}

class UserService {
  private profileCache: Map<string, { profile: UserProfile; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000;

  async getUserProfile(userId: string, forceRefresh = false): Promise<UserProfile> {
    if (!forceRefresh) {
      const cached = this.profileCache.get(userId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.profile;
      }
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('users')
      .select('id, username, name, photo_url, role, global_role, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      logger.error('❌ Failed to fetch user profile:', error);
      throw new Error(`Failed to fetch user profile: ${error.message}`);
    }

    if (!data) {
      throw new Error('User profile not found');
    }

    const profile = data as UserProfile;

    this.profileCache.set(userId, {
      profile,
      timestamp: Date.now(),
    });

    return profile;
  }

  async getUserProfileByWallet(walletAddress: string, forceRefresh = false): Promise<UserProfile> {
    const supabase = getSupabase();

    const lowerWallet = walletAddress.toLowerCase();
    const { data, error } = await supabase
      .from('users')
      .select('id, username, name, photo_url, role, global_role, created_at, updated_at')
      .or(`wallet_address_eth.eq.${lowerWallet},wallet_address_sol.eq.${lowerWallet}`)
      .maybeSingle();

    if (error) {
      logger.error('❌ Failed to fetch user profile:', error);
      throw new Error(`Failed to fetch user profile: ${error.message}`);
    }

    if (!data) {
      throw new Error('User profile not found');
    }

    const profile = data as UserProfile;

    this.profileCache.set(profile.id, {
      profile,
      timestamp: Date.now(),
    });

    return profile;
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const supabase = getSupabase();

    const allowedFields = ['username', 'name', 'photo_url'];
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key as keyof UserProfile];
        return obj;
      }, {} as any);

    const { data, error } = await supabase
      .from('users')
      .update({
        ...filteredUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('id, username, name, photo_url, role, global_role, created_at, updated_at')
      .single();

    if (error) {
      logger.error('❌ Failed to update user profile:', error);
      throw new Error(`Failed to update user profile: ${error.message}`);
    }

    const profile = data as UserProfile;

    this.profileCache.set(userId, {
      profile,
      timestamp: Date.now(),
    });

    return profile;
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
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('business_memberships')
      .select(`business_id, base_role_key, is_primary, is_active, business_name, business_type`)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('is_primary', { ascending: false });

    if (error) {
      logger.error('❌ Failed to fetch business memberships:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      business_id: row.business_id,
      role: CANONICAL_TO_LEGACY_ROLE[row.base_role_key] || row.base_role_key,
      is_primary: row.is_primary,
      active: row.is_active,
      business: {
        id: row.business_id,
        name: row.business_name,
        type: row.business_type,
      },
    }));
  }

  async getPrimaryBusiness(userId: string): Promise<any | null> {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('business_memberships')
      .select('business_id, business_name, business_type')
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('is_primary', true)
      .maybeSingle();

    if (error) {
      logger.error('❌ Failed to fetch primary business:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.business_id,
      name: data.business_name,
      type: data.business_type,
    };
  }
}

export const userService = new UserService();
