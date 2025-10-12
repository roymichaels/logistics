import { getSupabase } from './supabaseClient';
import { AuthUser } from './authService';

export interface UserProfile extends AuthUser {
  created_at?: string;
  updated_at?: string;
  business_id?: string | null;
}

class UserService {
  private profileCache: Map<string, { profile: UserProfile; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000;

  async getUserProfile(userId: string, forceRefresh = false): Promise<UserProfile> {
    if (!forceRefresh) {
      const cached = this.profileCache.get(userId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        console.log('✅ Using cached profile for user:', userId);
        return cached.profile;
      }
    }

    console.log('🔍 Fetching user profile from database:', userId);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('users')
      .select('id, telegram_id, username, name, photo_url, role, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('❌ Failed to fetch user profile:', error);
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

    console.log('✅ User profile fetched:', profile.name || profile.username);
    return profile;
  }

  async getUserProfileByTelegramId(telegramId: string, forceRefresh = false): Promise<UserProfile> {
    console.log('🔍 Fetching user profile by telegram_id:', telegramId);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('users')
      .select('id, telegram_id, username, name, photo_url, role, created_at, updated_at')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (error) {
      console.error('❌ Failed to fetch user profile:', error);
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

    console.log('✅ User profile fetched:', profile.name || profile.username);
    return profile;
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    console.log('📝 Updating user profile:', userId);
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
      .select('id, telegram_id, username, name, photo_url, role, created_at, updated_at')
      .single();

    if (error) {
      console.error('❌ Failed to update user profile:', error);
      throw new Error(`Failed to update user profile: ${error.message}`);
    }

    const profile = data as UserProfile;

    this.profileCache.set(userId, {
      profile,
      timestamp: Date.now(),
    });

    console.log('✅ User profile updated');
    return profile;
  }

  async getUserRole(userId: string): Promise<string> {
    const profile = await this.getUserProfile(userId);
    return profile.role;
  }

  clearCache(userId?: string) {
    if (userId) {
      this.profileCache.delete(userId);
      console.log('🗑️ Cleared profile cache for user:', userId);
    } else {
      this.profileCache.clear();
      console.log('🗑️ Cleared all profile cache');
    }
  }

  async getBusinessMemberships(userId: string): Promise<any[]> {
    console.log('🏢 Fetching business memberships for user:', userId);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('business_users')
      .select(`
        business_id,
        role,
        is_primary,
        active,
        businesses:business_id (
          id,
          name,
          type
        )
      `)
      .eq('user_id', userId)
      .eq('active', true)
      .order('is_primary', { ascending: false });

    if (error) {
      console.error('❌ Failed to fetch business memberships:', error);
      return [];
    }

    console.log('✅ Found', data?.length || 0, 'business memberships');
    return data || [];
  }

  async getPrimaryBusiness(userId: string): Promise<any | null> {
    console.log('🏢 Fetching primary business for user:', userId);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('business_users')
      .select(`
        business_id,
        businesses:business_id (
          id,
          name,
          type
        )
      `)
      .eq('user_id', userId)
      .eq('active', true)
      .eq('is_primary', true)
      .maybeSingle();

    if (error) {
      console.error('❌ Failed to fetch primary business:', error);
      return null;
    }

    if (!data) {
      console.log('ℹ️ No primary business found');
      return null;
    }

    console.log('✅ Primary business found:', data.businesses?.name);
    return data.businesses;
  }
}

export const userService = new UserService();
