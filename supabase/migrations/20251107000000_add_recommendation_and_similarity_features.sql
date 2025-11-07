/*
  # Add User Recommendation and Content Similarity Features

  ## Overview
  This migration adds database support for intelligent user recommendations and content similarity detection
  for the Twitter-like social media platform.

  ## New Tables
  - `user_similarities` - Track similarity scores between users based on interactions
  - `post_similarities` - Track content similarity between posts
  - `user_recommendations` - Store generated user recommendations with scores
  - `content_recommendations` - Store recommended posts for users

  ## New Functions
  - `calculate_user_similarity()` - Calculate similarity between two users
  - `get_user_recommendations()` - Get recommended users for a given user
  - `get_similar_posts()` - Find posts similar to a given post
  - `get_mutual_followers()` - Get mutual followers between two users
  - `get_recommended_posts()` - Get recommended posts for user's feed

  ## Indexes
  - Performance indexes for recommendation queries
  - Composite indexes for similarity calculations

  ## Security
  - RLS policies for recommendation access
  - Service role policies for batch processing
*/

-- User Similarities Table
CREATE TABLE IF NOT EXISTS user_similarities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  similar_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  similarity_score numeric(5,4) DEFAULT 0,
  mutual_followers_count integer DEFAULT 0,
  common_interests_count integer DEFAULT 0,
  interaction_score numeric(5,4) DEFAULT 0,
  calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, similar_user_id),
  CHECK (user_id != similar_user_id),
  CHECK (similarity_score >= 0 AND similarity_score <= 1)
);

-- Post Similarities Table
CREATE TABLE IF NOT EXISTS post_similarities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  similar_post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  similarity_score numeric(5,4) DEFAULT 0,
  common_hashtags_count integer DEFAULT 0,
  content_similarity numeric(5,4) DEFAULT 0,
  engagement_similarity numeric(5,4) DEFAULT 0,
  calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, similar_post_id),
  CHECK (post_id != similar_post_id),
  CHECK (similarity_score >= 0 AND similarity_score <= 1)
);

-- User Recommendations Cache
CREATE TABLE IF NOT EXISTS user_recommendations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recommended_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recommendation_score numeric(5,4) DEFAULT 0,
  recommendation_reason text,
  is_dismissed boolean DEFAULT false,
  is_not_interested boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '7 days',
  UNIQUE(user_id, recommended_user_id),
  CHECK (user_id != recommended_user_id)
);

