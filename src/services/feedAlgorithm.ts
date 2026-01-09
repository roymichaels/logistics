import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export interface FeedPost {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  engagement_score?: number;
  relevance_score?: number;
  final_score?: number;
}

export interface FeedPreferences {
  user_id: string;
  feed_algorithm: 'chronological' | 'balanced' | 'engagement' | 'discovery';
  show_suggested_posts: boolean;
  show_ads: boolean;
  content_sensitivity: 'less' | 'normal' | 'more';
  autoplay_videos: boolean;
  mute_by_default: boolean;
  hide_like_counts: boolean;
  snooze_keywords: string[];
  favorite_categories: string[];
}

export interface ContentInteraction {
  user_id: string;
  content_type: 'post' | 'story' | 'product' | 'business' | 'profile';
  content_id: string;
  interaction_type: 'view' | 'like' | 'comment' | 'share' | 'save' | 'click' | 'dwell' | 'skip';
  dwell_time_seconds?: number;
  scroll_depth_percent?: number;
  interaction_context?: any;
}

export interface TrendingTopic {
  id: string;
  topic_type: 'hashtag' | 'keyword' | 'business' | 'product_category';
  topic_value: string;
  mention_count: number;
  engagement_count: number;
  velocity_score: number;
  geographic_region?: string;
  category?: string;
}

export class FeedAlgorithmService {
  async getPersonalizedFeed(limit: number = 20, offset: number = 0): Promise<FeedPost[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return await this.getPublicFeed(limit, offset);

      const preferences = await this.getUserFeedPreferences();

      switch (preferences?.feed_algorithm) {
        case 'chronological':
          return await this.getChronologicalFeed(limit, offset);
        case 'engagement':
          return await this.getEngagementFeed(limit, offset);
        case 'discovery':
          return await this.getDiscoveryFeed(limit, offset);
        case 'balanced':
        default:
          return await this.getBalancedFeed(limit, offset);
      }
    } catch (error) {
      logger.error('Failed to fetch personalized feed', { error });
      return [];
    }
  }

  private async getChronologicalFeed(limit: number, offset: number): Promise<FeedPost[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:author_id (id, username, full_name, avatar_url)
        `)
        .or(`visibility.eq.public${user ? `,author_id.eq.${user.id}` : ''}`)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch chronological feed', { error });
      return [];
    }
  }

  private async getEngagementFeed(limit: number, offset: number): Promise<FeedPost[]> {
    try {
      const { data, error } = await supabase.rpc('get_engagement_ranked_feed', {
        p_limit: limit,
        p_offset: offset
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch engagement feed', { error });
      return await this.getChronologicalFeed(limit, offset);
    }
  }

  private async getBalancedFeed(limit: number, offset: number): Promise<FeedPost[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return await this.getChronologicalFeed(limit, offset);

      const { data, error } = await supabase.rpc('get_balanced_feed', {
        p_user_id: user.id,
        p_limit: limit,
        p_offset: offset
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch balanced feed', { error });
      return await this.getChronologicalFeed(limit, offset);
    }
  }

  private async getDiscoveryFeed(limit: number, offset: number): Promise<FeedPost[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return await this.getChronologicalFeed(limit, offset);

      const { data, error } = await supabase.rpc('get_discovery_feed', {
        p_user_id: user.id,
        p_limit: limit,
        p_offset: offset
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch discovery feed', { error });
      return await this.getChronologicalFeed(limit, offset);
    }
  }

  private async getPublicFeed(limit: number, offset: number): Promise<FeedPost[]> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:author_id (id, username, full_name, avatar_url)
        `)
        .eq('visibility', 'public')
        .is('deleted_at', null)
        .order('likes_count', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch public feed', { error });
      return [];
    }
  }

  async getUserFeedPreferences(): Promise<FeedPreferences | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('feed_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      logger.error('Failed to fetch feed preferences', { error });
      return null;
    }
  }

  async updateFeedPreferences(preferences: Partial<FeedPreferences>): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('feed_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
        });

      if (error) throw error;
      logger.info('Feed preferences updated');
    } catch (error) {
      logger.error('Failed to update feed preferences', { error });
      throw error;
    }
  }

  async trackInteraction(interaction: ContentInteraction): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('content_interactions')
        .insert({
          user_id: user.id,
          ...interaction,
        });

      if (interaction.interaction_type === 'like' ||
          interaction.interaction_type === 'comment' ||
          interaction.interaction_type === 'share') {
        await this.updateEngagementScore(interaction.content_type, interaction.content_id);
      }

      if (interaction.content_type === 'profile') {
        const contentUserId = interaction.content_id;
        await this.updateRelationshipStrength(user.id, contentUserId);
      }
    } catch (error) {
      logger.error('Failed to track interaction', { error });
    }
  }

  private async updateEngagementScore(contentType: string, contentId: string): Promise<void> {
    try {
      await supabase.rpc('recalculate_engagement_score', {
        p_content_type: contentType,
        p_content_id: contentId
      });
    } catch (error) {
      logger.error('Failed to update engagement score', { error });
    }
  }

  private async updateRelationshipStrength(userId: string, relatedUserId: string): Promise<void> {
    try {
      await supabase.rpc('update_relationship_strength', {
        p_user_id: userId,
        p_related_user_id: relatedUserId
      });
    } catch (error) {
      logger.error('Failed to update relationship strength', { error });
    }
  }

  async getTrendingTopics(limit: number = 10, region?: string): Promise<TrendingTopic[]> {
    try {
      let query = supabase
        .from('trending_topics')
        .select('*')
        .order('velocity_score', { ascending: false })
        .limit(limit);

      if (region) {
        query = query.eq('geographic_region', region);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch trending topics', { error });
      return [];
    }
  }

  async getUserRecommendations(type?: string, limit: number = 10): Promise<any[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('user_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_dismissed', false)
        .gt('expires_at', new Date().toISOString())
        .order('recommendation_score', { ascending: false })
        .limit(limit);

      if (type) {
        query = query.eq('recommendation_type', type);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch user recommendations', { error });
      return [];
    }
  }

  async dismissRecommendation(recommendationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_recommendations')
        .update({ is_dismissed: true })
        .eq('id', recommendationId);

      if (error) throw error;
      logger.info('Recommendation dismissed', { recommendationId });
    } catch (error) {
      logger.error('Failed to dismiss recommendation', { error });
    }
  }

  async exploreContent(interests?: string[], limit: number = 20): Promise<FeedPost[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles:author_id (id, username, full_name, avatar_url)
        `)
        .eq('visibility', 'public')
        .is('deleted_at', null)
        .order('likes_count', { ascending: false })
        .limit(limit);

      if (interests && interests.length > 0) {
        query = query.overlaps('hashtags', interests);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch explore content', { error });
      return [];
    }
  }
}

export const feedAlgorithmService = new FeedAlgorithmService();
