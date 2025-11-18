/*
  # Enhanced Business Pages System

  Creates comprehensive business page functionality allowing business owners to
  create customizable, public-facing business pages with rich content.

  ## New Tables

  1. `business_pages`
    - Main business page configuration
    - SEO metadata, cover images, branding
    - Public visibility settings
    - One-to-one relationship with businesses

  2. `business_page_sections`
    - Flexible content blocks (about, services, gallery, etc)
    - Drag-and-drop ordering support
    - Rich text content support
    - Per-section visibility controls

  3. `business_page_gallery`
    - Multiple photo galleries
    - Image captions and ordering
    - Category-based organization

  4. `business_operating_hours`
    - Structured day-specific hours
    - Support for multiple time ranges per day
    - Special hours for holidays
    - Open/closed status

  5. `business_amenities`
    - Business features and facilities
    - Category-based organization
    - Custom icons and descriptions

  6. `business_page_analytics`
    - Page view tracking
    - Visitor engagement metrics
    - Source tracking

  ## Security
  - RLS enabled on all tables
  - Public read access for active business pages
  - Business owners can manage their own pages
  - Superadmins have full access
*/

-- =====================================================
-- ENUMS
-- =====================================================

DO $$ BEGIN
  CREATE TYPE business_page_section_type AS ENUM (
    'about',
    'services',
    'amenities',
    'gallery',
    'testimonials',
    'team',
    'custom'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE day_of_week AS ENUM (
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 1. BUSINESS_PAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS business_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,

  -- Basic Info
  page_title text NOT NULL,
  page_slug text UNIQUE,
  tagline text,
  about_business text,
  story text,

  -- Media
  cover_image_url text,
  video_url text,

  -- Contact & Location
  display_phone text,
  display_email text,
  website_url text,
  address_line1 text,
  address_line2 text,
  city text,
  state_province text,
  postal_code text,
  country text DEFAULT 'Israel',
  latitude decimal(10, 8),
  longitude decimal(11, 8),

  -- Social Media
  facebook_url text,
  instagram_url text,
  twitter_url text,
  linkedin_url text,
  whatsapp_number text,
  telegram_channel text,

  -- SEO & Metadata
  meta_title text,
  meta_description text,
  meta_keywords text[],
  og_image_url text,

  -- Settings
  is_published boolean DEFAULT false,
  show_contact_form boolean DEFAULT true,
  show_reviews boolean DEFAULT true,
  show_operating_hours boolean DEFAULT true,
  allow_bookings boolean DEFAULT false,

  -- Branding
  primary_brand_color text DEFAULT '#000000',
  secondary_brand_color text DEFAULT '#ffffff',
  custom_css text,

  -- Analytics
  view_count integer DEFAULT 0,
  total_inquiries integer DEFAULT 0,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  published_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_business_pages_business ON business_pages(business_id);
CREATE INDEX IF NOT EXISTS idx_business_pages_slug ON business_pages(page_slug);
CREATE INDEX IF NOT EXISTS idx_business_pages_published ON business_pages(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_business_pages_location ON business_pages USING gist(ll_to_earth(latitude::float8, longitude::float8));

-- =====================================================
-- 2. BUSINESS_PAGE_SECTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS business_page_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_page_id uuid NOT NULL REFERENCES business_pages(id) ON DELETE CASCADE,

  section_type business_page_section_type NOT NULL,
  section_title text NOT NULL,
  section_subtitle text,
  content text,
  content_html text,

  -- Media
  image_url text,
  icon text,

  -- Layout
  display_order integer NOT NULL DEFAULT 0,
  layout_style text DEFAULT 'default',
  background_color text,
  text_color text,

  -- Settings
  is_visible boolean DEFAULT true,

  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_sections_page ON business_page_sections(business_page_id);
CREATE INDEX IF NOT EXISTS idx_page_sections_order ON business_page_sections(business_page_id, display_order);
CREATE INDEX IF NOT EXISTS idx_page_sections_type ON business_page_sections(section_type);
CREATE INDEX IF NOT EXISTS idx_page_sections_visible ON business_page_sections(is_visible) WHERE is_visible = true;

-- =====================================================
-- 3. BUSINESS_PAGE_GALLERY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS business_page_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_page_id uuid NOT NULL REFERENCES business_pages(id) ON DELETE CASCADE,

  image_url text NOT NULL,
  thumbnail_url text,
  title text,
  description text,
  alt_text text,

  -- Organization
  category text,
  display_order integer DEFAULT 0,
  is_featured boolean DEFAULT false,

  -- Metadata
  width integer,
  height integer,
  file_size integer,
  mime_type text,

  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gallery_page ON business_page_gallery(business_page_id);
CREATE INDEX IF NOT EXISTS idx_gallery_order ON business_page_gallery(business_page_id, display_order);
CREATE INDEX IF NOT EXISTS idx_gallery_featured ON business_page_gallery(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_gallery_category ON business_page_gallery(category);

-- =====================================================
-- 4. BUSINESS_OPERATING_HOURS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS business_operating_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  day_of_week day_of_week NOT NULL,
  is_open boolean DEFAULT true,

  -- Support multiple time ranges per day (e.g., lunch break)
  open_time1 time,
  close_time1 time,
  open_time2 time,
  close_time2 time,

  -- Special notes
  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(business_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_operating_hours_business ON business_operating_hours(business_id);
CREATE INDEX IF NOT EXISTS idx_operating_hours_day ON business_operating_hours(day_of_week);

-- =====================================================
-- 5. BUSINESS_AMENITIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS business_amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  category text NOT NULL,
  name text NOT NULL,
  icon text,
  description text,
  is_available boolean DEFAULT true,

  display_order integer DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_amenities_business ON business_amenities(business_id);
CREATE INDEX IF NOT EXISTS idx_amenities_category ON business_amenities(category);
CREATE INDEX IF NOT EXISTS idx_amenities_available ON business_amenities(is_available) WHERE is_available = true;

-- =====================================================
-- 6. BUSINESS_PAGE_ANALYTICS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS business_page_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_page_id uuid NOT NULL REFERENCES business_pages(id) ON DELETE CASCADE,

  -- Visitor Info
  visitor_id text,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,

  -- Event Data
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,

  -- Source Tracking
  referrer_url text,
  source text,
  medium text,
  campaign text,

  -- Device Info
  user_agent text,
  device_type text,
  browser text,
  os text,

  -- Location
  ip_address inet,
  country text,
  city text,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_page ON business_page_analytics(business_page_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event ON business_page_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON business_page_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_visitor ON business_page_analytics(visitor_id);

-- =====================================================
-- 7. SPECIAL_HOURS TABLE (Holidays, Events)
-- =====================================================

CREATE TABLE IF NOT EXISTS business_special_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  date date NOT NULL,
  is_open boolean DEFAULT false,

  open_time time,
  close_time time,

  reason text,
  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(business_id, date)
);

CREATE INDEX IF NOT EXISTS idx_special_hours_business ON business_special_hours(business_id);
CREATE INDEX IF NOT EXISTS idx_special_hours_date ON business_special_hours(date);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE business_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_page_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_page_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_operating_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_page_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_special_hours ENABLE ROW LEVEL SECURITY;

-- Business Pages: Public read for published pages
CREATE POLICY "Public can view published business pages"
  ON business_pages FOR SELECT
  TO public
  USING (is_published = true);

CREATE POLICY "Business owners can view their business pages"
  ON business_pages FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
    )
    OR auth.uid() IN (
      SELECT id FROM users WHERE role = 'superadmin' OR global_role = 'superadmin'
    )
  );

CREATE POLICY "Business owners can create their business pages"
  ON business_pages FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
      AND role IN ('business_owner', 'manager')
    )
    OR auth.uid() IN (
      SELECT id FROM users WHERE role = 'superadmin' OR global_role = 'superadmin'
    )
  );

CREATE POLICY "Business owners can update their business pages"
  ON business_pages FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
      AND role IN ('business_owner', 'manager')
    )
    OR auth.uid() IN (
      SELECT id FROM users WHERE role = 'superadmin' OR global_role = 'superadmin'
    )
  );

