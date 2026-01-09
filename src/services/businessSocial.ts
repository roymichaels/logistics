import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import type {
  BusinessReview,
  ReviewResponse,
  BusinessFollower,
  BusinessStats,
  PostSave,
  CreateReviewInput,
  UpdateReviewInput,
  CreateReviewResponseInput,
  ReviewFilters,
  ReviewSummary,
  RatingDistribution,
  EnhancedBusinessPost,
  BusinessProfile,
  NotificationPreferences
} from '../types/businessSocial';

export class BusinessSocialService {
  async getBusinessProfile(businessId: string): Promise<BusinessProfile | null> {
    try {
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .maybeSingle();

      if (businessError) throw businessError;
      if (!business) return null;

      const { data: stats } = await supabase
        .from('business_stats')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();

      const { data: isFollowing } = await supabase
        .from('business_followers')
        .select('id')
        .eq('business_id', businessId)
        .eq('follower_id', (await supabase.auth.getUser()).data.user?.id || '')
        .maybeSingle();

      return {
        ...business,
        stats: stats || undefined,
        is_following: !!isFollowing
      };
    } catch (error) {
      logger.error('[BusinessSocialService] Failed to get business profile:', error);
      throw error;
    }
  }

  async getBusinessStats(businessId: string): Promise<BusinessStats | null> {
    try {
      const { data, error } = await supabase
        .from('business_stats')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('[BusinessSocialService] Failed to get business stats:', error);
      throw error;
    }
  }

  async followBusiness(businessId: string, preferences?: NotificationPreferences): Promise<void> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('business_followers')
        .insert({
          business_id: businessId,
          follower_id: user.id,
          notification_preferences: preferences || { new_posts: true, promotions: true, new_products: false }
        });

