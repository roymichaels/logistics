/*
  # Universal Instagram-Style Profile System

  ## Overview
  Creates a comprehensive profile system with Instagram-style features for all user types.

  ## New Tables

  1. **user_profile_stats**
     - Aggregated statistics for each user profile
     - Posts count, followers/following counts
     - Engagement metrics (likes received, comments made)
     - Profile views count
     - Last activity timestamp

  2. **user_achievements**
     - Achievement/badge system for users
     - Tracks milestones and accomplishments
     - Custom badges per user

  3. **profile_views**
     - Track who viewed each profile and when
     - Analytics for profile performance

  ## Enhanced Profiles Table

  - Add banner_url for cover photos
  - Add tagline (short one-liner, 60 chars)
  - Add is_verified for verified users
  - Add profile_visibility settings
  - Add interests and skills
  - Add social_links as jsonb

  ## Security

  - All tables have RLS enabled
  - Users can view their own stats and achievements
  - Profile views are private to profile owner
  - Public profiles are viewable by all
  - Privacy settings respected throughout

  ## Functions

  - Calculate profile completeness percentage
  - Update profile stats automatically
  - Track profile views efficiently
*/

-- ============================================================================
-- ENHANCE PROFILES TABLE
-- ============================================================================

-- Add new profile fields
DO $$
BEGIN
  -- Banner/cover photo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'banner_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN banner_url text;
  END IF;

  -- Short tagline
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'tagline'
  ) THEN
    ALTER TABLE profiles ADD COLUMN tagline text;
  END IF;

  -- Verification status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_verified boolean DEFAULT false;
  END IF;

  -- Profile visibility
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'profile_visibility'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_visibility text DEFAULT 'public';
  END IF;

  -- Interests as array
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'interests'
  ) THEN
    ALTER TABLE profiles ADD COLUMN interests text[] DEFAULT '{}';
  END IF;

  -- Skills/expertise as array
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'skills'
  ) THEN
    ALTER TABLE profiles ADD COLUMN skills text[] DEFAULT '{}';
  END IF;

  -- Social links as JSONB
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'social_links'
  ) THEN
    ALTER TABLE profiles ADD COLUMN social_links jsonb DEFAULT '{}';
  END IF;

  -- Hide followers list option
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'hide_followers'
  ) THEN
    ALTER TABLE profiles ADD COLUMN hide_followers boolean DEFAULT false;
  END IF;

  -- Hide following list option
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'hide_following'
  ) THEN
    ALTER TABLE profiles ADD COLUMN hide_following boolean DEFAULT false;
  END IF;
END $$;

-- Add constraint for profile visibility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_visibility_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_visibility_check 
      CHECK (profile_visibility IN ('public', 'followers', 'private'));
  END IF;
END $$;

-- Add constraint for tagline length
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_tagline_length_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_tagline_length_check CHECK (
      tagline IS NULL OR length(tagline) <= 60
    );
  END IF;
END $$;

-- ============================================================================
-- USER PROFILE STATS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profile_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,

  -- Post statistics
  posts_count int DEFAULT 0,
  media_posts_count int DEFAULT 0,

  -- Social statistics
  followers_count int DEFAULT 0,
  following_count int DEFAULT 0,

  -- Engagement received
  total_likes_received int DEFAULT 0,
  total_comments_received int DEFAULT 0,
  total_reposts_received int DEFAULT 0,

  -- Engagement given
  total_likes_given int DEFAULT 0,
  total_comments_given int DEFAULT 0,
  total_reposts_given int DEFAULT 0,

  -- Profile metrics
  profile_views_count int DEFAULT 0,
  profile_views_this_week int DEFAULT 0,
  profile_views_this_month int DEFAULT 0,

  -- Activity tracking
  last_post_at timestamptz,
  last_active_at timestamptz DEFAULT now(),

  -- Profile quality
  profile_completeness_percentage int DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_profile_stats_user_id_idx ON user_profile_stats(user_id);

-- ============================================================================
-- USER ACHIEVEMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  achievement_type text NOT NULL,
  achievement_name text NOT NULL,
  achievement_description text,
  achievement_icon text,
  achievement_tier text DEFAULT 'bronze' CHECK (achievement_tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),

  is_rare boolean DEFAULT false,
  is_visible boolean DEFAULT true,

  earned_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',

  UNIQUE(user_id, achievement_type, achievement_name)
);

CREATE INDEX IF NOT EXISTS user_achievements_user_id_idx ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS user_achievements_type_idx ON user_achievements(achievement_type);

-- ============================================================================
-- PROFILE VIEWS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  viewer_ip text,

  -- Context
  referrer text,
  user_agent text,

  viewed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_views_profile_id_idx ON profile_views(profile_id);
CREATE INDEX IF NOT EXISTS profile_views_viewer_id_idx ON profile_views(viewer_id);
CREATE INDEX IF NOT EXISTS profile_views_viewed_at_idx ON profile_views(viewed_at DESC);

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE user_profile_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - USER PROFILE STATS
-- ============================================================================

