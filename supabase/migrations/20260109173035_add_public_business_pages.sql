/*
  # Add Public Business Pages Support

  1. Changes
    - Add public visibility fields to businesses table
    - Add slug field for SEO-friendly URLs
    - Add banner_image_url, tagline, and contact information
    - Add products.is_published field for catalog visibility
    - Create function to generate unique slugs
    - Add RLS policies for public access

  2. Security
    - Allow anonymous users to read public businesses
    - Allow anonymous users to read published products
    - Business owners can manage their public settings
*/

-- Add public business fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' AND column_name = 'slug'
  ) THEN
    ALTER TABLE businesses ADD COLUMN slug TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE businesses ADD COLUMN is_public BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' AND column_name = 'banner_image_url'
  ) THEN
    ALTER TABLE businesses ADD COLUMN banner_image_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' AND column_name = 'tagline'
  ) THEN
    ALTER TABLE businesses ADD COLUMN tagline TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' AND column_name = 'public_email'
  ) THEN
    ALTER TABLE businesses ADD COLUMN public_email TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' AND column_name = 'public_phone'
  ) THEN
    ALTER TABLE businesses ADD COLUMN public_phone TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' AND column_name = 'description'
  ) THEN
    ALTER TABLE businesses ADD COLUMN description TEXT;
  END IF;
END $$;

-- Add product visibility field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'is_published'
  ) THEN
    ALTER TABLE products ADD COLUMN is_published BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Function to generate unique slug from business name
CREATE OR REPLACE FUNCTION generate_business_slug(business_name TEXT, business_id UUID)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert to lowercase, replace spaces and special chars with hyphens
  base_slug := lower(regexp_replace(business_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  
  final_slug := base_slug;
  
  -- Check for uniqueness and append counter if needed
  WHILE EXISTS (
    SELECT 1 FROM businesses 
    WHERE slug = final_slug AND id != business_id
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Generate slugs for existing businesses that don't have one
UPDATE businesses 
SET slug = generate_business_slug(name, id)
WHERE slug IS NULL;

-- Add index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug);
CREATE INDEX IF NOT EXISTS idx_businesses_is_public ON businesses(is_public);
CREATE INDEX IF NOT EXISTS idx_products_is_published ON products(is_published);

-- RLS Policy: Allow anonymous users to read public businesses
DROP POLICY IF EXISTS "Anonymous can view public businesses" ON businesses;
CREATE POLICY "Anonymous can view public businesses"
  ON businesses
  FOR SELECT
  TO anon
  USING (is_public = true);

-- RLS Policy: Allow authenticated users to read public businesses
DROP POLICY IF EXISTS "Authenticated can view public businesses" ON businesses;
CREATE POLICY "Authenticated can view public businesses"
  ON businesses
  FOR SELECT
  TO authenticated
  USING (is_public = true OR owner_id = auth.uid());

-- RLS Policy: Allow anonymous users to read published products from public businesses
DROP POLICY IF EXISTS "Anonymous can view published products" ON products;
CREATE POLICY "Anonymous can view published products"
  ON products
  FOR SELECT
  TO anon
  USING (
    is_published = true 
    AND EXISTS (
      SELECT 1 FROM businesses 
      WHERE businesses.id = products.business_id 
      AND businesses.is_public = true
    )
  );

-- RLS Policy: Allow authenticated users to read published products
DROP POLICY IF EXISTS "Authenticated can view published products" ON products;
CREATE POLICY "Authenticated can view published products"
  ON products
  FOR SELECT
  TO authenticated
  USING (
    is_published = true 
    AND EXISTS (
      SELECT 1 FROM businesses 
      WHERE businesses.id = products.business_id 
      AND businesses.is_public = true
    )
  );