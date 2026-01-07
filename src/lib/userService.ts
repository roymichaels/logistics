import { logger } from './logger';
import { supabase } from './supabase';
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

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      logger.error('[UserService] Failed to fetch profile from Supabase', error);
      throw error;
    }

    if (!data) {
      logger.warn('[UserService] Profile not found in Supabase', { userId });
      throw new Error('Profile not found');
    }

    const profile: UserProfile = {
      id: data.id,
      username: data.username,
      name: data.name,
      role: data.role || 'user',
      global_role: data.role || 'user',
      wallet_address_eth: data.wallet_address_eth,
      wallet_address_sol: data.wallet_address_sol,
      phone: data.phone,
      avatar_url: data.avatar_url,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    this.profileCache.set(userId, {
      profile,
      timestamp: Date.now(),
    });

    return profile;
  }

  async getUserProfileByWallet(walletAddress: string, forceRefresh = false): Promise<UserProfile> {
    const lowerWallet = walletAddress.toLowerCase();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`wallet_address_eth.eq.${walletAddress},wallet_address_sol.eq.${walletAddress}`)
      .maybeSingle();

    if (error) {
      logger.error('[UserService] Failed to fetch profile by wallet from Supabase', error);
      throw error;
    }

    if (!data) {
      logger.warn('[UserService] No profile found for wallet', { walletAddress });
      throw new Error('Profile not found for wallet');
    }

    const profile: UserProfile = {
      id: data.id,
      username: data.username,
      name: data.name,
      role: data.role || 'user',
      global_role: data.role || 'user',
      wallet_address_eth: data.wallet_address_eth,
      wallet_address_sol: data.wallet_address_sol,
      phone: data.phone,
      avatar_url: data.avatar_url,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    this.profileCache.set(profile.id, {
      profile,
      timestamp: Date.now(),
    });

    return profile;
  }

  async createUserProfile(data: {
    username: string;
    name?: string;
    role?: string;
    wallet_address_eth?: string;
    wallet_address_sol?: string;
    phone?: string;
  }): Promise<UserProfile> {
    const { data: user } = await supabase.auth.getUser();

    const { data: profile, error } = await supabase
      .from('profiles')
      .insert({
        id: user?.user?.id,
        username: data.username,
        name: data.name || data.username,
        role: data.role || 'user',
        wallet_address_eth: data.wallet_address_eth,
        wallet_address_sol: data.wallet_address_sol,
        phone: data.phone,
      })
      .select()
      .single();

    if (error) {
      logger.error('[UserService] Failed to create profile in Supabase', error);
      throw error;
    }

    return {
      id: profile.id,
      username: profile.username,
      name: profile.name,
      role: profile.role,
      global_role: profile.role,
      wallet_address_eth: profile.wallet_address_eth,
      wallet_address_sol: profile.wallet_address_sol,
      phone: profile.phone,
      avatar_url: profile.avatar_url,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    };
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({
        username: updates.username,
        name: updates.name,
        role: updates.role,
        wallet_address_eth: updates.wallet_address_eth,
        wallet_address_sol: updates.wallet_address_sol,
        phone: updates.phone,
        avatar_url: updates.avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      logger.error('[UserService] Failed to update profile in Supabase', error);
      throw error;
    }

    this.profileCache.delete(userId);
    logger.info('[UserService] Profile updated successfully', { userId });
  }

  async listUsers(filters?: { role?: string; businessId?: string }): Promise<UserProfile[]> {
    let query = supabase.from('profiles').select('*');

    if (filters?.role) {
      query = query.eq('role', filters.role);
    }

    if (filters?.businessId) {
      query = query.eq('business_id', filters.businessId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      logger.error('[UserService] Failed to list users from Supabase', error);
      throw error;
    }

    return (data || []).map((profile) => ({
      id: profile.id,
      username: profile.username,
      name: profile.name,
      role: profile.role || 'user',
      global_role: profile.role || 'user',
      wallet_address_eth: profile.wallet_address_eth,
      wallet_address_sol: profile.wallet_address_sol,
      phone: profile.phone,
      avatar_url: profile.avatar_url,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    }));
  }

  clearCache(): void {
    this.profileCache.clear();
    logger.debug('[UserService] Profile cache cleared');
  }
}

export const userService = new UserService();