CREATE POLICY "Anyone can view public profile stats"
  ON user_profile_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_profile_stats.user_id
      AND profiles.profile_visibility = 'public'
    )
  );

CREATE POLICY "Followers can view followers-only profile stats"
  ON user_profile_stats FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_profile_stats.user_id
      AND profiles.profile_visibility = 'followers'
      AND (
        profiles.id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_follows
          WHERE following_id = profiles.id AND follower_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can view own profile stats"
  ON user_profile_stats FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile stats"
  ON user_profile_stats FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can insert profile stats"
  ON user_profile_stats FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES - USER ACHIEVEMENTS
-- ============================================================================

CREATE POLICY "Anyone can view public achievements"
  ON user_achievements FOR SELECT
  USING (
    is_visible = true
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_achievements.user_id
      AND profiles.profile_visibility = 'public'
    )
  );

CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own achievement visibility"
  ON user_achievements FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- RLS POLICIES - PROFILE VIEWS
-- ============================================================================

CREATE POLICY "Users can view their own profile views"
  ON profile_views FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Anyone can record profile views"
  ON profile_views FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to calculate profile completeness
CREATE OR REPLACE FUNCTION calculate_profile_completeness(user_uuid uuid)
RETURNS int AS $$
DECLARE
  completeness int := 0;
  profile_record record;
  posts_count int;
  followers_count int;
BEGIN
  SELECT * INTO profile_record FROM profiles WHERE id = user_uuid;

  IF profile_record IS NULL THEN
    RETURN 0;
  END IF;

  -- Base fields (10 points each)
  IF profile_record.name IS NOT NULL AND length(profile_record.name) > 0 THEN
    completeness := completeness + 10;
  END IF;

  IF profile_record.username IS NOT NULL AND length(profile_record.username) >= 3 THEN
    completeness := completeness + 10;
  END IF;

  IF profile_record.bio IS NOT NULL AND length(profile_record.bio) > 0 THEN
    completeness := completeness + 10;
  END IF;

  IF profile_record.photo_url IS NOT NULL OR profile_record.avatar_url IS NOT NULL THEN
    completeness := completeness + 15;
  END IF;

  IF profile_record.banner_url IS NOT NULL THEN
    completeness := completeness + 10;
  END IF;

  -- Additional fields (5 points each)
  IF profile_record.location IS NOT NULL AND length(profile_record.location) > 0 THEN
    completeness := completeness + 5;
  END IF;

  IF profile_record.website IS NOT NULL AND length(profile_record.website) > 0 THEN
    completeness := completeness + 5;
  END IF;

  IF profile_record.tagline IS NOT NULL AND length(profile_record.tagline) > 0 THEN
    completeness := completeness + 5;
  END IF;

  IF profile_record.social_links IS NOT NULL AND profile_record.social_links::text != '{}'::text THEN
    completeness := completeness + 5;
  END IF;

  IF array_length(profile_record.interests, 1) > 0 THEN
    completeness := completeness + 5;
  END IF;

  -- Social activity (5 points each, up to 20 total)
  SELECT COUNT(*) INTO posts_count FROM posts WHERE author_id = user_uuid AND deleted_at IS NULL;
  IF posts_count > 0 THEN
    completeness := completeness + 5;
  END IF;

  IF posts_count >= 10 THEN
    completeness := completeness + 5;
  END IF;

  SELECT COUNT(*) INTO followers_count FROM user_follows WHERE following_id = user_uuid;
  IF followers_count > 0 THEN
    completeness := completeness + 5;
  END IF;

  IF followers_count >= 10 THEN
    completeness := completeness + 5;
  END IF;

  RETURN LEAST(completeness, 100);
END;
$$ LANGUAGE plpgsql;

-- Function to update profile stats
CREATE OR REPLACE FUNCTION update_profile_stats(user_uuid uuid)
RETURNS void AS $$
DECLARE
  stats_record record;
  completeness_score int;
