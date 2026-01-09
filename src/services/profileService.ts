import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export interface UserProfileData {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  phone: string | null;
  bio: string | null;
  tagline: string | null;
  location: string | null;
  website: string | null;
  avatar_url: string | null;
  photo_url: string | null;
  banner_url: string | null;
  role: string;
  wallet_address: string | null;
  wallet_type: string | null;
  is_verified: boolean;
  profile_visibility: 'public' | 'followers' | 'private';
  interests: string[];
  skills: string[];
  social_links: Record<string, string>;
  hide_followers: boolean;
  hide_following: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileStats {
  posts_count: number;
  media_posts_count: number;
  followers_count: number;
  following_count: number;
  total_likes_received: number;
  total_comments_received: number;
  total_reposts_received: number;
  total_likes_given: number;
  total_comments_given: number;
  profile_views_count: number;
  profile_views_this_week: number;
  profile_views_this_month: number;
  last_post_at: string | null;
  last_active_at: string;
  profile_completeness_percentage: number;
}

export interface Achievement {
  id: string;
  achievement_type: string;
  achievement_name: string;
  achievement_description: string | null;
  achievement_icon: string | null;
  achievement_tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  is_rare: boolean;
  is_visible: boolean;
  earned_at: string;
  metadata: Record<string, any>;
}

export interface CompleteProfile extends UserProfileData {
  stats: ProfileStats;
  achievements: Achievement[];
}

export class ProfileService {
  async getUserProfile(userId: string): Promise<UserProfileData | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        logger.error('[ProfileService] Failed to get user profile:', error);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('[ProfileService] Error getting user profile:', error);
      return null;
    }
  }

  async getUserProfileByUsername(username: string): Promise<UserProfileData | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (error) {
        logger.error('[ProfileService] Failed to get user profile by username:', error);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('[ProfileService] Error getting user profile by username:', error);
      return null;
    }
  }

  async getProfileStats(userId: string): Promise<ProfileStats | null> {
    try {
      const { data, error } = await supabase
        .from('user_profile_stats')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        logger.error('[ProfileService] Failed to get profile stats:', error);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('[ProfileService] Error getting profile stats:', error);
      return null;
    }
  }

  async getUserAchievements(userId: string, visibleOnly = true): Promise<Achievement[]> {
    try {
      let query = supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (visibleOnly) {
        query = query.eq('is_visible', true);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('[ProfileService] Failed to get user achievements:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('[ProfileService] Error getting user achievements:', error);
      return [];
    }
  }

  async getCompleteProfile(userId: string): Promise<CompleteProfile | null> {
    try {
      const [profile, stats, achievements] = await Promise.all([
        this.getUserProfile(userId),
        this.getProfileStats(userId),
        this.getUserAchievements(userId),
      ]);

      if (!profile) {
        return null;
      }

      return {
        ...profile,
        stats: stats || this.getDefaultStats(),
        achievements: achievements || [],
      };
    } catch (error) {
      logger.error('[ProfileService] Error getting complete profile:', error);
      return null;
    }
  }

  async updateProfile(userId: string, updates: Partial<UserProfileData>): Promise<void> {
    try {
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      // Only include provided fields
      const allowedFields = [
        'name', 'username', 'bio', 'tagline', 'location', 'website',
        'photo_url', 'avatar_url', 'banner_url', 'profile_visibility',
        'interests', 'skills', 'social_links', 'hide_followers', 'hide_following'
      ];

      for (const field of allowedFields) {
        if (field in updates) {
          updateData[field] = updates[field as keyof UserProfileData];
        }
      }

      // Sync photo_url and avatar_url
      if ('photo_url' in updates) {
        updateData.avatar_url = updates.photo_url;
      }
      if ('avatar_url' in updates) {
        updateData.photo_url = updates.avatar_url;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        logger.error('[ProfileService] Failed to update profile:', error);
        throw error;
      }

      // Update profile stats after profile change
      await this.updateProfileStats(userId);

      logger.info('[ProfileService] Profile updated successfully');
    } catch (error) {
      logger.error('[ProfileService] Error updating profile:', error);
      throw error;
    }
  }

  async updateProfileStats(userId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('update_profile_stats', {
        user_uuid: userId,
      });

      if (error) {
        logger.error('[ProfileService] Failed to update profile stats:', error);
        throw error;
      }

      logger.info('[ProfileService] Profile stats updated successfully');
    } catch (error) {
      logger.error('[ProfileService] Error updating profile stats:', error);
      throw error;
    }
  }

  async recordProfileView(
    profileId: string,
    viewerId?: string,
    viewerIp?: string,
    referrer?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('record_profile_view', {
        p_profile_id: profileId,
        p_viewer_id: viewerId || null,
        p_viewer_ip: viewerIp || null,
        p_referrer: referrer || null,
        p_user_agent: userAgent || null,
      });

      if (error) {
        logger.error('[ProfileService] Failed to record profile view:', error);
      }
    } catch (error) {
      logger.error('[ProfileService] Error recording profile view:', error);
    }
  }

  async getProfileViews(profileId: string, limit = 50): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('profile_views')
        .select('*, viewer:profiles!viewer_id(*)')
        .eq('profile_id', profileId)
        .order('viewed_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('[ProfileService] Failed to get profile views:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('[ProfileService] Error getting profile views:', error);
      return [];
    }
  }

  async grantAchievement(
    userId: string,
    achievementType: string,
    achievementName: string,
    description?: string,
    icon?: string,
    tier: Achievement['achievement_tier'] = 'bronze',
    isRare = false
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_type: achievementType,
          achievement_name: achievementName,
          achievement_description: description,
          achievement_icon: icon,
          achievement_tier: tier,
          is_rare: isRare,
        });

      if (error && error.code !== '23505') { // Ignore unique constraint errors
        logger.error('[ProfileService] Failed to grant achievement:', error);
        throw error;
      }

      logger.info('[ProfileService] Achievement granted:', achievementName);
    } catch (error) {
      logger.error('[ProfileService] Error granting achievement:', error);
    }
  }

  async toggleAchievementVisibility(achievementId: string, isVisible: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_achievements')
        .update({ is_visible: isVisible })
        .eq('id', achievementId);

      if (error) {
        logger.error('[ProfileService] Failed to toggle achievement visibility:', error);
        throw error;
      }

      logger.info('[ProfileService] Achievement visibility toggled');
    } catch (error) {
      logger.error('[ProfileService] Error toggling achievement visibility:', error);
      throw error;
    }
  }

  async uploadProfilePhoto(userId: string, file: File): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        logger.error('[ProfileService] Failed to upload profile photo:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      await this.updateProfile(userId, { photo_url: publicUrl });

      return publicUrl;
    } catch (error) {
      logger.error('[ProfileService] Error uploading profile photo:', error);
      throw error;
    }
  }

  async uploadBannerPhoto(userId: string, file: File): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-banner-${Date.now()}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        logger.error('[ProfileService] Failed to upload banner photo:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      await this.updateProfile(userId, { banner_url: publicUrl });

      return publicUrl;
    } catch (error) {
      logger.error('[ProfileService] Error uploading banner photo:', error);
      throw error;
    }
  }

  async searchProfiles(
    query: string,
    filters?: {
      role?: string;
      verified?: boolean;
      location?: string;
    },
    limit = 20
  ): Promise<UserProfileData[]> {
    try {
      let dbQuery = supabase
        .from('profiles')
        .select('*')
        .eq('profile_visibility', 'public')
        .or(`name.ilike.%${query}%,username.ilike.%${query}%,bio.ilike.%${query}%`)
        .limit(limit);

      if (filters?.role) {
        dbQuery = dbQuery.eq('role', filters.role);
      }

      if (filters?.verified !== undefined) {
        dbQuery = dbQuery.eq('is_verified', filters.verified);
      }

      if (filters?.location) {
        dbQuery = dbQuery.ilike('location', `%${filters.location}%`);
      }

      const { data, error } = await dbQuery;

      if (error) {
        logger.error('[ProfileService] Failed to search profiles:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('[ProfileService] Error searching profiles:', error);
      return [];
    }
  }

  async isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('profiles')
        .select('id')
        .eq('username', username);

      if (excludeUserId) {
        query = query.neq('id', excludeUserId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        logger.error('[ProfileService] Failed to check username availability:', error);
        return false;
      }

      return !data;
    } catch (error) {
      logger.error('[ProfileService] Error checking username availability:', error);
      return false;
    }
  }

  private getDefaultStats(): ProfileStats {
    return {
      posts_count: 0,
      media_posts_count: 0,
      followers_count: 0,
      following_count: 0,
      total_likes_received: 0,
      total_comments_received: 0,
      total_reposts_received: 0,
      total_likes_given: 0,
      total_comments_given: 0,
      profile_views_count: 0,
      profile_views_this_week: 0,
      profile_views_this_month: 0,
      last_post_at: null,
      last_active_at: new Date().toISOString(),
      profile_completeness_percentage: 0,
    };
  }
}

export const profileService = new ProfileService();
