import { logger } from '../lib/logger';
import { supabase } from '../lib/supabase';
import { BusinessRecord, getPublicBusinessCatalog } from './business';

export interface BusinessAnalytics {
  total_views: number;
  total_orders: number;
  total_customers: number;
  total_revenue: number;
  avg_order_value: number;
  conversion_rate: number;
}

export interface BusinessReview {
  id: string;
  business_id: string;
  user_id: string;
  rating: number;
  title?: string;
  comment?: string;
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
  user?: {
    id: string;
    name?: string;
    avatar_url?: string;
  };
}

export interface BusinessStats {
  followers_count: number;
  posts_count: number;
  products_count: number;
  reviews_count: number;
  avg_rating: number;
}

export interface OwnerProfile {
  id: string;
  user_id: string;
  name?: string;
  username?: string;
  bio?: string;
  location?: string;
  website?: string;
  avatar_url?: string;
  wallet_address?: string;
  wallet_type?: string;
  is_verified: boolean;
  businesses_count: number;
  member_since: string;
}

export interface CompleteBusinessData {
  business: BusinessRecord;
  products: any[];
  stats: BusinessStats;
  analytics?: BusinessAnalytics;
  reviews?: BusinessReview[];
  owner?: OwnerProfile;
}

/**
 * Fetch complete business data including products, stats, and owner info
 */
export async function getCompleteBusinessData(
  businessId: string,
  includeAnalytics: boolean = false
): Promise<CompleteBusinessData> {
  logger.info('[BusinessPreviewService] Fetching complete business data', { businessId });

  try {
    // Fetch business details
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (businessError) throw businessError;

    // Fetch products
    const products = await getPublicBusinessCatalog(businessId);

    // Fetch business stats
    const stats = await getBusinessStats(businessId);

    // Fetch owner profile
    const owner = await getBusinessOwnerProfile(business.owner_id);

    // Optionally fetch analytics (only for owners)
    let analytics: BusinessAnalytics | undefined;
    if (includeAnalytics) {
      analytics = await getBusinessAnalytics(businessId);
    }

    logger.info('[BusinessPreviewService] Successfully fetched complete business data');

    return {
      business,
      products,
      stats,
      analytics,
      owner,
    };
  } catch (error) {
    logger.error('[BusinessPreviewService] Failed to fetch complete business data', error);
    throw error;
  }
}

/**
 * Get business statistics
 */
export async function getBusinessStats(businessId: string): Promise<BusinessStats> {
  logger.debug('[BusinessPreviewService] Fetching business stats', { businessId });

  try {
    // Fetch followers count
    const { count: followersCount } = await supabase
      .from('business_followers')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId);

    // Fetch posts count
    const { count: postsCount } = await supabase
      .from('business_posts')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('visibility', 'public');

    // Fetch products count
    const { count: productsCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('is_published', true);

    // Fetch reviews count and average rating
    const { data: reviewStats } = await supabase
      .from('business_reviews')
      .select('rating')
      .eq('business_id', businessId);

    const reviewsCount = reviewStats?.length || 0;
    const avgRating = reviewsCount > 0
      ? reviewStats.reduce((sum, r) => sum + r.rating, 0) / reviewsCount
      : 0;

    return {
      followers_count: followersCount || 0,
      posts_count: postsCount || 0,
      products_count: productsCount || 0,
      reviews_count: reviewsCount,
      avg_rating: avgRating,
    };
  } catch (error) {
    logger.error('[BusinessPreviewService] Failed to fetch business stats', error);
    return {
      followers_count: 0,
      posts_count: 0,
      products_count: 0,
      reviews_count: 0,
      avg_rating: 0,
    };
  }
}

/**
 * Get business analytics (for owners only)
 */
export async function getBusinessAnalytics(businessId: string): Promise<BusinessAnalytics> {
  logger.debug('[BusinessPreviewService] Fetching business analytics', { businessId });

  try {
    // Fetch orders data
    const { data: orders } = await supabase
      .from('orders')
      .select('status, total_amount, customer_id')
      .eq('business_id', businessId);

    const totalOrders = orders?.length || 0;
    const completedOrders = orders?.filter(o => o.status === 'delivered') || [];
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const uniqueCustomers = new Set(orders?.map(o => o.customer_id)).size;

    // Page views would come from analytics tracking (placeholder)
    const totalViews = 0; // Implement with analytics service

    return {
      total_views: totalViews,
      total_orders: totalOrders,
      total_customers: uniqueCustomers,
      total_revenue: totalRevenue,
      avg_order_value: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      conversion_rate: totalViews > 0 ? (totalOrders / totalViews) * 100 : 0,
    };
  } catch (error) {
    logger.error('[BusinessPreviewService] Failed to fetch business analytics', error);
    throw error;
  }
}

