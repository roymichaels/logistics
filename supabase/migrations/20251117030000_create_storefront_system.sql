/*
  # Public Storefront System

  Creates storefront configuration and customization tables.

  ## New Tables

  1. `storefront_settings`
    - Business storefront configuration
    - Theme and branding
    - SEO settings

  2. `storefront_pages`
    - Custom pages (About, FAQ, etc)
    - Page content management
    - SEO optimization

  3. `storefront_navigation`
    - Custom navigation menus
    - Header and footer links
    - Menu ordering

  4. `storefront_banners`
    - Homepage banners
    - Promotional slides
    - Call-to-action buttons

  ## Security
  - RLS enabled on all tables
  - Public read access for active storefronts
  - Business owners manage settings
  - SEO-friendly public queries
*/

-- Storefront Settings Table
CREATE TABLE IF NOT EXISTS storefront_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  subdomain text UNIQUE,
  custom_domain text UNIQUE,
  store_name text NOT NULL,
  tagline text,
  description text,
  logo_url text,
  favicon_url text,
  primary_color text DEFAULT '#000000',
  secondary_color text DEFAULT '#ffffff',
  accent_color text DEFAULT '#007bff',
  font_family text DEFAULT 'Inter',
  currency text DEFAULT 'ILS',
  locale text DEFAULT 'he-IL',
  timezone text DEFAULT 'Asia/Jerusalem',
  contact_email text,
  contact_phone text,
  social_facebook text,
  social_instagram text,
  social_twitter text,
  social_whatsapp text,
  google_analytics_id text,
  facebook_pixel_id text,
  meta_title text,
  meta_description text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storefront_settings_business ON storefront_settings(business_id);
CREATE INDEX IF NOT EXISTS idx_storefront_settings_subdomain ON storefront_settings(subdomain);
CREATE INDEX IF NOT EXISTS idx_storefront_settings_active ON storefront_settings(active);

