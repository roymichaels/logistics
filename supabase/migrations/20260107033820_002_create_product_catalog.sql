-- Product Catalog Tables
--
-- 1. New Tables
--    - products: Product catalog with business context
--    - product_categories: Category hierarchy
--    - product_variants: Size, color, etc variations
--    - product_images: Multiple images per product
--
-- 2. Security
--    - Products: Business staff can manage, public can view active
--    - Categories: Business owners manage, public can view
--    - Variants/Images: Follow product permissions

-- Create product_categories table
CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES product_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  name_hebrew text,
  slug text NOT NULL,
  description text,
  image_url text,
  display_order int DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(business_id, slug)
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id uuid REFERENCES product_categories(id) ON DELETE SET NULL,
  sku text,
  name text NOT NULL,
  name_hebrew text,
  description text,
  description_hebrew text,
  price decimal(10, 2) NOT NULL DEFAULT 0,
  cost decimal(10, 2) DEFAULT 0,
  compare_at_price decimal(10, 2),
  currency text DEFAULT 'USD',
  unit text DEFAULT 'unit',
  weight_kg decimal(10, 3),
  barcode text,
  image_url text,
  images jsonb DEFAULT '[]',
  tags jsonb DEFAULT '[]',
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'out_of_stock', 'discontinued')),
  is_featured boolean DEFAULT false,
  track_inventory boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(business_id, sku)
);

-- Create product_variants table
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku text,
  name text NOT NULL,
  price decimal(10, 2),
  compare_at_price decimal(10, 2),
  cost decimal(10, 2),
  weight_kg decimal(10, 3),
  barcode text,
  image_url text,
  options jsonb DEFAULT '{}',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create product_images table
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt_text text,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Product categories policies
CREATE POLICY "Business owners can manage categories"
  ON product_categories FOR ALL
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

CREATE POLICY "Staff can view categories"
  ON product_categories FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "Public can view active categories"
  ON product_categories FOR SELECT
  TO anon
  USING (active = true);

-- Products policies
CREATE POLICY "Business owners can manage products"
  ON products FOR ALL
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

CREATE POLICY "Managers can manage products"
  ON products FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'warehouse')
      AND active = true
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM user_business_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'warehouse')
      AND active = true
    )
  );

CREATE POLICY "Staff can view products"
  ON products FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "Public can view active products"
  ON products FOR SELECT
  TO anon
  USING (status = 'active');

-- Product variants policies
CREATE POLICY "Product owners can manage variants"
  ON product_variants FOR ALL
  TO authenticated
  USING (
    product_id IN (
      SELECT id FROM products WHERE business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Staff can view variants"
  ON product_variants FOR SELECT
  TO authenticated
  USING (
    product_id IN (
      SELECT id FROM products WHERE business_id IN (
        SELECT business_id FROM user_business_roles WHERE user_id = auth.uid() AND active = true
      )
    )
  );

CREATE POLICY "Public can view active variants"
  ON product_variants FOR SELECT
  TO anon
  USING (active = true);

-- Product images policies  
CREATE POLICY "Product owners can manage images"
  ON product_images FOR ALL
  TO authenticated
  USING (
    product_id IN (
      SELECT id FROM products WHERE business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Public can view images"
  ON product_images FOR SELECT
  TO anon, authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS product_categories_business_id_idx ON product_categories(business_id);
CREATE INDEX IF NOT EXISTS product_categories_parent_id_idx ON product_categories(parent_id);
CREATE INDEX IF NOT EXISTS products_business_id_idx ON products(business_id);
CREATE INDEX IF NOT EXISTS products_category_id_idx ON products(category_id);
CREATE INDEX IF NOT EXISTS products_sku_idx ON products(sku);
CREATE INDEX IF NOT EXISTS products_status_idx ON products(status);
CREATE INDEX IF NOT EXISTS product_variants_product_id_idx ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS product_images_product_id_idx ON product_images(product_id);