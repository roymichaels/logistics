/*
  # Shoppable Content and Product Tagging System

  1. New Tables
    - `product_tags`
      - Products tagged in posts and stories
      - Position coordinates for overlays
      - Tag styling and animation

    - `shoppable_posts`
      - Enhanced metadata for commerce posts
      - Featured products
      - Special offers and promotions

    - `affiliate_links`
      - Affiliate tracking for creators
      - Commission rates and earnings
      - Click and conversion tracking

    - `product_collections`
      - Curated product collections
      - Shop the look features
      - Themed collections

    - `wishlists`
      - User wishlists and save for later
      - Price drop notifications
      - Share wishlist with others

    - `shopping_carts`
      - Multi-vendor shopping carts
      - Cart abandonment tracking
      - Save for later items

  2. Security
    - Product tags visible with posts
    - Affiliate links tracked per creator
    - Wishlists private to owner unless shared
    - Shopping carts private to owner
*/

-- Create product_tags table
CREATE TABLE IF NOT EXISTS product_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  position_x numeric(5,2),
  position_y numeric(5,2),
  tag_style jsonb DEFAULT '{"type": "pin", "animation": "pulse"}',
  display_order int DEFAULT 0,
  click_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CHECK (post_id IS NOT NULL OR story_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_product_tags_post_id ON product_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_product_tags_story_id ON product_tags(story_id);
CREATE INDEX IF NOT EXISTS idx_product_tags_product_id ON product_tags(product_id);

-- Create shoppable_posts table
CREATE TABLE IF NOT EXISTS shoppable_posts (
  post_id uuid PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  post_type text DEFAULT 'standard' CHECK (post_type IN ('standard', 'collection', 'lookbook', 'sale', 'launch')),
  featured_product_ids uuid[] DEFAULT '{}',
  discount_code text,
  discount_percentage numeric(5,2),
  sale_ends_at timestamptz,
  total_clicks int DEFAULT 0,
  total_purchases int DEFAULT 0,
  total_revenue numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shoppable_posts_business_id ON shoppable_posts(business_id);

-- Create affiliate_links table
CREATE TABLE IF NOT EXISTS affiliate_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  affiliate_code text UNIQUE NOT NULL,
  commission_rate numeric(5,2) DEFAULT 10.0,
  click_count int DEFAULT 0,
  conversion_count int DEFAULT 0,
  total_earnings numeric(10,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_links_user_id ON affiliate_links(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_product_id ON affiliate_links(product_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_code ON affiliate_links(affiliate_code);

-- Create affiliate_clicks table
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_link_id uuid NOT NULL REFERENCES affiliate_links(id) ON DELETE CASCADE,
  clicked_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  converted boolean DEFAULT false,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  commission_earned numeric(10,2),
  referrer text,
  clicked_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_link_id ON affiliate_clicks(affiliate_link_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_converted ON affiliate_clicks(converted) WHERE converted = true;

-- Create product_collections table
CREATE TABLE IF NOT EXISTS product_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  cover_image text,
  collection_type text DEFAULT 'curated' CHECK (collection_type IN ('curated', 'lookbook', 'seasonal', 'trending', 'bestsellers')),
  is_public boolean DEFAULT true,
  display_order int DEFAULT 0,
  product_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_collections_business_id ON product_collections(business_id);

-- Create product_collection_items table
CREATE TABLE IF NOT EXISTS product_collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES product_collections(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  display_order int DEFAULT 0,
  notes text,
  added_at timestamptz DEFAULT now(),
  UNIQUE(collection_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_collection_items_collection_id ON product_collection_items(collection_id);

-- Create wishlists table
CREATE TABLE IF NOT EXISTS wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text DEFAULT 'My Wishlist',
  description text,
  is_public boolean DEFAULT false,
  share_token text UNIQUE,
  item_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_share_token ON wishlists(share_token) WHERE share_token IS NOT NULL;

-- Create wishlist_items table
CREATE TABLE IF NOT EXISTS wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id uuid NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  original_price numeric(10,2),
  current_price numeric(10,2),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  notes text,
  notify_on_sale boolean DEFAULT true,
  notify_on_restock boolean DEFAULT true,
  added_at timestamptz DEFAULT now(),
  UNIQUE(wishlist_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist_id ON wishlist_items(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_product_id ON wishlist_items(product_id);

-- Create shopping_carts table
CREATE TABLE IF NOT EXISTS shopping_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'abandoned', 'completed')),
  total_items int DEFAULT 0,
  subtotal numeric(10,2) DEFAULT 0,
  last_activity_at timestamptz DEFAULT now(),
  abandoned_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shopping_carts_user_id ON shopping_carts(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_carts_status ON shopping_carts(status);
CREATE INDEX IF NOT EXISTS idx_shopping_carts_abandoned ON shopping_carts(abandoned_at) WHERE status = 'abandoned';

-- Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES shopping_carts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  quantity int NOT NULL DEFAULT 1,
  price_at_add numeric(10,2) NOT NULL,
  current_price numeric(10,2),
  variant_options jsonb,
  saved_for_later boolean DEFAULT false,
  added_at timestamptz DEFAULT now(),
  UNIQUE(cart_id, product_id, variant_options)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

-- Enable RLS
ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE shoppable_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Product tags policies
CREATE POLICY "Anyone can view product tags"
  ON product_tags FOR SELECT
  USING (true);

CREATE POLICY "Business owners can create product tags"
  ON product_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
    OR post_id IN (
      SELECT id FROM posts WHERE author_id = auth.uid()
    )
  );

CREATE POLICY "Creators can manage their product tags"
  ON product_tags FOR ALL
  TO authenticated
  USING (
    post_id IN (SELECT id FROM posts WHERE author_id = auth.uid())
    OR story_id IN (SELECT id FROM stories WHERE user_id = auth.uid())
  );

-- Shoppable posts policies
CREATE POLICY "Anyone can view shoppable posts"
  ON shoppable_posts FOR SELECT
  USING (true);

CREATE POLICY "Business owners can create shoppable posts"
  ON shoppable_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can manage their shoppable posts"
  ON shoppable_posts FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Affiliate links policies
CREATE POLICY "Users can view their own affiliate links"
  ON affiliate_links FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Business owners can view affiliate links for their products"
  ON affiliate_links FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create affiliate links"
  ON affiliate_links FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their affiliate links"
  ON affiliate_links FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Affiliate clicks policies
CREATE POLICY "Affiliate link owners can view clicks"
  ON affiliate_clicks FOR SELECT
  TO authenticated
  USING (
    affiliate_link_id IN (
      SELECT id FROM affiliate_links WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can record affiliate clicks"
  ON affiliate_clicks FOR INSERT
  WITH CHECK (true);

-- Product collections policies
CREATE POLICY "Anyone can view public collections"
  ON product_collections FOR SELECT
  USING (is_public = true);

CREATE POLICY "Business owners can manage their collections"
  ON product_collections FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Product collection items policies
CREATE POLICY "Anyone can view items in public collections"
  ON product_collection_items FOR SELECT
  USING (
    collection_id IN (
      SELECT id FROM product_collections WHERE is_public = true
    )
  );

CREATE POLICY "Collection owners can manage items"
  ON product_collection_items FOR ALL
  TO authenticated
  USING (
    collection_id IN (
      SELECT pc.id FROM product_collections pc
      JOIN businesses b ON pc.business_id = b.id
      WHERE b.owner_id = auth.uid()
    )
  );

-- Wishlists policies
CREATE POLICY "Users can view their own wishlists"
  ON wishlists FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can view shared wishlists"
  ON wishlists FOR SELECT
  USING (is_public = true OR share_token IS NOT NULL);

CREATE POLICY "Users can manage their wishlists"
  ON wishlists FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Wishlist items policies
CREATE POLICY "Users can view items in their wishlists"
  ON wishlist_items FOR SELECT
  TO authenticated
  USING (
    wishlist_id IN (
      SELECT id FROM wishlists WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view items in shared wishlists"
  ON wishlist_items FOR SELECT
  USING (
    wishlist_id IN (
      SELECT id FROM wishlists WHERE is_public = true OR share_token IS NOT NULL
    )
  );

CREATE POLICY "Users can manage items in their wishlists"
  ON wishlist_items FOR ALL
  TO authenticated
  USING (
    wishlist_id IN (
      SELECT id FROM wishlists WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    wishlist_id IN (
      SELECT id FROM wishlists WHERE user_id = auth.uid()
    )
  );

-- Shopping carts policies
CREATE POLICY "Users can view their own carts"
  ON shopping_carts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their carts"
  ON shopping_carts FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Cart items policies
CREATE POLICY "Users can view items in their carts"
  ON cart_items FOR SELECT
  TO authenticated
  USING (
    cart_id IN (
      SELECT id FROM shopping_carts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage items in their carts"
  ON cart_items FOR ALL
  TO authenticated
  USING (
    cart_id IN (
      SELECT id FROM shopping_carts WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    cart_id IN (
      SELECT id FROM shopping_carts WHERE user_id = auth.uid()
    )
  );

-- Triggers for counts
CREATE OR REPLACE FUNCTION update_product_collection_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE product_collections SET product_count = product_count + 1 WHERE id = NEW.collection_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE product_collections SET product_count = product_count - 1 WHERE id = OLD.collection_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_product_collection_count ON product_collection_items;
CREATE TRIGGER trigger_update_product_collection_count
  AFTER INSERT OR DELETE ON product_collection_items
  FOR EACH ROW
  EXECUTE FUNCTION update_product_collection_count();

CREATE OR REPLACE FUNCTION update_wishlist_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE wishlists SET item_count = item_count + 1 WHERE id = NEW.wishlist_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE wishlists SET item_count = item_count - 1 WHERE id = OLD.wishlist_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_wishlist_count ON wishlist_items;
CREATE TRIGGER trigger_update_wishlist_count
  AFTER INSERT OR DELETE ON wishlist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_wishlist_count();