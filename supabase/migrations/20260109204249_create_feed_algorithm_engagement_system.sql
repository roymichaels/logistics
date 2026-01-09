/*
  # Feed Algorithm and Engagement System

  1. New Tables
    - `user_interests`
      - Track user interests and preferences
      - Auto-learned from interactions
      - Manual interest selection

    - `engagement_scores`
      - Content engagement metrics
      - Algorithm ranking scores
      - Decay over time

    - `feed_preferences`
      - User feed customization
      - Algorithm toggles
      - Content filtering

    - `content_interactions`
      - Detailed interaction tracking
      - Time spent, scroll depth
      - Engagement signals

    - `trending_topics`
      - Real-time trending hashtags and topics
      - Engagement velocity
      - Geographic trends

    - `user_recommendations`
      - Personalized content recommendations
      - Similar user suggestions
      - Product recommendations

  2. Security
    - User preferences private to owner
    - Engagement data aggregated for privacy
    - Trending topics public
*/

-- Create user_interests table
CREATE TABLE IF NOT EXISTS user_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  interest_type text NOT NULL CHECK (interest_type IN ('category', 'hashtag', 'business', 'product_type', 'topic')),
  interest_value text NOT NULL,
  confidence_score numeric(5,4) DEFAULT 0.5,
  interaction_count int DEFAULT 0,
  is_explicit boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, interest_type, interest_value)
);

CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_type_value ON user_interests(interest_type, interest_value);