BEGIN
  -- Get current counts
  SELECT
    (SELECT COUNT(*) FROM posts WHERE author_id = user_uuid AND deleted_at IS NULL) as posts_count,
    (SELECT COUNT(*) FROM posts WHERE author_id = user_uuid AND deleted_at IS NULL AND jsonb_array_length(media_urls) > 0) as media_posts_count,
    (SELECT COUNT(*) FROM user_follows WHERE following_id = user_uuid) as followers_count,
    (SELECT COUNT(*) FROM user_follows WHERE follower_id = user_uuid) as following_count,
    (SELECT COALESCE(SUM(likes_count), 0) FROM posts WHERE author_id = user_uuid) as total_likes_received,
    (SELECT COALESCE(SUM(comments_count), 0) FROM posts WHERE author_id = user_uuid) as total_comments_received,
    (SELECT COALESCE(SUM(reposts_count), 0) FROM posts WHERE author_id = user_uuid) as total_reposts_received,
    (SELECT COUNT(*) FROM post_likes WHERE user_id = user_uuid) as total_likes_given,
    (SELECT COUNT(*) FROM post_comments WHERE author_id = user_uuid AND deleted_at IS NULL) as total_comments_given,
    (SELECT MAX(created_at) FROM posts WHERE author_id = user_uuid) as last_post_at,
    (SELECT COUNT(*) FROM profile_views WHERE profile_id = user_uuid) as profile_views_count,
    (SELECT COUNT(*) FROM profile_views WHERE profile_id = user_uuid AND viewed_at > now() - interval '7 days') as profile_views_this_week,
    (SELECT COUNT(*) FROM profile_views WHERE profile_id = user_uuid AND viewed_at > now() - interval '30 days') as profile_views_this_month
  INTO stats_record;

  -- Calculate completeness
  completeness_score := calculate_profile_completeness(user_uuid);

  -- Upsert stats
  INSERT INTO user_profile_stats (
    user_id,
    posts_count,
    media_posts_count,
    followers_count,
    following_count,
    total_likes_received,
    total_comments_received,
    total_reposts_received,
    total_likes_given,
    total_comments_given,
    last_post_at,
    profile_views_count,
    profile_views_this_week,
    profile_views_this_month,
    profile_completeness_percentage,
    last_active_at,
    updated_at
  ) VALUES (
    user_uuid,
    stats_record.posts_count,
    stats_record.media_posts_count,
    stats_record.followers_count,
    stats_record.following_count,
    stats_record.total_likes_received,
    stats_record.total_comments_received,
    stats_record.total_reposts_received,
    stats_record.total_likes_given,
    stats_record.total_comments_given,
    stats_record.last_post_at,
    stats_record.profile_views_count,
    stats_record.profile_views_this_week,
    stats_record.profile_views_this_month,
    completeness_score,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    posts_count = EXCLUDED.posts_count,
    media_posts_count = EXCLUDED.media_posts_count,
    followers_count = EXCLUDED.followers_count,
    following_count = EXCLUDED.following_count,
    total_likes_received = EXCLUDED.total_likes_received,
    total_comments_received = EXCLUDED.total_comments_received,
    total_reposts_received = EXCLUDED.total_reposts_received,
    total_likes_given = EXCLUDED.total_likes_given,
    total_comments_given = EXCLUDED.total_comments_given,
    last_post_at = EXCLUDED.last_post_at,
    profile_views_count = EXCLUDED.profile_views_count,
    profile_views_this_week = EXCLUDED.profile_views_this_week,
    profile_views_this_month = EXCLUDED.profile_views_this_month,
    profile_completeness_percentage = EXCLUDED.profile_completeness_percentage,
    last_active_at = EXCLUDED.last_active_at,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Function to record profile view
CREATE OR REPLACE FUNCTION record_profile_view(
  p_profile_id uuid,
  p_viewer_id uuid DEFAULT NULL,
  p_viewer_ip text DEFAULT NULL,
  p_referrer text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Don't record if viewing own profile
  IF p_viewer_id IS NOT NULL AND p_viewer_id = p_profile_id THEN
    RETURN;
  END IF;

  -- Insert view record
  INSERT INTO profile_views (
    profile_id,
    viewer_id,
    viewer_ip,
    referrer,
    user_agent,
    viewed_at
  ) VALUES (
    p_profile_id,
    p_viewer_id,
    p_viewer_ip,
    p_referrer,
    p_user_agent,
    now()
  );

  -- Update profile stats
  UPDATE user_profile_stats
  SET
    profile_views_count = profile_views_count + 1,
    updated_at = now()
  WHERE user_id = p_profile_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INITIAL DATA SETUP
-- ============================================================================

-- Create stats records for all existing users
INSERT INTO user_profile_stats (user_id)
SELECT id FROM profiles
ON CONFLICT (user_id) DO NOTHING;

-- Update all existing user stats
DO $$
DECLARE
  user_record record;
BEGIN
  FOR user_record IN SELECT id FROM profiles LOOP
    PERFORM update_profile_stats(user_record.id);
  END LOOP;
END $$;

-- Grant achievements for existing milestones
-- First post achievement
INSERT INTO user_achievements (user_id, achievement_type, achievement_name, achievement_description, achievement_icon, achievement_tier)
SELECT DISTINCT author_id, 'milestone', 'First Post', 'Posted their first content', '📝', 'bronze'
FROM posts
WHERE deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- Early adopter achievement for users created before today
INSERT INTO user_achievements (user_id, achievement_type, achievement_name, achievement_description, achievement_icon, achievement_tier, is_rare)
SELECT id, 'special', 'Early Adopter', 'One of the first users on the platform', '🌟', 'gold', true
FROM profiles
WHERE created_at < CURRENT_DATE
ON CONFLICT DO NOTHING;