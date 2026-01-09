/*
  # Collections and Saved Content System

  1. New Tables
    - `collections`
      - User-created collections for organizing saved content
      - Public or private visibility
      - Custom covers and descriptions

    - `collection_items`
      - Items saved to collections (posts, products, stories)
      - Support for multiple item types

    - `user_links`
      - Multiple links in bio (Linktree-style)
      - Custom titles and URLs
      - Click tracking
      - Ordering support

    - `profile_customization`
      - Theme colors and styles
      - Layout preferences
      - Badge settings
      - Custom QR codes

    - `close_friends`
      - Lists for exclusive content sharing
      - Story visibility control

  2. Security
    - Users can manage their own collections
    - Public collections visible to all
    - Private collections only to owner
    - Close friends lists private to owner
*/

-- Create collections table
CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  cover_image text,
  is_public boolean DEFAULT false,
  item_count int DEFAULT 0,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_public ON collections(is_public) WHERE is_public = true;

-- Create collection_items table
CREATE TABLE IF NOT EXISTS collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('post', 'product', 'story', 'business', 'user')),
  item_id uuid NOT NULL,
  notes text,
  display_order int DEFAULT 0,
  added_at timestamptz DEFAULT now(),
  UNIQUE(collection_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_item ON collection_items(item_type, item_id);

-- Create user_links table (Linktree-style bio links)
CREATE TABLE IF NOT EXISTS user_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  icon text,
  thumbnail text,
  display_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  click_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_links_user_id ON user_links(user_id);
CREATE INDEX IF NOT EXISTS idx_user_links_business_id ON user_links(business_id);

-- Create link_clicks table for analytics
CREATE TABLE IF NOT EXISTS link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES user_links(id) ON DELETE CASCADE,
  clicked_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  referrer text,
  user_agent text,
  ip_address text,
  clicked_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_link_clicks_link_id ON link_clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_date ON link_clicks(clicked_at);

-- Create profile_customization table
CREATE TABLE IF NOT EXISTS profile_customization (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  theme_primary_color text,
  theme_secondary_color text,
  theme_background_color text,
  layout_style text DEFAULT 'grid' CHECK (layout_style IN ('grid', 'list', 'masonry', 'minimal')),
  profile_music_url text,
  profile_video_url text,
  custom_badges jsonb DEFAULT '[]',
  show_activity_status boolean DEFAULT true,
  show_follower_count boolean DEFAULT true,
  show_following_count boolean DEFAULT true,
  pinned_post_ids text[] DEFAULT '{}',
  featured_collection_id uuid REFERENCES collections(id) ON DELETE SET NULL,
  qr_code_style jsonb,
  custom_css text,
  updated_at timestamptz DEFAULT now()
);

-- Create close_friends table
CREATE TABLE IF NOT EXISTS close_friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

CREATE INDEX IF NOT EXISTS idx_close_friends_user_id ON close_friends(user_id);
CREATE INDEX IF NOT EXISTS idx_close_friends_friend_id ON close_friends(friend_id);

-- Create post_pins table for pinned posts
CREATE TABLE IF NOT EXISTS post_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  display_order int DEFAULT 0,
  pinned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_post_pins_user_id ON post_pins(user_id);

-- Enable RLS
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_customization ENABLE ROW LEVEL SECURITY;
ALTER TABLE close_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_pins ENABLE ROW LEVEL SECURITY;

-- Collections policies
CREATE POLICY "Anyone can view public collections"
  ON collections FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view their own collections"
  ON collections FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own collections"
  ON collections FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own collections"
  ON collections FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own collections"
  ON collections FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Collection items policies
CREATE POLICY "Anyone can view items in public collections"
  ON collection_items FOR SELECT
  USING (
    collection_id IN (
      SELECT id FROM collections WHERE is_public = true
    )
  );

CREATE POLICY "Users can view items in their collections"
  ON collection_items FOR SELECT
  TO authenticated
  USING (
    collection_id IN (
      SELECT id FROM collections WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage items in their collections"
  ON collection_items FOR ALL
  TO authenticated
  USING (
    collection_id IN (
      SELECT id FROM collections WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    collection_id IN (
      SELECT id FROM collections WHERE user_id = auth.uid()
    )
  );

-- User links policies
CREATE POLICY "Anyone can view active user links"
  ON user_links FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can manage their own links"
  ON user_links FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Link clicks policies
CREATE POLICY "Link owners can view click analytics"
  ON link_clicks FOR SELECT
  TO authenticated
  USING (
    link_id IN (
      SELECT id FROM user_links WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can record link clicks"
  ON link_clicks FOR INSERT
  WITH CHECK (true);

-- Profile customization policies
CREATE POLICY "Anyone can view profile customization"
  ON profile_customization FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own customization"
  ON profile_customization FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Close friends policies
CREATE POLICY "Users can view their close friends list"
  ON close_friends FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their close friends list"
  ON close_friends FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Post pins policies
CREATE POLICY "Anyone can view pinned posts"
  ON post_pins FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their pinned posts"
  ON post_pins FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to update collection item count
CREATE OR REPLACE FUNCTION update_collection_item_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE collections
    SET item_count = item_count + 1
    WHERE id = NEW.collection_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE collections
    SET item_count = item_count - 1
    WHERE id = OLD.collection_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_collection_item_count ON collection_items;
CREATE TRIGGER trigger_update_collection_item_count
  AFTER INSERT OR DELETE ON collection_items
  FOR EACH ROW
  EXECUTE FUNCTION update_collection_item_count();

-- Function to increment link click count
CREATE OR REPLACE FUNCTION increment_link_click_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_links
  SET click_count = click_count + 1
  WHERE id = NEW.link_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_link_click_count ON link_clicks;
CREATE TRIGGER trigger_increment_link_click_count
  AFTER INSERT ON link_clicks
  FOR EACH ROW
  EXECUTE FUNCTION increment_link_click_count();