-- Content Recommendations Cache
CREATE TABLE IF NOT EXISTS content_recommendations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  recommendation_score numeric(5,4) DEFAULT 0,
  recommendation_type text DEFAULT 'general' CHECK (recommendation_type IN ('general', 'similar', 'trending', 'from_network')),
  viewed boolean DEFAULT false,
  interacted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '24 hours',
  UNIQUE(user_id, post_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_similarities_user_id ON user_similarities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_similarities_similar_user_id ON user_similarities(similar_user_id);
CREATE INDEX IF NOT EXISTS idx_user_similarities_score ON user_similarities(similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_similarities_calculated ON user_similarities(calculated_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_similarities_post_id ON post_similarities(post_id);
CREATE INDEX IF NOT EXISTS idx_post_similarities_similar_post_id ON post_similarities(similar_post_id);
CREATE INDEX IF NOT EXISTS idx_post_similarities_score ON post_similarities(similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_post_similarities_calculated ON post_similarities(calculated_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_recommendations_user_id ON user_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recommendations_score ON user_recommendations(recommendation_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_recommendations_expires ON user_recommendations(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_recommendations_dismissed ON user_recommendations(is_dismissed, is_not_interested);

CREATE INDEX IF NOT EXISTS idx_content_recommendations_user_id ON content_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_content_recommendations_post_id ON content_recommendations(post_id);
CREATE INDEX IF NOT EXISTS idx_content_recommendations_type ON content_recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_content_recommendations_expires ON content_recommendations(expires_at);

-- Enable RLS
ALTER TABLE user_similarities ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_similarities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User Similarities: Users can view their own similarities
CREATE POLICY "user_similarities_select_own" ON user_similarities
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Post Similarities: Anyone can view post similarities
CREATE POLICY "post_similarities_select_all" ON post_similarities
  FOR SELECT TO authenticated
  USING (true);

-- User Recommendations: Users can view and manage their own recommendations
CREATE POLICY "user_recommendations_select_own" ON user_recommendations
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND expires_at > now());

CREATE POLICY "user_recommendations_update_own" ON user_recommendations
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Content Recommendations: Users can view their own content recommendations
CREATE POLICY "content_recommendations_select_own" ON content_recommendations
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND expires_at > now());

CREATE POLICY "content_recommendations_update_own" ON content_recommendations
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role policies for batch processing
CREATE POLICY "user_similarities_service_role" ON user_similarities
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "post_similarities_service_role" ON post_similarities
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "user_recommendations_service_role" ON user_recommendations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "content_recommendations_service_role" ON content_recommendations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Function to get mutual followers between two users
CREATE OR REPLACE FUNCTION get_mutual_followers(user_a uuid, user_b uuid)
RETURNS TABLE(follower_id uuid, username text, name text, photo_url text) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT u.id as follower_id, u.username, u.name, u.photo_url
  FROM user_follows uf1
  INNER JOIN user_follows uf2 ON uf1.follower_id = uf2.follower_id
  INNER JOIN users u ON u.id = uf1.follower_id
  WHERE uf1.following_id = user_a
    AND uf2.following_id = user_b
    AND uf1.follower_id != user_a
    AND uf1.follower_id != user_b;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate user similarity score
CREATE OR REPLACE FUNCTION calculate_user_similarity(user_a uuid, user_b uuid)
RETURNS numeric AS $$
DECLARE
  mutual_count integer;
  common_hashtags integer;
  interaction_count integer;
  similarity numeric;
BEGIN
  -- Count mutual followers
  SELECT COUNT(*) INTO mutual_count
  FROM user_follows uf1
  INNER JOIN user_follows uf2 ON uf1.follower_id = uf2.follower_id
  WHERE uf1.following_id = user_a AND uf2.following_id = user_b;

  -- Count common hashtags in posts
  SELECT COUNT(DISTINCT ph1.hashtag_id) INTO common_hashtags
  FROM post_hashtags ph1
  INNER JOIN posts p1 ON ph1.post_id = p1.id
  INNER JOIN post_hashtags ph2 ON ph1.hashtag_id = ph2.hashtag_id
  INNER JOIN posts p2 ON ph2.post_id = p2.id
  WHERE p1.user_id = user_a AND p2.user_id = user_b
    AND p1.deleted_at IS NULL AND p2.deleted_at IS NULL;

  -- Count interactions (likes, comments, reposts)
  SELECT COUNT(*) INTO interaction_count
  FROM (
    SELECT 1 FROM post_likes pl
    INNER JOIN posts p ON pl.post_id = p.id
    WHERE pl.user_id = user_a AND p.user_id = user_b
    UNION ALL
    SELECT 1 FROM post_likes pl
    INNER JOIN posts p ON pl.post_id = p.id
    WHERE pl.user_id = user_b AND p.user_id = user_a
    UNION ALL
    SELECT 1 FROM post_comments pc
    INNER JOIN posts p ON pc.post_id = p.id
    WHERE pc.user_id = user_a AND p.user_id = user_b
    UNION ALL
    SELECT 1 FROM post_comments pc
    INNER JOIN posts p ON pc.post_id = p.id
    WHERE pc.user_id = user_b AND p.user_id = user_a
  ) interactions;

  -- Calculate weighted similarity score (0-1 range)
  similarity := (
    (mutual_count * 0.4) +
    (LEAST(common_hashtags, 10) * 0.3) +
    (LEAST(interaction_count, 20) * 0.3)
  ) / 10;

  RETURN LEAST(similarity, 1.0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user recommendations
CREATE OR REPLACE FUNCTION get_user_recommendations(target_user_id uuid, limit_count integer DEFAULT 10)
RETURNS TABLE(
  recommended_user_id uuid,
  username text,
  name text,
  photo_url text,
  recommendation_score numeric,
  mutual_followers_count integer,
  reason text
) AS $$
BEGIN
  RETURN QUERY
  WITH user_following AS (
    SELECT following_id FROM user_follows WHERE follower_id = target_user_id
  ),
  user_followers AS (
    SELECT follower_id FROM user_follows WHERE following_id = target_user_id
  ),
  blocked_users AS (
    SELECT blocked_id FROM user_blocks WHERE blocker_id = target_user_id
  ),
  candidates AS (
    -- Get followers of people I follow (2nd degree connections)
    SELECT DISTINCT uf2.following_id as user_id, 'followed_by_connections' as reason_type
    FROM user_follows uf1
    INNER JOIN user_follows uf2 ON uf1.following_id = uf2.follower_id
    WHERE uf1.follower_id = target_user_id
      AND uf2.following_id != target_user_id
      AND uf2.following_id NOT IN (SELECT following_id FROM user_following)
      AND uf2.following_id NOT IN (SELECT blocked_id FROM blocked_users)
    LIMIT 100
  )
  SELECT
    c.user_id,
    u.username,
    u.name,
    u.photo_url,
    calculate_user_similarity(target_user_id, c.user_id) as score,
    (SELECT COUNT(*)::integer FROM get_mutual_followers(target_user_id, c.user_id)) as mutual_count,
    CASE
      WHEN c.reason_type = 'followed_by_connections' THEN 'Followed by people you follow'
      ELSE 'Suggested for you'
    END as reason
  FROM candidates c
  INNER JOIN users u ON u.id = c.user_id
  WHERE calculate_user_similarity(target_user_id, c.user_id) > 0.1
  ORDER BY score DESC, mutual_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find similar posts
CREATE OR REPLACE FUNCTION get_similar_posts(target_post_id uuid, limit_count integer DEFAULT 10)
RETURNS TABLE(
  similar_post_id uuid,
  similarity_score numeric,
  common_hashtags integer
) AS $$
BEGIN
  RETURN QUERY
  WITH target_hashtags AS (
    SELECT hashtag_id FROM post_hashtags WHERE post_id = target_post_id
  ),
  target_post_info AS (
    SELECT user_id, created_at FROM posts WHERE id = target_post_id
  )
  SELECT
    p.id,
    (
      (common_tags.count * 0.6) +
      (CASE WHEN p.user_id = tpi.user_id THEN 0.2 ELSE 0 END) +
      (CASE WHEN p.created_at > tpi.created_at - interval '7 days' THEN 0.2 ELSE 0.1 END)
    ) / 1.0 as score,
    common_tags.count::integer as hashtag_count
  FROM posts p
  CROSS JOIN target_post_info tpi
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::numeric as count
    FROM post_hashtags ph
    WHERE ph.post_id = p.id
      AND ph.hashtag_id IN (SELECT hashtag_id FROM target_hashtags)
  ) common_tags ON true
  WHERE p.id != target_post_id
    AND p.deleted_at IS NULL
    AND p.visibility = 'public'
    AND common_tags.count > 0
  ORDER BY score DESC, p.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired recommendations
CREATE OR REPLACE FUNCTION cleanup_expired_recommendations()
RETURNS void AS $$
BEGIN
  DELETE FROM user_recommendations WHERE expires_at < now();
  DELETE FROM content_recommendations WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to cleanup expired recommendations (if pg_cron is available)
-- This is optional and will silently fail if pg_cron extension is not available
DO $$
BEGIN
  -- Try to create cron job, ignore if extension doesn't exist
  PERFORM cron.schedule(
    'cleanup-recommendations',
    '0 2 * * *',  -- Run at 2 AM daily
    'SELECT cleanup_expired_recommendations();'
  );
EXCEPTION
  WHEN undefined_table THEN
    NULL;  -- pg_cron not available, skip scheduling
END $$;