/**
 * Get business owner profile information
 */
export async function getBusinessOwnerProfile(ownerId: string): Promise<OwnerProfile | undefined> {
  logger.debug('[BusinessPreviewService] Fetching owner profile', { ownerId });

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', ownerId)
      .maybeSingle();

    if (error || !profile) {
      logger.warn('[BusinessPreviewService] Owner profile not found', { ownerId });
      return undefined;
    }

    // Count businesses owned by this user
    const { count: businessesCount } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', ownerId);

    return {
      id: profile.id,
      user_id: profile.user_id || profile.id,
      name: profile.name || profile.username,
      username: profile.username,
      bio: profile.bio,
      location: profile.location,
      website: profile.website,
      avatar_url: profile.avatar_url,
      wallet_address: profile.wallet_address,
      wallet_type: profile.wallet_type,
      is_verified: profile.is_verified || false,
      businesses_count: businessesCount || 1,
      member_since: profile.created_at,
    };
  } catch (error) {
    logger.error('[BusinessPreviewService] Failed to fetch owner profile', error);
    return undefined;
  }
}

/**
 * Get business reviews with pagination
 */
export async function getBusinessReviews(
  businessId: string,
  options: {
    limit?: number;
    offset?: number;
    sortBy?: 'recent' | 'rating_high' | 'rating_low' | 'helpful';
  } = {}
): Promise<{ reviews: BusinessReview[]; total: number }> {
  const { limit = 10, offset = 0, sortBy = 'recent' } = options;

  logger.debug('[BusinessPreviewService] Fetching business reviews', { businessId, options });

  try {
    let query = supabase
      .from('business_reviews')
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          username,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('business_id', businessId)
      .range(offset, offset + limit - 1);

    // Apply sorting
    switch (sortBy) {
      case 'rating_high':
        query = query.order('rating', { ascending: false });
        break;
      case 'rating_low':
        query = query.order('rating', { ascending: true });
        break;
      case 'helpful':
        query = query.order('helpful_count', { ascending: false });
        break;
      case 'recent':
      default:
        query = query.order('created_at', { ascending: false });
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const reviews: BusinessReview[] = (data || []).map((review: any) => ({
      id: review.id,
      business_id: review.business_id,
      user_id: review.user_id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      is_verified_purchase: review.is_verified_purchase || false,
      helpful_count: review.helpful_count || 0,
      created_at: review.created_at,
      user: review.profiles ? {
        id: review.profiles.id,
        name: review.profiles.name || review.profiles.username,
        avatar_url: review.profiles.avatar_url,
      } : undefined,
    }));

    return {
      reviews,
      total: count || 0,
    };
  } catch (error) {
    logger.error('[BusinessPreviewService] Failed to fetch business reviews', error);
    return { reviews: [], total: 0 };
  }
}

/**
 * Toggle business follow status
 */
export async function toggleBusinessFollow(
  businessId: string,
  userId: string,
  isFollowing: boolean
): Promise<boolean> {
  logger.info('[BusinessPreviewService] Toggling business follow', { businessId, userId, isFollowing });

  try {
    if (isFollowing) {
      // Unfollow
      const { error } = await supabase
        .from('business_followers')
        .delete()
        .eq('business_id', businessId)
        .eq('user_id', userId);

      if (error) throw error;
      return false;
    } else {
      // Follow
      const { error } = await supabase
        .from('business_followers')
        .insert({
          business_id: businessId,
          user_id: userId,
          followed_at: new Date().toISOString(),
        });

      if (error) throw error;
      return true;
    }
  } catch (error) {
    logger.error('[BusinessPreviewService] Failed to toggle business follow', error);
    throw error;
  }
}

/**
 * Check if user is following a business
 */
export async function isUserFollowingBusiness(
  businessId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('business_followers')
      .select('id')
      .eq('business_id', businessId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  } catch (error) {
    logger.error('[BusinessPreviewService] Failed to check follow status', error);
    return false;
  }
}
