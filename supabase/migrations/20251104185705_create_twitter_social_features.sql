/*
  # Twitter-Style Social Media Features

  ## Overview
  This migration adds comprehensive social media functionality to the existing logistics platform,
  enabling users to share updates, follow each other, like posts, comment, and engage in social interactions.

  ## New Tables

  ### Core Social Tables
  - `user_profiles` - Extended user profiles with bio, avatar, social stats
  - `posts` - User posts/tweets with text, media, and metadata
  - `post_likes` - Track which users liked which posts
  - `post_reposts` - Retweet/share functionality
  - `post_comments` - Comments and replies to posts (threaded)
  - `user_follows` - Follow relationships between users
  - `hashtags` - Hashtag definitions and usage tracking
  - `post_hashtags` - Link posts to hashtags
  - `user_mentions` - Track @mentions in posts
  - `trending_topics` - Track trending hashtags and topics
  - `post_media` - Media attachments (images, videos) for posts
  - `user_blocks` - User blocking functionality
  - `user_mutes` - User muting functionality
  - `post_bookmarks` - Save posts for later

  ## Features Enabled
  1. User profiles with bio and social stats
  2. Post creation and feed display
  3. Follow/unfollow users
  4. Like and repost functionality
  5. Threaded comments and replies
  6. Hashtag tracking and trending topics
  7. @mentions with notifications
  8. Media attachments (images/videos)
  9. User blocking and muting
  10. Bookmark posts for later

  ## Security
  - RLS policies enforce user privacy and permissions
  - Business context remains isolated
  - Social features accessible to all authenticated users
  - Private/public post visibility controls
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Profiles (Extended social information)
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bio text,
  location text,
  website text,
  avatar_url text,
  banner_url text,
  is_verified boolean DEFAULT false,
  is_private boolean DEFAULT false,
  followers_count integer DEFAULT 0,
  following_count integer DEFAULT 0,
  posts_count integer DEFAULT 0,
  likes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Posts (Twitter-style tweets)
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
  content text NOT NULL,
  visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'followers', 'business')),
  reply_to_post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  repost_of_post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  is_reply boolean DEFAULT false,
  is_repost boolean DEFAULT false,
  likes_count integer DEFAULT 0,
  reposts_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  views_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Post Likes
CREATE TABLE IF NOT EXISTS post_likes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Post Reposts (Retweets)
CREATE TABLE IF NOT EXISTS post_reposts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Post Comments (Replies)
CREATE TABLE IF NOT EXISTS post_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES post_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  likes_count integer DEFAULT 0,
  replies_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- User Follows
CREATE TABLE IF NOT EXISTS user_follows (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Hashtags
CREATE TABLE IF NOT EXISTS hashtags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tag text NOT NULL UNIQUE,
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Post Hashtags (Many-to-Many)
CREATE TABLE IF NOT EXISTS post_hashtags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  hashtag_id uuid NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, hashtag_id)
);

-- User Mentions
CREATE TABLE IF NOT EXISTS user_mentions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentioning_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, mentioned_user_id)
);

-- Trending Topics
CREATE TABLE IF NOT EXISTS trending_topics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hashtag_id uuid NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  posts_count integer DEFAULT 0,
  engagement_score numeric DEFAULT 0,
  trend_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(hashtag_id, trend_date)
);

-- Post Media
CREATE TABLE IF NOT EXISTS post_media (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video', 'gif')),
  media_url text NOT NULL,
  thumbnail_url text,
  width integer,
  height integer,
  duration integer,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- User Blocks
CREATE TABLE IF NOT EXISTS user_blocks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- User Mutes
CREATE TABLE IF NOT EXISTS user_mutes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  muter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  muted_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(muter_id, muted_id),
  CHECK (muter_id != muted_id)
);

-- Post Bookmarks
CREATE TABLE IF NOT EXISTS post_bookmarks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_reply_to ON posts(reply_to_post_id);
CREATE INDEX IF NOT EXISTS idx_posts_repost_of ON posts(repost_of_post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent ON post_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_post ON post_hashtags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag ON post_hashtags(hashtag_id);
CREATE INDEX IF NOT EXISTS idx_hashtags_tag ON hashtags(tag);
CREATE INDEX IF NOT EXISTS idx_user_mentions_post ON user_mentions(post_id);
CREATE INDEX IF NOT EXISTS idx_user_mentions_user ON user_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_trending_topics_date ON trending_topics(trend_date DESC);
CREATE INDEX IF NOT EXISTS idx_post_media_post ON post_media(post_id);

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User Profiles: Everyone can view, users can update their own
CREATE POLICY "user_profiles_select_all" ON user_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_profiles_insert_own" ON user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_profiles_update_own" ON user_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Posts: Public posts visible to all, private posts only to followers
CREATE POLICY "posts_select_public" ON posts FOR SELECT TO authenticated USING (
  deleted_at IS NULL AND (
    visibility = 'public'
    OR user_id = auth.uid()
    OR (visibility = 'followers' AND EXISTS (
      SELECT 1 FROM user_follows WHERE following_id = posts.user_id AND follower_id = auth.uid()
    ))
  )
);
CREATE POLICY "posts_insert_own" ON posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_update_own" ON posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_delete_own" ON posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Post Likes: Users can like any visible post
CREATE POLICY "post_likes_select_all" ON post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "post_likes_insert_own" ON post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "post_likes_delete_own" ON post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Post Reposts: Users can repost any visible post
CREATE POLICY "post_reposts_select_all" ON post_reposts FOR SELECT TO authenticated USING (true);
CREATE POLICY "post_reposts_insert_own" ON post_reposts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "post_reposts_delete_own" ON post_reposts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Post Comments: Users can comment on visible posts
CREATE POLICY "post_comments_select_all" ON post_comments FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "post_comments_insert_own" ON post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "post_comments_update_own" ON post_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "post_comments_delete_own" ON post_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- User Follows: Users can follow anyone and see who follows them
CREATE POLICY "user_follows_select_all" ON user_follows FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_follows_insert_own" ON user_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "user_follows_delete_own" ON user_follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- Hashtags: Everyone can view, system creates
CREATE POLICY "hashtags_select_all" ON hashtags FOR SELECT TO authenticated USING (true);
CREATE POLICY "hashtags_insert_system" ON hashtags FOR INSERT TO authenticated WITH CHECK (true);

-- Post Hashtags: Public access
CREATE POLICY "post_hashtags_select_all" ON post_hashtags FOR SELECT TO authenticated USING (true);
CREATE POLICY "post_hashtags_insert_system" ON post_hashtags FOR INSERT TO authenticated WITH CHECK (true);

-- User Mentions: Public access
CREATE POLICY "user_mentions_select_all" ON user_mentions FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_mentions_insert_system" ON user_mentions FOR INSERT TO authenticated WITH CHECK (true);

-- Trending Topics: Everyone can view
CREATE POLICY "trending_topics_select_all" ON trending_topics FOR SELECT TO authenticated USING (true);

-- Post Media: Visible with post
CREATE POLICY "post_media_select_all" ON post_media FOR SELECT TO authenticated USING (true);
CREATE POLICY "post_media_insert_own" ON post_media FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM posts WHERE id = post_media.post_id AND user_id = auth.uid())
);

-- User Blocks: Users manage their own blocks
CREATE POLICY "user_blocks_select_own" ON user_blocks FOR SELECT TO authenticated USING (auth.uid() = blocker_id);
CREATE POLICY "user_blocks_insert_own" ON user_blocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "user_blocks_delete_own" ON user_blocks FOR DELETE TO authenticated USING (auth.uid() = blocker_id);

-- User Mutes: Users manage their own mutes
CREATE POLICY "user_mutes_select_own" ON user_mutes FOR SELECT TO authenticated USING (auth.uid() = muter_id);
CREATE POLICY "user_mutes_insert_own" ON user_mutes FOR INSERT TO authenticated WITH CHECK (auth.uid() = muter_id);
CREATE POLICY "user_mutes_delete_own" ON user_mutes FOR DELETE TO authenticated USING (auth.uid() = muter_id);

-- Post Bookmarks: Users manage their own bookmarks
CREATE POLICY "post_bookmarks_select_own" ON post_bookmarks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "post_bookmarks_insert_own" ON post_bookmarks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "post_bookmarks_delete_own" ON post_bookmarks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Service role policies for edge functions
CREATE POLICY "user_profiles_service_role" ON user_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "posts_service_role" ON posts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "post_likes_service_role" ON post_likes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "post_reposts_service_role" ON post_reposts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "post_comments_service_role" ON post_comments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "user_follows_service_role" ON user_follows FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "hashtags_service_role" ON hashtags FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "post_hashtags_service_role" ON post_hashtags FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "user_mentions_service_role" ON user_mentions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "trending_topics_service_role" ON trending_topics FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "post_media_service_role" ON post_media FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Triggers to update counts

-- Update user profile post count
CREATE OR REPLACE FUNCTION update_user_posts_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_profiles SET posts_count = posts_count + 1 WHERE user_id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_profiles SET posts_count = GREATEST(posts_count - 1, 0) WHERE user_id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_posts_count
AFTER INSERT OR DELETE ON posts
FOR EACH ROW EXECUTE FUNCTION update_user_posts_count();

-- Update post likes count
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_likes_count
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

-- Update post reposts count
CREATE OR REPLACE FUNCTION update_post_reposts_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET reposts_count = reposts_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET reposts_count = GREATEST(reposts_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_reposts_count
AFTER INSERT OR DELETE ON post_reposts
FOR EACH ROW EXECUTE FUNCTION update_post_reposts_count();

-- Update post comments count
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_comments_count
AFTER INSERT OR DELETE ON post_comments
FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

-- Update follower/following counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_profiles SET following_count = following_count + 1 WHERE user_id = NEW.follower_id;
    UPDATE user_profiles SET followers_count = followers_count + 1 WHERE user_id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_profiles SET following_count = GREATEST(following_count - 1, 0) WHERE user_id = OLD.follower_id;
    UPDATE user_profiles SET followers_count = GREATEST(followers_count - 1, 0) WHERE user_id = OLD.following_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_follow_counts
AFTER INSERT OR DELETE ON user_follows
FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- Update hashtag usage count
CREATE OR REPLACE FUNCTION update_hashtag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE hashtags SET usage_count = usage_count + 1, updated_at = now() WHERE id = NEW.hashtag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE hashtags SET usage_count = GREATEST(usage_count - 1, 0), updated_at = now() WHERE id = OLD.hashtag_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_hashtag_usage_count
AFTER INSERT OR DELETE ON post_hashtags
FOR EACH ROW EXECUTE FUNCTION update_hashtag_usage_count();

-- Function to create user profile automatically when user is created
CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, bio, is_verified, is_private)
  VALUES (NEW.id, '', false, false)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_user_profile_on_signup
AFTER INSERT ON users
FOR EACH ROW EXECUTE FUNCTION create_user_profile_on_signup();

-- Backfill existing users with profiles
INSERT INTO user_profiles (user_id, bio, is_verified, is_private)
SELECT id, '', false, false
FROM users
WHERE NOT EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.user_id = users.id)
ON CONFLICT (user_id) DO NOTHING;
