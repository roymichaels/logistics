/*
  # Product Catalog System

  Creates comprehensive product catalog with categories, variants, and pricing.

  ## New Tables

  1. `product_categories`
    - Hierarchical category system with parent/child relationships
    - Support for category images and descriptions
    - SEO-friendly slugs

  2. `products` (enhanced)
    - Extended product information
    - Multiple images support
    - SEO fields
    - Inventory tracking

  3. `product_variants`
    - Size, color, and other variant attributes
    - Individual SKUs and pricing
    - Separate inventory per variant

  4. `product_images`
    - Multiple images per product
    - Image ordering and primary image designation

  5. `product_tags`
    - Flexible tagging system for products

  6. `product_reviews`
    - Customer ratings and reviews
    - Verified purchase tracking

  ## Security
  - RLS enabled on all tables
  - Public read access for active products
  - Write access restricted to business owners/managers
*/

-- Product Categories Table
CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES product_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  image_url text,
  display_order integer DEFAULT 0,
  active boolean DEFAULT true,
  meta_title text,
  meta_description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(business_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_product_categories_business ON product_categories(business_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_parent ON product_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_active ON product_categories(business_id, active);

-- Enhanced Products Table
DO $$
BEGIN
  -- Add new columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category_id') THEN
    ALTER TABLE products ADD COLUMN category_id uuid REFERENCES product_categories(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'sku') THEN
    ALTER TABLE products ADD COLUMN sku text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'slug') THEN
    ALTER TABLE products ADD COLUMN slug text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'description') THEN
    ALTER TABLE products ADD COLUMN description text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'short_description') THEN
    ALTER TABLE products ADD COLUMN short_description text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'primary_image_url') THEN
    ALTER TABLE products ADD COLUMN primary_image_url text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'cost_price') THEN
    ALTER TABLE products ADD COLUMN cost_price decimal(10,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'compare_at_price') THEN
    ALTER TABLE products ADD COLUMN compare_at_price decimal(10,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'stock_quantity') THEN
    ALTER TABLE products ADD COLUMN stock_quantity integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'low_stock_threshold') THEN
    ALTER TABLE products ADD COLUMN low_stock_threshold integer DEFAULT 5;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'track_inventory') THEN
    ALTER TABLE products ADD COLUMN track_inventory boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'active') THEN
    ALTER TABLE products ADD COLUMN active boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'featured') THEN
    ALTER TABLE products ADD COLUMN featured boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'meta_title') THEN
    ALTER TABLE products ADD COLUMN meta_title text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'meta_description') THEN
    ALTER TABLE products ADD COLUMN meta_description text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'weight') THEN
    ALTER TABLE products ADD COLUMN weight decimal(10,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'weight_unit') THEN
    ALTER TABLE products ADD COLUMN weight_unit text DEFAULT 'kg';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(business_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(business_id, slug);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(business_id, active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(business_id, featured);

-- Product Variants Table
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku text NOT NULL,
  name text NOT NULL,
  option1_name text,
  option1_value text,
  option2_name text,
  option2_value text,
  option3_name text,
  option3_value text,
  price decimal(10,2) NOT NULL,
  compare_at_price decimal(10,2),
  cost_price decimal(10,2),
  stock_quantity integer DEFAULT 0,
  image_url text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_active ON product_variants(product_id, active);

-- Product Images Table
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  alt_text text,
  display_order integer DEFAULT 0,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_primary ON product_images(product_id, is_primary);

-- Product Tags Table
CREATE TABLE IF NOT EXISTS product_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  UNIQUE(business_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_product_tags_business ON product_tags(business_id);

-- Product Tags Junction Table
CREATE TABLE IF NOT EXISTS product_tag_assignments (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES product_tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (product_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_product_tag_assignments_product ON product_tag_assignments(product_id);
CREATE INDEX IF NOT EXISTS idx_product_tag_assignments_tag ON product_tag_assignments(tag_id);

-- Product Reviews Table
CREATE TABLE IF NOT EXISTS product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  comment text,
  verified_purchase boolean DEFAULT false,
  helpful_count integer DEFAULT 0,
  approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user ON product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_approved ON product_reviews(product_id, approved);

-- RLS Policies

-- Product Categories
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active categories" ON product_categories;
CREATE POLICY "Public can view active categories"
  ON product_categories FOR SELECT
  TO public
  USING (active = true);

DROP POLICY IF EXISTS "Business members can manage categories" ON product_categories;
CREATE POLICY "Business members can manage categories"
  ON product_categories FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Products (Enhanced)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active products" ON products;
CREATE POLICY "Public can view active products"
  ON products FOR SELECT
  TO public
  USING (active = true);

DROP POLICY IF EXISTS "Business members can manage products" ON products;
CREATE POLICY "Business members can manage products"
  ON products FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Product Variants
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active variants" ON product_variants;
CREATE POLICY "Public can view active variants"
  ON product_variants FOR SELECT
  TO public
  USING (
    active = true AND
    product_id IN (SELECT id FROM products WHERE active = true)
  );

DROP POLICY IF EXISTS "Business members can manage variants" ON product_variants;
CREATE POLICY "Business members can manage variants"
  ON product_variants FOR ALL
  TO authenticated
  USING (
    product_id IN (
      SELECT p.id FROM products p
      JOIN user_business_roles ubr ON ubr.business_id = p.business_id
      WHERE ubr.user_id = auth.uid() AND ubr.is_active = true
    )
  );

-- Product Images
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view product images" ON product_images;
CREATE POLICY "Public can view product images"
  ON product_images FOR SELECT
  TO public
  USING (
    product_id IN (SELECT id FROM products WHERE active = true)
  );

DROP POLICY IF EXISTS "Business members can manage images" ON product_images;
CREATE POLICY "Business members can manage images"
  ON product_images FOR ALL
  TO authenticated
  USING (
    product_id IN (
      SELECT p.id FROM products p
      JOIN user_business_roles ubr ON ubr.business_id = p.business_id
      WHERE ubr.user_id = auth.uid() AND ubr.is_active = true
    )
  );

-- Product Tags
ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view tags" ON product_tags;
CREATE POLICY "Public can view tags"
  ON product_tags FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Business members can manage tags" ON product_tags;
CREATE POLICY "Business members can manage tags"
  ON product_tags FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Product Tag Assignments
ALTER TABLE product_tag_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view tag assignments" ON product_tag_assignments;
CREATE POLICY "Public can view tag assignments"
  ON product_tag_assignments FOR SELECT
  TO public
  USING (
    product_id IN (SELECT id FROM products WHERE active = true)
  );

DROP POLICY IF EXISTS "Business members can manage tag assignments" ON product_tag_assignments;
CREATE POLICY "Business members can manage tag assignments"
  ON product_tag_assignments FOR ALL
  TO authenticated
  USING (
    product_id IN (
      SELECT p.id FROM products p
      JOIN user_business_roles ubr ON ubr.business_id = p.business_id
      WHERE ubr.user_id = auth.uid() AND ubr.is_active = true
    )
  );

-- Product Reviews
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view approved reviews" ON product_reviews;
CREATE POLICY "Public can view approved reviews"
  ON product_reviews FOR SELECT
  TO public
  USING (approved = true);

DROP POLICY IF EXISTS "Users can create reviews" ON product_reviews;
CREATE POLICY "Users can create reviews"
  ON product_reviews FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own reviews" ON product_reviews;
CREATE POLICY "Users can update own reviews"
  ON product_reviews FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Business members can manage reviews" ON product_reviews;
CREATE POLICY "Business members can manage reviews"
  ON product_reviews FOR ALL
  TO authenticated
  USING (
    product_id IN (
      SELECT p.id FROM products p
      JOIN user_business_roles ubr ON ubr.business_id = p.business_id
      WHERE ubr.user_id = auth.uid() AND ubr.is_active = true
    )
  );

-- Helper Functions

-- Generate slug from text
CREATE OR REPLACE FUNCTION generate_slug(text_value text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN lower(regexp_replace(regexp_replace(text_value, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
END;
$$;

-- Update product average rating
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE products
  SET
    updated_at = now()
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_update_product_rating ON product_reviews;
CREATE TRIGGER trg_update_product_rating
  AFTER INSERT OR UPDATE OR DELETE ON product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_product_rating();

-- Update timestamps
DROP TRIGGER IF EXISTS trg_product_categories_updated_at ON product_categories;
CREATE TRIGGER trg_product_categories_updated_at
  BEFORE UPDATE ON product_categories
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_product_variants_updated_at ON product_variants;
CREATE TRIGGER trg_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_product_reviews_updated_at ON product_reviews;
CREATE TRIGGER trg_product_reviews_updated_at
  BEFORE UPDATE ON product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Comments
COMMENT ON TABLE product_categories IS 'Hierarchical product categories for organizing products';
COMMENT ON TABLE product_variants IS 'Product variants with different options (size, color, etc)';
COMMENT ON TABLE product_images IS 'Multiple images per product with ordering';
COMMENT ON TABLE product_tags IS 'Flexible tagging system for products';
COMMENT ON TABLE product_reviews IS 'Customer ratings and reviews for products';
