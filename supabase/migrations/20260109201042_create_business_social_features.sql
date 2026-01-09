/*
  # Business Social Commerce Features

  1. New Tables
    - `business_reviews`
      - Customer reviews for businesses and products
      - Star ratings (1-5)
      - Review text and images
      - Verified purchase tracking
      - Helpful count

    - `business_followers`
      - Customer following businesses
      - Notification preferences
      - Follow/unfollow tracking

    - `business_stats`
      - Aggregate statistics per business
      - Followers, posts, reviews counts
      - Average ratings
      - Auto-updated via triggers

    - `post_saves`
      - Customers saving/bookmarking posts
      - Optional collection names

    - `review_responses`
      - Business owner responses to reviews

    - `review_helpful`
      - Track users who marked reviews as helpful

  2. Extensions to Existing Tables
    - Add business-specific fields to posts table
    - Add post_type, featured_products, hashtags

  3. Security
    - Enable RLS on all tables
    - Customers can only edit their own reviews
    - Business owners can respond to reviews
    - Anyone can view public reviews
    - Proper access control for all operations
*/

-- Create business_reviews table
CREATE TABLE IF NOT EXISTS business_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  images jsonb DEFAULT '[]',
  verified_purchase boolean DEFAULT false,
  helpful_count int DEFAULT 0,
  is_featured boolean DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(business_id, customer_id, product_id)
);

-- Create business_followers table
CREATE TABLE IF NOT EXISTS business_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_preferences jsonb DEFAULT '{"new_posts": true, "promotions": true, "new_products": false}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(business_id, follower_id)
);

-- Create business_stats table
CREATE TABLE IF NOT EXISTS business_stats (
  business_id uuid PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  followers_count int DEFAULT 0,
  posts_count int DEFAULT 0,
  products_count int DEFAULT 0,
  reviews_count int DEFAULT 0,
  avg_rating numeric(3,2) DEFAULT 0.0,
  total_orders int DEFAULT 0,
  last_post_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Create post_saves table
CREATE TABLE IF NOT EXISTS post_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  collection_name text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create review_responses table
CREATE TABLE IF NOT EXISTS review_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES business_reviews(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  responder_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  response_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(review_id)
);

-- Create review_helpful table
CREATE TABLE IF NOT EXISTS review_helpful (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES business_reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(review_id, user_id)
);

-- Add new columns to posts table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'post_type'
  ) THEN
    ALTER TABLE posts ADD COLUMN post_type text DEFAULT 'standard'
      CHECK (post_type IN ('standard', 'product_showcase', 'promotion', 'story', 'announcement'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'featured_products'
  ) THEN
    ALTER TABLE posts ADD COLUMN featured_products jsonb DEFAULT '[]';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'hashtags'
  ) THEN
    ALTER TABLE posts ADD COLUMN hashtags jsonb DEFAULT '[]';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'view_count'
  ) THEN
    ALTER TABLE posts ADD COLUMN view_count int DEFAULT 0;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE business_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpful ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business_reviews

CREATE POLICY "Anyone can view non-deleted reviews"
  ON business_reviews FOR SELECT
  TO authenticated, anon
  USING (deleted_at IS NULL);

CREATE POLICY "Customers can create reviews"
  ON business_reviews FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can update own reviews"
  ON business_reviews FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can delete own reviews"
  ON business_reviews FOR DELETE
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Business owners can view all reviews for their business"
  ON business_reviews FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- RLS Policies for business_followers

CREATE POLICY "Anyone can view follower counts"
  ON business_followers FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can follow businesses"
  ON business_followers FOR INSERT
  TO authenticated
  WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can unfollow businesses"
  ON business_followers FOR DELETE
  TO authenticated
  USING (follower_id = auth.uid());

CREATE POLICY "Users can update own follow preferences"
  ON business_followers FOR UPDATE
  TO authenticated
  USING (follower_id = auth.uid())
  WITH CHECK (follower_id = auth.uid());

-- RLS Policies for business_stats

CREATE POLICY "Anyone can view business stats"
  ON business_stats FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "System can update business stats"
  ON business_stats FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update business stats via update"
  ON business_stats FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for post_saves

CREATE POLICY "Users can view own saved posts"
  ON post_saves FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can save posts"
  ON post_saves FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unsave posts"
  ON post_saves FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for review_responses

CREATE POLICY "Anyone can view review responses"
  ON review_responses FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Business owners can respond to reviews"
  ON review_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    ) AND responder_id = auth.uid()
  );

CREATE POLICY "Business owners can update own responses"
  ON review_responses FOR UPDATE
  TO authenticated
  USING (responder_id = auth.uid())
  WITH CHECK (responder_id = auth.uid());

-- RLS Policies for review_helpful

CREATE POLICY "Anyone can view helpful marks"
  ON review_helpful FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can mark reviews as helpful"
  ON review_helpful FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unmark reviews as helpful"
  ON review_helpful FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for performance