-- Create engagement_scores table
CREATE TABLE IF NOT EXISTS engagement_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('post', 'story', 'product', 'business')),
  content_id uuid NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  view_count int DEFAULT 0,
  like_count int DEFAULT 0,
  comment_count int DEFAULT 0,
  share_count int DEFAULT 0,
  save_count int DEFAULT 0,
  click_count int DEFAULT 0,
  engagement_rate numeric(5,4) DEFAULT 0,
  quality_score numeric(5,4) DEFAULT 0,
  recency_score numeric(5,4) DEFAULT 1.0,
  relevance_score numeric(5,4) DEFAULT 0,
  final_score numeric(8,6) DEFAULT 0,
  last_calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(content_type, content_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_engagement_scores_content ON engagement_scores(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_engagement_scores_user_id ON engagement_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_scores_final_score ON engagement_scores(final_score DESC);

-- Create feed_preferences table
CREATE TABLE IF NOT EXISTS feed_preferences (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  feed_algorithm text DEFAULT 'balanced' CHECK (feed_algorithm IN ('chronological', 'balanced', 'engagement', 'discovery')),
  show_suggested_posts boolean DEFAULT true,
  show_ads boolean DEFAULT true,
  content_sensitivity text DEFAULT 'normal' CHECK (content_sensitivity IN ('less', 'normal', 'more')),
  autoplay_videos boolean DEFAULT true,
  mute_by_default boolean DEFAULT false,
  hide_like_counts boolean DEFAULT false,
  snooze_keywords text[] DEFAULT '{}',
  favorite_categories text[] DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- Create content_interactions table
CREATE TABLE IF NOT EXISTS content_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('post', 'story', 'product', 'business', 'profile')),
  content_id uuid NOT NULL,
  interaction_type text NOT NULL CHECK (interaction_type IN ('view', 'like', 'comment', 'share', 'save', 'click', 'dwell', 'skip')),
  dwell_time_seconds int,
  scroll_depth_percent int,
  interaction_context jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_interactions_user_id ON content_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_content_interactions_content ON content_interactions(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_interactions_type ON content_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_content_interactions_created_at ON content_interactions(created_at DESC);

-- Create trending_topics table
CREATE TABLE IF NOT EXISTS trending_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_type text NOT NULL CHECK (topic_type IN ('hashtag', 'keyword', 'business', 'product_category')),
  topic_value text NOT NULL,
  mention_count int DEFAULT 0,
  engagement_count int DEFAULT 0,
  velocity_score numeric(10,4) DEFAULT 0,
  geographic_region text,
  category text,
  trend_start_at timestamptz DEFAULT now(),
  last_updated_at timestamptz DEFAULT now(),
  UNIQUE(topic_type, topic_value, geographic_region)
);

CREATE INDEX IF NOT EXISTS idx_trending_topics_velocity ON trending_topics(velocity_score DESC);
CREATE INDEX IF NOT EXISTS idx_trending_topics_type_value ON trending_topics(topic_type, topic_value);
CREATE INDEX IF NOT EXISTS idx_trending_topics_region ON trending_topics(geographic_region);

-- Create user_recommendations table
CREATE TABLE IF NOT EXISTS user_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recommendation_type text NOT NULL CHECK (recommendation_type IN ('user', 'business', 'product', 'post', 'topic')),
  recommended_id uuid NOT NULL,
  recommendation_score numeric(5,4) DEFAULT 0,
  recommendation_reason text,
  is_viewed boolean DEFAULT false,
  is_dismissed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS idx_user_recommendations_user_id ON user_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recommendations_type ON user_recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_user_recommendations_score ON user_recommendations(recommendation_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_recommendations_expires_at ON user_recommendations(expires_at);

-- Create relationship_strength table (for ranking feed)
CREATE TABLE IF NOT EXISTS relationship_strength (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  related_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  interaction_count int DEFAULT 0,
  last_interaction_at timestamptz,
  relationship_score numeric(5,4) DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, related_user_id),
  CHECK (user_id != related_user_id)
);

CREATE INDEX IF NOT EXISTS idx_relationship_strength_user_id ON relationship_strength(user_id);
CREATE INDEX IF NOT EXISTS idx_relationship_strength_score ON relationship_strength(relationship_score DESC);

-- Create post_reach table (for analytics)
CREATE TABLE IF NOT EXISTS post_reach (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  impressions int DEFAULT 0,
  reach int DEFAULT 0,
  profile_visits int DEFAULT 0,
  follows_from_post int DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(post_id, date)
);

CREATE INDEX IF NOT EXISTS idx_post_reach_post_id ON post_reach(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reach_date ON post_reach(date DESC);

-- Enable RLS
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_strength ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reach ENABLE ROW LEVEL SECURITY;

-- User interests policies
CREATE POLICY "Users can view their own interests"
  ON user_interests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own interests"
  ON user_interests FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Engagement scores policies
CREATE POLICY "Anyone can view aggregate engagement scores"
  ON engagement_scores FOR SELECT
  USING (user_id IS NULL);

CREATE POLICY "Users can view their personalized scores"
  ON engagement_scores FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can update engagement scores"
  ON engagement_scores FOR ALL
  TO authenticated
  WITH CHECK (true);

-- Feed preferences policies
CREATE POLICY "Users can view their own feed preferences"
  ON feed_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their feed preferences"
  ON feed_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Content interactions policies
CREATE POLICY "Users can view their own interactions"
  ON content_interactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create interactions"
  ON content_interactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Trending topics policies
CREATE POLICY "Anyone can view trending topics"
  ON trending_topics FOR SELECT
  USING (true);

CREATE POLICY "System can manage trending topics"
  ON trending_topics FOR ALL
  TO authenticated
  WITH CHECK (true);

-- User recommendations policies
CREATE POLICY "Users can view their own recommendations"
  ON user_recommendations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND expires_at > now());

CREATE POLICY "System can create recommendations"
  ON user_recommendations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their recommendations"
  ON user_recommendations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Relationship strength policies
CREATE POLICY "Users can view their relationship scores"
  ON relationship_strength FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can manage relationship scores"
  ON relationship_strength FOR ALL
  TO authenticated
  WITH CHECK (true);

-- Post reach policies
CREATE POLICY "Post authors can view reach"
  ON post_reach FOR SELECT
  TO authenticated
  USING (
    post_id IN (
      SELECT id FROM posts WHERE author_id = auth.uid()
    )
  );

CREATE POLICY "System can update post reach"
  ON post_reach FOR ALL
  TO authenticated
  WITH CHECK (true);

-- Function to calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(
  p_view_count int,
  p_like_count int,
  p_comment_count int,
  p_share_count int,
  p_save_count int
) RETURNS numeric AS $$
DECLARE
  v_engagement_rate numeric;
  v_weighted_score numeric;
BEGIN
  IF p_view_count = 0 THEN
    RETURN 0;
  END IF;
  
  v_engagement_rate := (
    (p_like_count * 1.0) +
    (p_comment_count * 3.0) +
    (p_share_count * 5.0) +
    (p_save_count * 4.0)
  ) / GREATEST(p_view_count, 1);
  
  v_weighted_score := LEAST(v_engagement_rate, 1.0);
  
  RETURN v_weighted_score;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate recency score (decays over time)
CREATE OR REPLACE FUNCTION calculate_recency_score(p_created_at timestamptz) RETURNS numeric AS $$
DECLARE
  v_hours_old numeric;
  v_recency_score numeric;
BEGIN
  v_hours_old := EXTRACT(EPOCH FROM (now() - p_created_at)) / 3600;
  
  v_recency_score := 1.0 / (1.0 + (v_hours_old / 24.0));
  
  RETURN GREATEST(v_recency_score, 0.1);
END;
$$ LANGUAGE plpgsql;

-- Function to update relationship strength
CREATE OR REPLACE FUNCTION update_relationship_strength(
  p_user_id uuid,
  p_related_user_id uuid
) RETURNS void AS $$
BEGIN
  INSERT INTO relationship_strength (user_id, related_user_id, interaction_count, last_interaction_at, relationship_score)
  VALUES (p_user_id, p_related_user_id, 1, now(), 0.1)
  ON CONFLICT (user_id, related_user_id)
  DO UPDATE SET
    interaction_count = relationship_strength.interaction_count + 1,
    last_interaction_at = now(),
    relationship_score = LEAST(
      relationship_strength.relationship_score + 0.05,
      1.0
    );
END;
$$ LANGUAGE plpgsql;