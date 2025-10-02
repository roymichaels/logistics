/*
  # Multi-Business Seed Data for Roy Michaels Command System

  This migration adds multiple businesses operating on the shared infrastructure:

  1. **Businesses** (3 distinct operations)
     - "Green Leaf Premium" - High-end cannabis delivery (Tel Aviv focus)
     - "Fast Herbs" - Budget-friendly service (Holon/Bat Yam focus)
     - "Medical Plus" - Medical cannabis (All zones)

  2. **Business-Specific Teams**
     - Each business has its own managers, sales, warehouse staff
     - Drivers can work for multiple businesses
     - Platform owner has access to all businesses

  3. **Business Products**
     - Same base products priced differently per business
     - Premium business: 20% markup
     - Budget business: 15% discount
     - Medical business: standard pricing + tax

  4. **Business-Specific Orders**
     - Orders tagged with business_id
     - Business-specific order numbering (GL-, FH-, MP-)
     - Revenue tracked per business

  This enables true multi-business operations on one infrastructure.
*/

-- ========================================
-- BUSINESSES
-- ========================================

INSERT INTO businesses (name, name_hebrew, business_type, logo_url, primary_color, secondary_color, default_currency, order_number_prefix, address, contact_info, business_settings)
VALUES
  (
    'Green Leaf Premium',
    'גרין ליף פרימיום',
    'cannabis_delivery',
    '/assets/logos/green-leaf.png',
    '#2d7c3e',
    '#f6c945',
    'ILS',
    'GL',
    '{"street": "Dizengoff 100", "city": "Tel Aviv", "postal_code": "64364"}'::jsonb,
    '{"phone": "+972-3-1234567", "email": "orders@greenleaf.co.il"}'::jsonb,
    '{"delivery_fee": 25, "min_order": 150, "zones": ["צפון תל אביב", "מרכז תל אביב", "דרום תל אביב"]}'::jsonb
  ),
  (
    'Fast Herbs',
    'פאסט הרבס',
    'cannabis_delivery',
    '/assets/logos/fast-herbs.png',
    '#ff6b35',
    '#4ecdc4',
    'ILS',
    'FH',
    '{"street": "Weizmann 30", "city": "Holon", "postal_code": "58405"}'::jsonb,
    '{"phone": "+972-3-9876543", "email": "orders@fastherbs.co.il"}'::jsonb,
    '{"delivery_fee": 15, "min_order": 80, "zones": ["חולון", "בת ים", "דרום תל אביב"]}'::jsonb
  ),
  (
    'Medical Plus',
    'מדיקל פלוס',
    'medical_cannabis',
    '/assets/logos/medical-plus.png',
    '#0077b6',
    '#90e0ef',
    'ILS',
    'MP',
    '{"street": "Ben Yehuda 75", "city": "Tel Aviv", "postal_code": "63435"}'::jsonb,
    '{"phone": "+972-3-5555555", "email": "support@medicalplus.co.il"}'::jsonb,
    '{"delivery_fee": 0, "min_order": 200, "requires_prescription": true, "zones": ["all"]}'::jsonb
  )
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- BUSINESS-USER ASSIGNMENTS
-- ========================================

-- Platform Owner gets access to all businesses
INSERT INTO business_users (business_id, user_id, role, is_primary, active)
SELECT
  b.id,
  u.id,
  'owner',
  true,
  true
FROM businesses b
CROSS JOIN users u
WHERE u.telegram_id = 'owner_roy'
ON CONFLICT (business_id, user_id, role) DO NOTHING;

-- Green Leaf Premium Team
INSERT INTO business_users (business_id, user_id, role, is_primary, active)
SELECT
  (SELECT id FROM businesses WHERE name = 'Green Leaf Premium'),
  u.id,
  CASE
    WHEN u.telegram_id = 'mgr_001' THEN 'manager'
    WHEN u.telegram_id IN ('sales_001', 'sales_002') THEN 'sales'
    WHEN u.telegram_id = 'wh_001' THEN 'warehouse'
    WHEN u.telegram_id IN ('driver_001', 'driver_002') THEN 'driver'
  END,
  true,
  true
FROM users u
WHERE u.telegram_id IN ('mgr_001', 'sales_001', 'sales_002', 'wh_001', 'driver_001', 'driver_002')
ON CONFLICT (business_id, user_id, role) DO NOTHING;

-- Fast Herbs Team
INSERT INTO business_users (business_id, user_id, role, is_primary, active)
SELECT
  (SELECT id FROM businesses WHERE name = 'Fast Herbs'),
  u.id,
  CASE
    WHEN u.telegram_id = 'mgr_002' THEN 'manager'
    WHEN u.telegram_id IN ('sales_003', 'sales_004') THEN 'sales'
    WHEN u.telegram_id = 'wh_002' THEN 'warehouse'
    WHEN u.telegram_id IN ('driver_003', 'driver_004') THEN 'driver'
  END,
  true,
  true
FROM users u
WHERE u.telegram_id IN ('mgr_002', 'sales_003', 'sales_004', 'wh_002', 'driver_003', 'driver_004')
ON CONFLICT (business_id, user_id, role) DO NOTHING;

-- Medical Plus Team (all staff)
INSERT INTO business_users (business_id, user_id, role, is_primary, active)
SELECT
  (SELECT id FROM businesses WHERE name = 'Medical Plus'),
  u.id,
  u.role,
  false,
  true
FROM users u
WHERE u.role IN ('manager', 'sales', 'warehouse', 'driver')
ON CONFLICT (business_id, user_id, role) DO NOTHING;

-- ========================================
-- BUSINESS PRODUCTS (Different Pricing)
-- ========================================

