/*
  # Create Business Templates System

  1. New Fields
    - Add `setup_completed` boolean to businesses table
    - Add `setup_checklist` jsonb to track onboarding progress
    - Add `is_template_applied` boolean to track initialization

  2. Platform Business
    - Create a special platform business for general catalog
    - This business holds products visible to all customers

  3. Template Functions
    - `seed_business_template()` - Initializes new business with template data
    - `get_platform_catalog()` - Returns all published products from public businesses

  4. Security
    - Platform business is public by default
    - Template products are marked unpublished for customization
    - RLS policies allow reading platform catalog without auth
*/

-- Add template tracking fields to businesses
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS setup_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS setup_checklist jsonb DEFAULT '{"description": false, "logo": false, "products": false, "contact": false, "public": false}'::jsonb,
ADD COLUMN IF NOT EXISTS is_template_applied boolean DEFAULT false;

-- Temporarily make changed_by nullable for product_versions
ALTER TABLE product_versions
ALTER COLUMN changed_by DROP NOT NULL;

-- Create system profile for platform business
DO $$
DECLARE
  v_system_profile_id uuid := '00000000-0000-0000-0000-000000000000';
  v_platform_business_id uuid;
  v_category_id uuid;
BEGIN
  -- Create system profile if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_system_profile_id) THEN
    INSERT INTO profiles (id, role, name, created_at, updated_at)
    VALUES (
      v_system_profile_id,
      'superadmin',
      'Platform System',
      NOW(),
      NOW()
    );
  END IF;

  -- Check if platform business already exists
  SELECT id INTO v_platform_business_id
  FROM businesses
  WHERE slug = 'platform-general-store';

  -- Create platform business if it doesn't exist
  IF v_platform_business_id IS NULL THEN
    INSERT INTO businesses (
      owner_id,
      name,
      name_hebrew,
      slug,
      description,
      business_type,
      status,
      is_public,
      order_number_prefix,
      default_currency,
      primary_color,
      secondary_color,
      tagline,
      settings,
      setup_completed,
      is_template_applied
    ) VALUES (
      v_system_profile_id,
      'Platform Store',
      'חנות הפלטפורמה',
      'platform-general-store',
      'General platform store showcasing security and privacy products',
      'platform',
      'active',
      true,
      'PLT',
      'ILS',
      '#3b82f6',
      '#1e40af',
      'ציוד אבטחה ברמה ארגונית',
      '{
        "delivery_enabled": true,
        "pickup_enabled": true,
        "minimum_order": 0,
        "delivery_fee": 0,
        "is_platform_business": true
      }'::jsonb,
      true,
      true
    )
    RETURNING id INTO v_platform_business_id;

    -- Create a general category for platform products
    INSERT INTO product_categories (
      business_id,
      name,
      name_hebrew,
      slug,
      description,
      active
    ) VALUES (
      v_platform_business_id,
      'Security Products',
      'מוצרי אבטחה',
      'security-products',
      'General security and privacy products',
      true
    )
    RETURNING id INTO v_category_id;

    -- Add some sample platform products
    INSERT INTO products (
      business_id,
      category_id,
      name,
      name_hebrew,
      description,
      description_hebrew,
      price,
      currency,
      status,
      is_published,
      image_url,
      sku
    ) VALUES
      (
        v_platform_business_id,
        v_category_id,
        'Secure Smartphone Bundle',
        'ערכת סמארטפון מאובטח',
        'Enterprise-grade secure smartphone with encrypted communication',
        'סמארטפון ברמה ארגונית עם תקשורת מוצפנת',
        2999.00,
        'ILS',
        'active',
        true,
        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500',
        'PLT-PHONE-001'
      ),
      (
        v_platform_business_id,
        v_category_id,
        'Hardware Security Key',
        'מפתח אבטחה חומרתי',
        'FIDO2 certified hardware authentication key',
        'מפתח אימות חומרתי מאושר FIDO2',
        199.00,
        'ILS',
        'active',
        true,
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500',
        'PLT-KEY-001'
      ),
      (
        v_platform_business_id,
        v_category_id,
        'Privacy Screen Protector',
        'מגן מסך פרטיות',
        'Anti-spy tempered glass screen protector',
        'מגן מסך זכוכית מחוסם אנטי ריגול',
        89.00,
        'ILS',
        'active',
        true,
        'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=500',
        'PLT-SCREEN-001'
      ),
      (
        v_platform_business_id,
        v_category_id,
        'Encrypted USB Drive',
        'כונן USB מוצפן',
        '256GB USB drive with AES-256 hardware encryption',
        'כונן USB 256GB עם הצפנת חומרה AES-256',
        349.00,
        'ILS',
        'active',
        true,
        'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=500',
        'PLT-USB-001'
      ),
      (
        v_platform_business_id,
        v_category_id,
        'Network Security Router',
        'נתב אבטחת רשת',
        'Enterprise VPN router with advanced firewall',
        'נתב VPN ארגוני עם חומת אש מתקדמת',
        1299.00,
        'ILS',
        'active',
        true,
        'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=500',
        'PLT-ROUTER-001'
      );
  END IF;
END $$;

