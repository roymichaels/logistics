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
      .rpc('get_user_profile_by_id', { user_id: userId });

    if (error) {
      logger.error('[UserService] Failed to fetch profile from Supabase', error);
      throw error;
    }

    if (!data || data.length === 0) {
      logger.warn('[UserService] Profile not found in Supabase', { userId });
      throw new Error('Profile not found');
    }

    const profileData = Array.isArray(data) ? data[0] : data;

    const profile: UserProfile = {
      id: profileData.id,
      username: profileData.username,
      name: profileData.name,
      role: profileData.role || 'user',
      global_role: profileData.role || 'user',
      wallet_address_eth: profileData.wallet_type === 'eth' || profileData.wallet_type === 'ethereum' ? profileData.wallet_address : undefined,
      wallet_address_sol: profileData.wallet_type === 'sol' || profileData.wallet_type === 'solana' ? profileData.wallet_address : undefined,
      phone: profileData.phone,
      avatar_url: profileData.avatar_url,
      created_at: profileData.created_at,
      updated_at: profileData.updated_at,
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
      .rpc('get_profile_by_wallet', { wallet_addr: walletAddress });

    if (error) {
      logger.error('[UserService] Failed to fetch profile by wallet from Supabase', error);
      throw error;
    }

    if (!data || data.length === 0) {
      logger.warn('[UserService] No profile found for wallet', { walletAddress });
      throw new Error('Profile not found for wallet');
    }

    const profileData = Array.isArray(data) ? data[0] : data;

    const profile: UserProfile = {
      id: profileData.id,
      username: profileData.username,
      name: profileData.name,
      role: profileData.role || 'user',
      global_role: profileData.role || 'user',
      wallet_address_eth: profileData.wallet_type === 'eth' || profileData.wallet_type === 'ethereum' ? profileData.wallet_address : undefined,
      wallet_address_sol: profileData.wallet_type === 'sol' || profileData.wallet_type === 'solana' ? profileData.wallet_address : undefined,
      phone: profileData.phone,
      avatar_url: profileData.avatar_url,
      created_at: profileData.created_at,
      updated_at: profileData.updated_at,
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
    wallet_address?: string;
    wallet_type?: string;
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
        wallet_address: data.wallet_address,
        wallet_type: data.wallet_type,
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
      wallet_address_eth: profile.wallet_type === 'eth' || profile.wallet_type === 'ethereum' ? profile.wallet_address : undefined,
      wallet_address_sol: profile.wallet_type === 'sol' || profile.wallet_type === 'solana' ? profile.wallet_address : undefined,
      phone: profile.phone,
      avatar_url: profile.avatar_url,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    };
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.username !== undefined) updateData.username = updates.username;
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.avatar_url !== undefined) updateData.avatar_url = updates.avatar_url;

    if (updates.wallet_address_eth) {
      updateData.wallet_address = updates.wallet_address_eth;
      updateData.wallet_type = 'ethereum';
    } else if (updates.wallet_address_sol) {
      updateData.wallet_address = updates.wallet_address_sol;
      updateData.wallet_type = 'solana';
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      logger.error('[UserService] Failed to update profile in Supabase', error);
      throw error;
    }

    this.profileCache.delete(userId);
    logger.info('[UserService] Profile updated successfully', { userId });
  }

  async listUsers(filters?: { role?: string; businessId?: string }): Promise<UserProfile[]> {
    let userIds: string[] | null = null;

    if (filters?.businessId) {
      const { data: roles, error: rolesError } = await supabase
        .from('user_business_roles')
        .select('user_id')
        .eq('business_id', filters.businessId)
        .eq('active', true);

      if (rolesError) {
        logger.error('[UserService] Failed to fetch business roles', rolesError);
        throw rolesError;
      }

      userIds = (roles || []).map(r => r.user_id);

      if (userIds.length === 0) {
        return [];
      }
    }

    let query = supabase.from('profiles').select('*');

    if (filters?.role) {
      query = query.eq('role', filters.role);
    }

    if (userIds && userIds.length > 0) {
      query = query.in('id', userIds);
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
      wallet_address_eth: profile.wallet_type === 'eth' || profile.wallet_type === 'ethereum' ? profile.wallet_address : undefined,
      wallet_address_sol: profile.wallet_type === 'sol' || profile.wallet_type === 'solana' ? profile.wallet_address : undefined,
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