-- Storefront Pages Table
CREATE TABLE IF NOT EXISTS storefront_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  content text,
  excerpt text,
  featured_image_url text,
  page_type text DEFAULT 'custom' CHECK (page_type IN ('custom', 'about', 'contact', 'faq', 'terms', 'privacy')),
  meta_title text,
  meta_description text,
  active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(business_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_storefront_pages_business ON storefront_pages(business_id);
CREATE INDEX IF NOT EXISTS idx_storefront_pages_slug ON storefront_pages(business_id, slug);
CREATE INDEX IF NOT EXISTS idx_storefront_pages_active ON storefront_pages(business_id, active);

-- Storefront Navigation Table
CREATE TABLE IF NOT EXISTS storefront_navigation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  menu_location text NOT NULL CHECK (menu_location IN ('header', 'footer', 'mobile')),
  label text NOT NULL,
  link_type text NOT NULL CHECK (link_type IN ('page', 'category', 'external', 'custom')),
  link_target text,
  page_id uuid REFERENCES storefront_pages(id) ON DELETE CASCADE,
  category_id uuid REFERENCES product_categories(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES storefront_navigation(id) ON DELETE CASCADE,
  display_order integer DEFAULT 0,
  icon text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storefront_navigation_business ON storefront_navigation(business_id);
CREATE INDEX IF NOT EXISTS idx_storefront_navigation_location ON storefront_navigation(business_id, menu_location);
CREATE INDEX IF NOT EXISTS idx_storefront_navigation_parent ON storefront_navigation(parent_id);

-- Storefront Banners Table
CREATE TABLE IF NOT EXISTS storefront_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title text NOT NULL,
  subtitle text,
  image_url text NOT NULL,
  mobile_image_url text,
  button_text text,
  button_link text,
  background_color text,
  text_color text,
  display_order integer DEFAULT 0,
  active boolean DEFAULT true,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storefront_banners_business ON storefront_banners(business_id);
CREATE INDEX IF NOT EXISTS idx_storefront_banners_active ON storefront_banners(business_id, active);
CREATE INDEX IF NOT EXISTS idx_storefront_banners_dates ON storefront_banners(start_date, end_date);

-- RLS Policies

-- Storefront Settings
ALTER TABLE storefront_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active storefront settings" ON storefront_settings;
CREATE POLICY "Public can view active storefront settings"
  ON storefront_settings FOR SELECT
  TO public
  USING (active = true);

DROP POLICY IF EXISTS "Business members can manage storefront settings" ON storefront_settings;
CREATE POLICY "Business members can manage storefront settings"
  ON storefront_settings FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Storefront Pages
ALTER TABLE storefront_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active pages" ON storefront_pages;
CREATE POLICY "Public can view active pages"
  ON storefront_pages FOR SELECT
  TO public
  USING (active = true);

DROP POLICY IF EXISTS "Business members can manage pages" ON storefront_pages;
CREATE POLICY "Business members can manage pages"
  ON storefront_pages FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Storefront Navigation
ALTER TABLE storefront_navigation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active navigation" ON storefront_navigation;
CREATE POLICY "Public can view active navigation"
  ON storefront_navigation FOR SELECT
  TO public
  USING (active = true);

DROP POLICY IF EXISTS "Business members can manage navigation" ON storefront_navigation;
CREATE POLICY "Business members can manage navigation"
  ON storefront_navigation FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Storefront Banners
ALTER TABLE storefront_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active banners" ON storefront_banners;
CREATE POLICY "Public can view active banners"
  ON storefront_banners FOR SELECT
  TO public
  USING (
    active = true AND
    (start_date IS NULL OR start_date <= now()) AND
    (end_date IS NULL OR end_date >= now())
  );

DROP POLICY IF EXISTS "Business members can manage banners" ON storefront_banners;
CREATE POLICY "Business members can manage banners"
  ON storefront_banners FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Helper Functions

-- Get storefront by subdomain
CREATE OR REPLACE FUNCTION get_storefront_by_subdomain(p_subdomain text)
RETURNS TABLE (
  business_id uuid,
  store_name text,
  subdomain text,
  custom_domain text,
  logo_url text,
  primary_color text,
  secondary_color text,
  currency text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ss.business_id,
    ss.store_name,
    ss.subdomain,
    ss.custom_domain,
    ss.logo_url,
    ss.primary_color,
    ss.secondary_color,
    ss.currency
  FROM storefront_settings ss
  WHERE ss.subdomain = p_subdomain
    AND ss.active = true
  LIMIT 1;
END;
$$;

-- Get storefront by custom domain
CREATE OR REPLACE FUNCTION get_storefront_by_domain(p_domain text)
RETURNS TABLE (
  business_id uuid,
  store_name text,
  subdomain text,
  custom_domain text,
  logo_url text,
  primary_color text,
  secondary_color text,
  currency text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ss.business_id,
    ss.store_name,
    ss.subdomain,
    ss.custom_domain,
    ss.logo_url,
    ss.primary_color,
    ss.secondary_color,
    ss.currency
  FROM storefront_settings ss
  WHERE ss.custom_domain = p_domain
    AND ss.active = true
  LIMIT 1;
END;
$$;

-- Update timestamps
DROP TRIGGER IF EXISTS trg_storefront_settings_updated_at ON storefront_settings;
CREATE TRIGGER trg_storefront_settings_updated_at
  BEFORE UPDATE ON storefront_settings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_storefront_pages_updated_at ON storefront_pages;
CREATE TRIGGER trg_storefront_pages_updated_at
  BEFORE UPDATE ON storefront_pages
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_storefront_banners_updated_at ON storefront_banners;
CREATE TRIGGER trg_storefront_banners_updated_at
  BEFORE UPDATE ON storefront_banners
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Comments
COMMENT ON TABLE storefront_settings IS 'Business storefront configuration and branding';
COMMENT ON TABLE storefront_pages IS 'Custom pages for storefront (About, FAQ, etc)';
COMMENT ON TABLE storefront_navigation IS 'Custom navigation menus for storefront';
COMMENT ON TABLE storefront_banners IS 'Homepage promotional banners and slides';