-- Page Sections: Public read for published pages
CREATE POLICY "Public can view sections of published pages"
  ON business_page_sections FOR SELECT
  TO public
  USING (
    is_visible = true
    AND business_page_id IN (
      SELECT id FROM business_pages WHERE is_published = true
    )
  );

CREATE POLICY "Business owners can manage their page sections"
  ON business_page_sections FOR ALL
  TO authenticated
  USING (
    business_page_id IN (
      SELECT bp.id FROM business_pages bp
      INNER JOIN business_memberships bm ON bp.business_id = bm.business_id
      WHERE bm.user_id = auth.uid()
      AND bm.role IN ('business_owner', 'manager')
    )
    OR auth.uid() IN (
      SELECT id FROM users WHERE role = 'superadmin' OR global_role = 'superadmin'
    )
  )
  WITH CHECK (
    business_page_id IN (
      SELECT bp.id FROM business_pages bp
      INNER JOIN business_memberships bm ON bp.business_id = bm.business_id
      WHERE bm.user_id = auth.uid()
      AND bm.role IN ('business_owner', 'manager')
    )
    OR auth.uid() IN (
      SELECT id FROM users WHERE role = 'superadmin' OR global_role = 'superadmin'
    )
  );

-- Gallery: Public read for published pages
CREATE POLICY "Public can view gallery of published pages"
  ON business_page_gallery FOR SELECT
  TO public
  USING (
    business_page_id IN (
      SELECT id FROM business_pages WHERE is_published = true
    )
  );