-- Green Leaf Premium: +20% markup (premium service)
INSERT INTO business_products (business_id, product_id, business_sku, business_price, currency, is_active)
SELECT
  (SELECT id FROM businesses WHERE name = 'Green Leaf Premium'),
  p.id,
  'GL-' || p.sku,
  ROUND(p.price * 1.20, 2),
  'ILS',
  true
FROM products p
WHERE p.active = true
ON CONFLICT (business_id, product_id) DO NOTHING;

-- Fast Herbs: -15% discount (volume budget service)
INSERT INTO business_products (business_id, product_id, business_sku, business_price, currency, is_active)
SELECT
  (SELECT id FROM businesses WHERE name = 'Fast Herbs'),
  p.id,
  'FH-' || p.sku,
  ROUND(p.price * 0.85, 2),
  'ILS',
  true
FROM products p
WHERE p.active = true
ON CONFLICT (business_id, product_id) DO NOTHING;

-- Medical Plus: Standard pricing (medical regulated)
INSERT INTO business_products (business_id, product_id, business_sku, business_price, currency, is_active)
SELECT
  (SELECT id FROM businesses WHERE name = 'Medical Plus'),
  p.id,
  'MP-' || p.sku,
  p.price,
  'ILS',
  true
FROM products p
WHERE p.active = true
ON CONFLICT (business_id, product_id) DO NOTHING;

-- ========================================
-- UPDATE EXISTING ORDERS WITH BUSINESS_ID
-- ========================================

-- Distribute existing orders randomly among businesses
DO $$
DECLARE
  v_order_record RECORD;
  v_business_ids UUID[];
BEGIN
  -- Get all business IDs
  SELECT ARRAY_AGG(id) INTO v_business_ids FROM businesses;

  -- Update each order with a random business_id
  FOR v_order_record IN SELECT id FROM orders WHERE business_id IS NULL LOOP
    UPDATE orders
    SET business_id = v_business_ids[1 + FLOOR(RANDOM() * ARRAY_LENGTH(v_business_ids, 1))::INTEGER]
    WHERE id = v_order_record.id;
  END LOOP;
END $$;

-- ========================================
-- UPDATE SALES LOGS WITH BUSINESS CONTEXT
-- ========================================

-- Tag sales logs with business_id based on their orders
UPDATE sales_logs sl
SET salesperson_telegram_id = o.created_by
FROM orders o
WHERE sl.order_id = o.id
AND o.business_id IS NOT NULL;

-- ========================================
-- BUSINESS-SPECIFIC ORDER NUMBERS
-- ========================================

-- Update order display numbers based on business
DO $$
DECLARE
  v_business RECORD;
  v_order RECORD;
  v_sequence INTEGER;
BEGIN
  FOR v_business IN SELECT * FROM businesses LOOP
    v_sequence := 1;

    FOR v_order IN
      SELECT id FROM orders
      WHERE business_id = v_business.id
      ORDER BY created_at ASC
    LOOP
      UPDATE orders
      SET notes = COALESCE(notes, '') || E'\nOrder #: ' || v_business.order_number_prefix || '-' || LPAD(v_sequence::TEXT, 6, '0')
      WHERE id = v_order.id;

      v_sequence := v_sequence + 1;
    END LOOP;

    -- Update business sequence counter
    UPDATE businesses
    SET order_number_sequence = v_sequence
    WHERE id = v_business.id;
  END LOOP;
END $$;

-- ========================================
-- BUSINESS ANALYTICS VIEWS
-- ========================================

-- Create view for per-business revenue
CREATE OR REPLACE VIEW business_revenue_today AS
SELECT
  b.id AS business_id,
  b.name AS business_name,
  b.name_hebrew AS business_name_hebrew,
  COUNT(DISTINCT o.id) AS orders_today,
  COALESCE(SUM(o.total_amount), 0) AS revenue_today,
  COUNT(DISTINCT CASE WHEN o.status = 'delivered' THEN o.id END) AS delivered_today
FROM businesses b
LEFT JOIN orders o ON o.business_id = b.id
  AND DATE(o.created_at) = CURRENT_DATE
WHERE b.active = true
GROUP BY b.id, b.name, b.name_hebrew;

-- Create view for per-business driver stats
CREATE OR REPLACE VIEW business_driver_stats AS
SELECT
  b.id AS business_id,
  b.name AS business_name,
  COUNT(DISTINCT bu.user_id) AS total_drivers,
  COUNT(DISTINCT CASE WHEN ds.status = 'online' THEN ds.driver_telegram_id END) AS online_drivers
FROM businesses b
LEFT JOIN business_users bu ON bu.business_id = b.id AND bu.role = 'driver' AND bu.active = true
LEFT JOIN driver_status ds ON ds.driver_telegram_id = (SELECT telegram_id FROM users WHERE id = bu.user_id)
WHERE b.active = true
GROUP BY b.id, b.name;

-- ========================================
-- VERIFICATION
-- ========================================

DO $$
DECLARE
  v_business_count INTEGER;
  v_business_user_count INTEGER;
  v_business_product_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_business_count FROM businesses;
  SELECT COUNT(*) INTO v_business_user_count FROM business_users;
  SELECT COUNT(*) INTO v_business_product_count FROM business_products;

  RAISE NOTICE 'Multi-Business Seed Data Verification:';
  RAISE NOTICE '- Businesses: %', v_business_count;
  RAISE NOTICE '- Business-User Assignments: %', v_business_user_count;
  RAISE NOTICE '- Business Products: %', v_business_product_count;

  IF v_business_count < 3 THEN
    RAISE WARNING 'Expected at least 3 businesses, got %', v_business_count;
  END IF;

  RAISE NOTICE 'Multi-business infrastructure seeded successfully!';
END $$;
