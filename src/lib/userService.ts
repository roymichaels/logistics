import { getSupabase } from './supabaseClient';
import { AuthUser } from './authService';

export interface UserProfile extends AuthUser {
  created_at?: string;
  updated_at?: string;
  business_id?: string | null;
  session_token?: string | null;
  session_expires_at?: string | null;
  last_login?: string | null;
  login_count?: number;
  primary_business?: {
    id: string;
    name: string;
    type: string;
  } | null;
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
      .select(`
        id,
        telegram_id,
        username,
        name,
        photo_url,
        role,
        business_id,
        created_at,
        updated_at,
        last_login,
        login_count,
        is_online,
        last_active
      `)
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('❌ Failed to fetch user profile:', error);
      throw new Error(`Failed to fetch user profile: ${error.message}`);
    }

    if (!data) {
      throw new Error('User profile not found');
    }

    let profile = data as UserProfile;

    if (data.business_id) {
      const primaryBusiness = await this.getPrimaryBusiness(userId);
      profile = {
        ...profile,
        primary_business: primaryBusiness,
      };
    }

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
      .select(`
        id,
        telegram_id,
        username,
        name,
        photo_url,
        role,
        business_id,
        created_at,
        updated_at,
        last_login,
        login_count,
        is_online,
        last_active
      `)
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (error) {
      console.error('❌ Failed to fetch user profile:', error);
      throw new Error(`Failed to fetch user profile: ${error.message}`);
    }

    if (!data) {
      throw new Error('User profile not found');
    }

    let profile = data as UserProfile;

    if (data.business_id) {
      const primaryBusiness = await this.getPrimaryBusiness(data.id);
      profile = {
        ...profile,
        primary_business: primaryBusiness,
      };
    }

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

    const allowedFields = ['username', 'name', 'photo_url', 'business_id'];
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
      .select(`
        id,
        telegram_id,
        username,
        name,
        photo_url,
        role,
        business_id,
        created_at,
        updated_at,
        last_login,
        login_count
      `)
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

  async updateUserSession(telegramId: string, sessionToken: string, durationHours = 24): Promise<void> {
    console.log('🔐 Updating user session:', telegramId);
    const supabase = getSupabase();

    const { error } = await supabase.rpc('update_user_session', {
      p_telegram_id: telegramId,
      p_session_token: sessionToken,
      p_session_duration_hours: durationHours,
    });

    if (error) {
      console.error('❌ Failed to update user session:', error);
      throw new Error(`Failed to update user session: ${error.message}`);
    }

    this.clearCache();
    console.log('✅ User session updated');
  }

  async validateSession(sessionToken: string): Promise<UserProfile | null> {
    console.log('🔐 Validating user session');
    const supabase = getSupabase();

    const { data, error } = await supabase.rpc('validate_user_session', {
      p_session_token: sessionToken,
    });

    if (error || !data || !data[0]?.is_valid) {
      console.log('❌ Session validation failed');
      return null;
    }

    const sessionData = data[0];
    return this.getUserProfile(sessionData.user_id, true);
  }

  async invalidateSession(telegramId: string): Promise<void> {
    console.log('🔐 Invalidating user session:', telegramId);
    const supabase = getSupabase();

    const { error } = await supabase.rpc('invalidate_user_session', {
      p_telegram_id: telegramId,
    });

    if (error) {
      console.error('❌ Failed to invalidate user session:', error);
      throw new Error(`Failed to invalidate user session: ${error.message}`);
    }

    this.clearCache();
    console.log('✅ User session invalidated');
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

  async getPrimaryBusiness(userId: string): Promise<{ id: string; name: string; type: string } | null> {
    console.log('🏢 Fetching primary business for user:', userId);
    const supabase = getSupabase();

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !userData?.business_id) {
      return null;
    }

    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, type')
      .eq('id', userData.business_id)
      .maybeSingle();

    if (businessError || !businessData) {
      return null;
    }

    console.log('✅ Primary business found:', businessData.name);
    return businessData as { id: string; name: string; type: string };
  }
}

export const userService = new UserService();