-- Function to seed template data for new businesses
CREATE OR REPLACE FUNCTION seed_business_template(p_business_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business businesses;
  v_category_id uuid;
BEGIN
  -- Get business details
  SELECT * INTO v_business FROM businesses WHERE id = p_business_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found: %', p_business_id;
  END IF;

  -- Skip if template already applied
  IF v_business.is_template_applied THEN
    RETURN;
  END IF;

  -- Create a general category for template products
  INSERT INTO product_categories (
    business_id,
    name,
    name_hebrew,
    slug,
    description,
    active
  ) VALUES (
    p_business_id,
    'General',
    'כללי',
    'general',
    'General products category',
    true
  )
  RETURNING id INTO v_category_id;

  -- Insert template products (unpublished by default)
  INSERT INTO products (
    business_id,
    category_id,
    name,
    name_hebrew,
    description,
    description_hebrew,
    price,
    currency,
    status,
    is_published,
    sku
  ) VALUES
    (
      p_business_id,
      v_category_id,
      'Sample Product 1',
      'מוצר לדוגמה 1',
      'This is a sample product. Edit or delete this to add your real products.',
      'זהו מוצר לדוגמה. ערוך או מחק אותו כדי להוסיף את המוצרים האמיתיים שלך.',
      99.00,
      v_business.default_currency,
      'draft',
      false,
      CONCAT(v_business.order_number_prefix, '-SAMPLE-001')
    ),
    (
      p_business_id,
      v_category_id,
      'Sample Product 2',
      'מוצר לדוגמה 2',
      'Another sample product to help you get started. Customize as needed.',
      'מוצר לדוגמה נוסף שיעזור לך להתחיל. התאם אישית לפי הצורך.',
      149.00,
      v_business.default_currency,
      'draft',
      false,
      CONCAT(v_business.order_number_prefix, '-SAMPLE-002')
    ),
    (
      p_business_id,
      v_category_id,
      'Sample Product 3',
      'מוצר לדוגמה 3',
      'Template product to demonstrate your catalog. Replace with actual inventory.',
      'מוצר תבנית להדגמת הקטלוג שלך. החלף במלאי בפועל.',
      199.00,
      v_business.default_currency,
      'draft',
      false,
      CONCAT(v_business.order_number_prefix, '-SAMPLE-003')
    );

  -- Mark template as applied
  UPDATE businesses
  SET is_template_applied = true,
      description = COALESCE(description, 'Welcome to our store! We offer high-quality products and excellent service.'),
      tagline = COALESCE(tagline, 'Your trusted partner')
  WHERE id = p_business_id;

END;
$$;

-- Update create_business_for_user to apply template automatically
CREATE OR REPLACE FUNCTION create_business_for_user(
  p_owner_id uuid,
  p_name text,
  p_slug text,
  p_name_hebrew text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_business_type text DEFAULT 'retail',
  p_order_number_prefix text DEFAULT 'ORD',
  p_default_currency text DEFAULT 'USD',
  p_primary_color text DEFAULT '#1e40af',
  p_secondary_color text DEFAULT '#3b82f6'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business businesses;
  v_profile_exists boolean;
BEGIN
  -- Check if profile exists
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_owner_id
  ) INTO v_profile_exists;

  IF NOT v_profile_exists THEN
    RAISE EXCEPTION 'Profile not found for user %', p_owner_id;
  END IF;

  -- Insert business with public enabled by default
  INSERT INTO businesses (
    owner_id,
    name,
    name_hebrew,
    slug,
    description,
    business_type,
    status,
    is_public,
    order_number_prefix,
    default_currency,
    primary_color,
    secondary_color,
    settings,
    setup_completed,
    is_template_applied
  ) VALUES (
    p_owner_id,
    p_name,
    p_name_hebrew,
    p_slug,
    COALESCE(p_description, 'Welcome to our store!'),
    p_business_type,
    'active',
    true,
    p_order_number_prefix,
    p_default_currency,
    p_primary_color,
    p_secondary_color,
    '{}'::jsonb,
    false,
    false
  )
  RETURNING * INTO v_business;

  -- Update user role to business_owner if not already
  UPDATE profiles
  SET role = 'business_owner'
  WHERE id = p_owner_id
    AND role NOT IN ('superadmin', 'admin', 'business_owner');

  -- Apply business template
  PERFORM seed_business_template(v_business.id);

  -- Return business data as JSON
  RETURN row_to_json(v_business);
END;
$$;

-- Function to get platform catalog (all products from public businesses)
CREATE OR REPLACE FUNCTION get_platform_catalog()
RETURNS TABLE (
  id uuid,
  business_id uuid,
  business_name text,
  business_name_hebrew text,
  name text,
  name_hebrew text,
  description text,
  price numeric,
  currency text,
  image_url text,
  sku text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.business_id,
    b.name as business_name,
    b.name_hebrew as business_name_hebrew,
    p.name,
    p.name_hebrew,
    p.description,
    p.price,
    p.currency,
    p.image_url,
    p.sku
  FROM products p
  INNER JOIN businesses b ON p.business_id = b.id
  WHERE b.is_public = true
    AND b.status = 'active'
    AND p.is_published = true
    AND p.status = 'active'
  ORDER BY b.name, p.name;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION seed_business_template TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_catalog TO anon, authenticated;

-- Create index for faster catalog queries
CREATE INDEX IF NOT EXISTS idx_products_published_business
  ON products(business_id, is_published)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_businesses_public_active
  ON businesses(is_public, status)
  WHERE is_public = true AND status = 'active';

COMMENT ON FUNCTION seed_business_template IS
  'Seeds a new business with template products and default settings';

COMMENT ON FUNCTION get_platform_catalog IS
  'Returns all published products from public businesses for the platform catalog';