CREATE POLICY "Business owners can manage their gallery"
  ON business_page_gallery FOR ALL
  TO authenticated
  USING (
    business_page_id IN (
      SELECT bp.id FROM business_pages bp
      INNER JOIN business_memberships bm ON bp.business_id = bm.business_id
      WHERE bm.user_id = auth.uid()
      AND bm.role IN ('business_owner', 'manager')
    )
    OR auth.uid() IN (
      SELECT id FROM users WHERE role = 'superadmin' OR global_role = 'superadmin'
    )
  );

-- Operating Hours: Public read
CREATE POLICY "Public can view business operating hours"
  ON business_operating_hours FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Business owners can manage their operating hours"
  ON business_operating_hours FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
      AND role IN ('business_owner', 'manager')
    )
    OR auth.uid() IN (
      SELECT id FROM users WHERE role = 'superadmin' OR global_role = 'superadmin'
    )
  );

-- Amenities: Public read
CREATE POLICY "Public can view business amenities"
  ON business_amenities FOR SELECT
  TO public
  USING (is_available = true);

CREATE POLICY "Business owners can manage their amenities"
  ON business_amenities FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
      AND role IN ('business_owner', 'manager')
    )
    OR auth.uid() IN (
      SELECT id FROM users WHERE role = 'superadmin' OR global_role = 'superadmin'
    )
  );

-- Analytics: Business owners only
CREATE POLICY "Business owners can view their analytics"
  ON business_page_analytics FOR SELECT
  TO authenticated
  USING (
    business_page_id IN (
      SELECT bp.id FROM business_pages bp
      INNER JOIN business_memberships bm ON bp.business_id = bm.business_id
      WHERE bm.user_id = auth.uid()
    )
    OR auth.uid() IN (
      SELECT id FROM users WHERE role = 'superadmin' OR global_role = 'superadmin'
    )
  );

CREATE POLICY "Anyone can insert analytics events"
  ON business_page_analytics FOR INSERT
  TO public
  WITH CHECK (true);