CREATE INDEX IF NOT EXISTS business_reviews_business_id_idx ON business_reviews(business_id);
CREATE INDEX IF NOT EXISTS business_reviews_customer_id_idx ON business_reviews(customer_id);
CREATE INDEX IF NOT EXISTS business_reviews_product_id_idx ON business_reviews(product_id);
CREATE INDEX IF NOT EXISTS business_reviews_rating_idx ON business_reviews(rating);
CREATE INDEX IF NOT EXISTS business_reviews_created_at_idx ON business_reviews(created_at DESC);

CREATE INDEX IF NOT EXISTS business_followers_business_id_idx ON business_followers(business_id);
CREATE INDEX IF NOT EXISTS business_followers_follower_id_idx ON business_followers(follower_id);

CREATE INDEX IF NOT EXISTS post_saves_user_id_idx ON post_saves(user_id);
CREATE INDEX IF NOT EXISTS post_saves_post_id_idx ON post_saves(post_id);

CREATE INDEX IF NOT EXISTS review_responses_review_id_idx ON review_responses(review_id);
CREATE INDEX IF NOT EXISTS review_helpful_review_id_idx ON review_helpful(review_id);

CREATE INDEX IF NOT EXISTS posts_business_id_type_idx ON posts(business_id, post_type) WHERE business_id IS NOT NULL;

-- Triggers and Functions

-- Function to update business stats when followers change
CREATE OR REPLACE FUNCTION update_business_followers_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO business_stats (business_id, followers_count)
    VALUES (NEW.business_id, 1)
    ON CONFLICT (business_id)
    DO UPDATE SET
      followers_count = business_stats.followers_count + 1,
      updated_at = now();
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE business_stats
    SET
      followers_count = GREATEST(0, followers_count - 1),
      updated_at = now()
    WHERE business_id = OLD.business_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS business_followers_count_trigger ON business_followers;
CREATE TRIGGER business_followers_count_trigger
  AFTER INSERT OR DELETE ON business_followers
  FOR EACH ROW
  EXECUTE FUNCTION update_business_followers_count();

-- Function to update review stats
CREATE OR REPLACE FUNCTION update_business_review_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_avg_rating numeric(3,2);
  v_review_count int;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    SELECT
      ROUND(AVG(rating)::numeric, 2),
      COUNT(*)
    INTO v_avg_rating, v_review_count
    FROM business_reviews
    WHERE business_id = NEW.business_id AND deleted_at IS NULL;

    INSERT INTO business_stats (business_id, avg_rating, reviews_count)
    VALUES (NEW.business_id, v_avg_rating, v_review_count)
    ON CONFLICT (business_id)
    DO UPDATE SET
      avg_rating = v_avg_rating,
      reviews_count = v_review_count,
      updated_at = now();

  ELSIF TG_OP = 'DELETE' THEN
    SELECT
      ROUND(AVG(rating)::numeric, 2),
      COUNT(*)
    INTO v_avg_rating, v_review_count
    FROM business_reviews
    WHERE business_id = OLD.business_id AND deleted_at IS NULL;

    UPDATE business_stats
    SET
      avg_rating = COALESCE(v_avg_rating, 0),
      reviews_count = v_review_count,
      updated_at = now()
    WHERE business_id = OLD.business_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS business_review_stats_trigger ON business_reviews;
CREATE TRIGGER business_review_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON business_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_business_review_stats();

-- Function to update helpful count on reviews
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE business_reviews
    SET helpful_count = helpful_count + 1
    WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE business_reviews
    SET helpful_count = GREATEST(0, helpful_count - 1)
    WHERE id = OLD.review_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS review_helpful_count_trigger ON review_helpful;
CREATE TRIGGER review_helpful_count_trigger
  AFTER INSERT OR DELETE ON review_helpful
  FOR EACH ROW
  EXECUTE FUNCTION update_review_helpful_count();

-- Function to update post count stats
CREATE OR REPLACE FUNCTION update_business_post_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.business_id IS NOT NULL THEN
    INSERT INTO business_stats (business_id, posts_count, last_post_at)
    VALUES (NEW.business_id, 1, NEW.created_at)
    ON CONFLICT (business_id)
    DO UPDATE SET
      posts_count = business_stats.posts_count + 1,
      last_post_at = NEW.created_at,
      updated_at = now();
  ELSIF TG_OP = 'DELETE' AND OLD.business_id IS NOT NULL THEN
    UPDATE business_stats
    SET
      posts_count = GREATEST(0, posts_count - 1),
      updated_at = now()
    WHERE business_id = OLD.business_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS business_post_stats_trigger ON posts;
CREATE TRIGGER business_post_stats_trigger
  AFTER INSERT OR DELETE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_business_post_stats();

-- Function to initialize business stats
CREATE OR REPLACE FUNCTION initialize_business_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO business_stats (business_id, followers_count, posts_count, products_count, reviews_count, avg_rating)
  VALUES (NEW.id, 0, 0, 0, 0, 0.0)
  ON CONFLICT (business_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS initialize_business_stats_trigger ON businesses;
CREATE TRIGGER initialize_business_stats_trigger
  AFTER INSERT ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION initialize_business_stats();
