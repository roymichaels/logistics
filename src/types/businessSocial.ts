export type PostType = 'standard' | 'product_showcase' | 'promotion' | 'story' | 'announcement';

export interface BusinessReview {
  id: string;
  business_id: string;
  customer_id: string;
  product_id?: string;
  rating: number;
  review_text?: string;
  images: string[];
  verified_purchase: boolean;
  helpful_count: number;
  is_featured: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    name?: string;
    photo_url?: string;
  };
  product?: {
    id: string;
    name: string;
    image_url?: string;
  };
  response?: ReviewResponse;
  is_helpful?: boolean;
}

export interface ReviewResponse {
  id: string;
  review_id: string;
  business_id: string;
  responder_id: string;
  response_text: string;
  created_at: string;
  updated_at: string;
  responder?: {
    id: string;
    name?: string;
    photo_url?: string;
  };
}

export interface BusinessFollower {
  id: string;
  business_id: string;
  follower_id: string;
  notification_preferences: {
    new_posts: boolean;
    promotions: boolean;
    new_products: boolean;
  };
  created_at: string;
}

export interface BusinessStats {
  business_id: string;
  followers_count: number;
  posts_count: number;
  products_count: number;
  reviews_count: number;
  avg_rating: number;
  total_orders: number;
  last_post_at?: string;
  updated_at: string;
}

export interface PostSave {
  id: string;
  post_id: string;
  user_id: string;
  collection_name?: string;
  created_at: string;
}

export interface ReviewHelpful {
  id: string;
  review_id: string;
  user_id: string;
  created_at: string;
}

export interface CreateReviewInput {
  business_id: string;
  product_id?: string;
  rating: number;
  review_text?: string;
  images?: string[];
}

export interface UpdateReviewInput {
  rating?: number;
  review_text?: string;
  images?: string[];
}

export interface CreateReviewResponseInput {
  review_id: string;
  response_text: string;
}

export interface ReviewFilters {
  business_id?: string;
  product_id?: string;
  rating?: number;
  verified_only?: boolean;
  sort_by?: 'recent' | 'rating_high' | 'rating_low' | 'helpful';
  limit?: number;
  offset?: number;
}

export interface RatingDistribution {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

export interface ReviewSummary {
  avg_rating: number;
  total_reviews: number;
  rating_distribution: RatingDistribution;
  verified_count: number;
}

export interface EnhancedBusinessPost {
  id: string;
  author_id: string;
  business_id?: string;
  content: string;
  post_type: PostType;
  visibility: 'public' | 'followers' | 'private';
  featured_products: Array<{
    product_id: string;
    name: string;
    price: number;
    image_url?: string;
  }>;
  hashtags: string[];
  media_urls: string[];
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  view_count: number;
  edited_at?: string;
  deleted_at?: string;
  created_at: string;
  author?: {
    id: string;
    name?: string;
    username?: string;
    photo_url?: string;
  };
  is_liked?: boolean;
  is_saved?: boolean;
  is_reposted?: boolean;
}

export interface BusinessProfile {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  logo_url?: string;
  cover_image_url?: string;
  category?: string;
  email?: string;
  phone?: string;
  website?: string;
  social_links?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  operating_hours?: Array<{
    day: string;
    open: string;
    close: string;
    closed: boolean;
  }>;
  location?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  is_following?: boolean;
  stats?: BusinessStats;
}

export interface NotificationPreferences {
  new_posts: boolean;
  promotions: boolean;
  new_products: boolean;
}