-- Special Hours: Public read
CREATE POLICY "Public can view special hours"
  ON business_special_hours FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Business owners can manage special hours"
  ON business_special_hours FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
      AND role IN ('business_owner', 'manager')
    )
    OR auth.uid() IN (
      SELECT id FROM users WHERE role = 'superadmin' OR global_role = 'superadmin'
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_business_page_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_business_pages_updated_at ON business_pages;
CREATE TRIGGER update_business_pages_updated_at
  BEFORE UPDATE ON business_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_business_page_updated_at();

DROP TRIGGER IF EXISTS update_page_sections_updated_at ON business_page_sections;
CREATE TRIGGER update_page_sections_updated_at
  BEFORE UPDATE ON business_page_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_business_page_updated_at();

DROP TRIGGER IF EXISTS update_operating_hours_updated_at ON business_operating_hours;
CREATE TRIGGER update_operating_hours_updated_at
  BEFORE UPDATE ON business_operating_hours
  FOR EACH ROW
  EXECUTE FUNCTION update_business_page_updated_at();

DROP TRIGGER IF EXISTS update_amenities_updated_at ON business_amenities;
CREATE TRIGGER update_amenities_updated_at
  BEFORE UPDATE ON business_amenities
  FOR EACH ROW
  EXECUTE FUNCTION update_business_page_updated_at();

DROP TRIGGER IF EXISTS update_special_hours_updated_at ON business_special_hours;
CREATE TRIGGER update_special_hours_updated_at
  BEFORE UPDATE ON business_special_hours
  FOR EACH ROW
  EXECUTE FUNCTION update_business_page_updated_at();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get business page with all related data
CREATE OR REPLACE FUNCTION get_business_page_full(page_slug_input text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'page', row_to_json(bp.*),
    'sections', (
      SELECT jsonb_agg(row_to_json(bps.*) ORDER BY bps.display_order)
      FROM business_page_sections bps
      WHERE bps.business_page_id = bp.id AND bps.is_visible = true
    ),
    'gallery', (
      SELECT jsonb_agg(row_to_json(bpg.*) ORDER BY bpg.display_order)
      FROM business_page_gallery bpg
      WHERE bpg.business_page_id = bp.id
    ),
    'operating_hours', (
      SELECT jsonb_agg(row_to_json(boh.*))
      FROM business_operating_hours boh
      WHERE boh.business_id = bp.business_id
    ),
    'amenities', (
      SELECT jsonb_agg(row_to_json(ba.*))
      FROM business_amenities ba
      WHERE ba.business_id = bp.business_id AND ba.is_available = true
    )
  ) INTO result
  FROM business_pages bp
  WHERE bp.page_slug = page_slug_input AND bp.is_published = true;

  RETURN result;
END;
$$;

-- Function to check if business is currently open
CREATE OR REPLACE FUNCTION is_business_open_now(business_id_input uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  current_day day_of_week;
  current_time time;
  is_open boolean;
  special_date_open boolean;
BEGIN
  current_day := lower(to_char(CURRENT_DATE, 'Day'))::day_of_week;
  current_time := CURRENT_TIME;

  -- Check for special hours first
  SELECT sh.is_open INTO special_date_open
  FROM business_special_hours sh
  WHERE sh.business_id = business_id_input
  AND sh.date = CURRENT_DATE;

  IF FOUND THEN
    RETURN special_date_open;
  END IF;

  -- Check regular hours
  SELECT
    CASE
      WHEN NOT oh.is_open THEN false
      WHEN oh.open_time1 IS NOT NULL AND oh.close_time1 IS NOT NULL THEN
        (current_time BETWEEN oh.open_time1 AND oh.close_time1)
        OR (oh.open_time2 IS NOT NULL AND oh.close_time2 IS NOT NULL
            AND current_time BETWEEN oh.open_time2 AND oh.close_time2)
      ELSE false
    END INTO is_open
  FROM business_operating_hours oh
  WHERE oh.business_id = business_id_input
  AND oh.day_of_week = current_day;

  RETURN COALESCE(is_open, false);
END;
$$;