      if (error) throw error;
      logger.info('[BusinessSocialService] Followed business:', businessId);
    } catch (error) {
      logger.error('[BusinessSocialService] Failed to follow business:', error);
      throw error;
    }
  }

  async unfollowBusiness(businessId: string): Promise<void> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('business_followers')
        .delete()
        .eq('business_id', businessId)
        .eq('follower_id', user.id);

      if (error) throw error;
      logger.info('[BusinessSocialService] Unfollowed business:', businessId);
    } catch (error) {
      logger.error('[BusinessSocialService] Failed to unfollow business:', error);
      throw error;
    }
  }

  async isFollowingBusiness(businessId: string): Promise<boolean> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return false;

      const { data, error } = await supabase
        .from('business_followers')
        .select('id')
        .eq('business_id', businessId)
        .eq('follower_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (error) {
      logger.error('[BusinessSocialService] Failed to check follow status:', error);
      return false;
    }
  }

  async getBusinessFollowers(businessId: string, limit = 50): Promise<BusinessFollower[]> {
    try {
      const { data, error } = await supabase
        .from('business_followers')
        .select('*, follower:profiles!follower_id(id, name, photo_url)')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('[BusinessSocialService] Failed to get followers:', error);
      throw error;
    }
  }

  async createReview(input: CreateReviewInput): Promise<BusinessReview> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('business_reviews')
        .insert({
          business_id: input.business_id,
          customer_id: user.id,
          product_id: input.product_id,
          rating: input.rating,
          review_text: input.review_text,
          images: input.images || []
        })
        .select()
        .single();

      if (error) throw error;
      logger.info('[BusinessSocialService] Created review:', data.id);
      return data;
    } catch (error) {
      logger.error('[BusinessSocialService] Failed to create review:', error);
      throw error;
    }
  }

  async updateReview(reviewId: string, input: UpdateReviewInput): Promise<void> {
    try {
      const { error } = await supabase
        .from('business_reviews')
        .update({
          ...input,
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId);

      if (error) throw error;
      logger.info('[BusinessSocialService] Updated review:', reviewId);
    } catch (error) {
      logger.error('[BusinessSocialService] Failed to update review:', error);
      throw error;
    }
  }

  async deleteReview(reviewId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('business_reviews')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', reviewId);

      if (error) throw error;
      logger.info('[BusinessSocialService] Deleted review:', reviewId);
    } catch (error) {
      logger.error('[BusinessSocialService] Failed to delete review:', error);
      throw error;
    }
  }

  async getBusinessReviews(filters: ReviewFilters): Promise<BusinessReview[]> {
    try {
      let query = supabase
        .from('business_reviews')
        .select(`
          *,
          customer:profiles!customer_id(id, name, photo_url),
          product:products(id, name, image_url),
          response:review_responses(*)
        `)
        .is('deleted_at', null);

      if (filters.business_id) {
        query = query.eq('business_id', filters.business_id);
      }

      if (filters.product_id) {
        query = query.eq('product_id', filters.product_id);
      }

      if (filters.rating) {
        query = query.eq('rating', filters.rating);
      }

      if (filters.verified_only) {
        query = query.eq('verified_purchase', true);
      }

      switch (filters.sort_by) {
        case 'rating_high':
          query = query.order('rating', { ascending: false });
          break;
        case 'rating_low':
          query = query.order('rating', { ascending: true });
          break;
        case 'helpful':
          query = query.order('helpful_count', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      query = query.range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 20) - 1);

      const { data, error } = await query;

      if (error) throw error;

      const user = (await supabase.auth.getUser()).data.user;
      if (user && data) {
        const reviewIds = data.map(r => r.id);
        const { data: helpfulMarks } = await supabase
          .from('review_helpful')
          .select('review_id')
          .in('review_id', reviewIds)
          .eq('user_id', user.id);

        const helpfulSet = new Set(helpfulMarks?.map(h => h.review_id) || []);
        return data.map(review => ({
          ...review,
          is_helpful: helpfulSet.has(review.id)
        }));
      }

      return data || [];
    } catch (error) {
      logger.error('[BusinessSocialService] Failed to get reviews:', error);
      throw error;
    }
  }

  async getReviewSummary(businessId: string, productId?: string): Promise<ReviewSummary> {
    try {
      let query = supabase
        .from('business_reviews')
        .select('rating, verified_purchase')
        .eq('business_id', businessId)
        .is('deleted_at', null);

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const reviews = data || [];
      const totalReviews = reviews.length;
      const avgRating = totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

      const distribution: RatingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      reviews.forEach(r => {
        distribution[r.rating as keyof RatingDistribution]++;
      });

      const verifiedCount = reviews.filter(r => r.verified_purchase).length;

      return {
        avg_rating: Math.round(avgRating * 100) / 100,
        total_reviews: totalReviews,
        rating_distribution: distribution,
        verified_count: verifiedCount
      };
    } catch (error) {
      logger.error('[BusinessSocialService] Failed to get review summary:', error);
      throw error;
    }
  }

  async markReviewHelpful(reviewId: string): Promise<void> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('review_helpful')
        .insert({
          review_id: reviewId,
          user_id: user.id
        });

      if (error) throw error;
      logger.info('[BusinessSocialService] Marked review as helpful:', reviewId);
    } catch (error) {
      logger.error('[BusinessSocialService] Failed to mark review as helpful:', error);
      throw error;
    }
  }

  async unmarkReviewHelpful(reviewId: string): Promise<void> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('review_helpful')
        .delete()
        .eq('review_id', reviewId)
        .eq('user_id', user.id);

      if (error) throw error;
      logger.info('[BusinessSocialService] Unmarked review as helpful:', reviewId);
    } catch (error) {
      logger.error('[BusinessSocialService] Failed to unmark review as helpful:', error);
      throw error;
    }
  }

  async respondToReview(input: CreateReviewResponseInput): Promise<ReviewResponse> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { data: review } = await supabase
        .from('business_reviews')
        .select('business_id')
        .eq('id', input.review_id)
        .single();

      if (!review) throw new Error('Review not found');

      const { data, error } = await supabase
        .from('review_responses')
        .insert({
          review_id: input.review_id,
          business_id: review.business_id,
          responder_id: user.id,
          response_text: input.response_text
        })
        .select()
        .single();

      if (error) throw error;
      logger.info('[BusinessSocialService] Created review response:', data.id);
      return data;
    } catch (error) {
      logger.error('[BusinessSocialService] Failed to respond to review:', error);
      throw error;
    }
  }

  async savePost(postId: string, collectionName?: string): Promise<void> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('post_saves')
        .insert({
          post_id: postId,
          user_id: user.id,
          collection_name: collectionName
        });

      if (error) throw error;
      logger.info('[BusinessSocialService] Saved post:', postId);
    } catch (error) {
      logger.error('[BusinessSocialService] Failed to save post:', error);
      throw error;
    }
  }

  async unsavePost(postId: string): Promise<void> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('post_saves')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (error) throw error;
      logger.info('[BusinessSocialService] Unsaved post:', postId);
    } catch (error) {
      logger.error('[BusinessSocialService] Failed to unsave post:', error);
      throw error;
    }
  }

  async getSavedPosts(limit = 50): Promise<EnhancedBusinessPost[]> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('post_saves')
        .select(`
          *,
          post:posts(
            *,
            author:profiles!author_id(id, name, username, photo_url)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data?.map(item => item.post).filter(Boolean) || [];
    } catch (error) {
      logger.error('[BusinessSocialService] Failed to get saved posts:', error);
      throw error;
    }
  }

  async getBusinessPosts(businessId: string, limit = 20, offset = 0): Promise<EnhancedBusinessPost[]> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles!author_id(id, name, username, photo_url)
        `)
        .eq('business_id', businessId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const user = (await supabase.auth.getUser()).data.user;
      if (user && data) {
        const postIds = data.map(p => p.id);

        const [{ data: likes }, { data: saves }] = await Promise.all([
          supabase.from('post_likes').select('post_id').in('post_id', postIds).eq('user_id', user.id),
          supabase.from('post_saves').select('post_id').in('post_id', postIds).eq('user_id', user.id)
        ]);

        const likedSet = new Set(likes?.map(l => l.post_id) || []);
        const savedSet = new Set(saves?.map(s => s.post_id) || []);

        return data.map(post => ({
          ...post,
          is_liked: likedSet.has(post.id),
          is_saved: savedSet.has(post.id)
        }));
      }

      return data || [];
    } catch (error) {
      logger.error('[BusinessSocialService] Failed to get business posts:', error);
      throw error;
    }
  }
}

export const businessSocialService = new BusinessSocialService();
