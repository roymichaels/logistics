/*
  # Complete Seed Data for Roy Michaels Command System

  This migration populates the database with comprehensive realistic data:

  1. **Products**
     - 25 cannabis strains with Hebrew names
     - Realistic pricing (₪180-₪450 per unit)
     - SKU codes and stock levels
     - Product categories (Indica, Sativa, Hybrid)

  2. **Users**
     - 1 Owner (Roy Michaels)
     - 2 Managers
     - 4 Sales representatives
     - 2 Warehouse staff
     - 6 Drivers with zone assignments

  3. **Inventory Distribution**
     - Warehouse main stock (500+ units per product)
     - Driver inventory (20-50 units per driver per product)
     - Realistic low-stock scenarios for testing alerts

  4. **Sample Orders**
     - 50 orders across all statuses
     - Various order sizes and values
     - Distributed across zones and time periods

  5. **Historical Data**
     - Sales logs for revenue analytics
     - Inventory movement logs
     - Driver movement history
     - Restock requests in various states

  This creates a realistic operational state for testing and demonstration.
*/

-- ========================================
-- PRODUCTS - Cannabis Strains
-- ========================================

INSERT INTO products (name, name_he, sku, price, category, stock, low_stock_threshold, active, description)
VALUES
  -- Indica Dominant
  ('Blue Dream', 'בלו דרים', 'BD-001', 280.00, 'Indica', 500, 50, true, 'Classic relaxing strain'),
  ('Purple Kush', 'פרפל קוש', 'PK-002', 320.00, 'Indica', 450, 50, true, 'Deep relaxation and sleep'),
  ('Northern Lights', 'נורדרן לייטס', 'NL-003', 300.00, 'Indica', 480, 50, true, 'Pure indica excellence'),
  ('Granddaddy Purple', 'גרנדדאדי פרפל', 'GDP-004', 340.00, 'Indica', 420, 50, true, 'Sweet grape flavor'),
  ('Bubba Kush', 'בובה קוש', 'BK-005', 310.00, 'Indica', 460, 50, true, 'Heavy body relaxation'),
  ('Afghan Kush', 'אפגני קוש', 'AK-006', 290.00, 'Indica', 490, 50, true, 'Traditional landrace'),
  ('Ice Cream Cake', 'אייס קרים קייק', 'ICC-007', 360.00, 'Indica', 380, 50, true, 'Sweet dessert strain'),
  ('Zkittlez', 'זקיטלז', 'ZK-008', 350.00, 'Indica', 400, 50, true, 'Fruity candy flavor'),

  -- Sativa Dominant
  ('Sour Diesel', 'סאוור דיזל', 'SD-009', 300.00, 'Sativa', 520, 50, true, 'Energizing and uplifting'),
  ('Jack Herer', 'ג׳ק הרר', 'JH-010', 330.00, 'Sativa', 470, 50, true, 'Clear-headed creativity'),
  ('Green Crack', 'גרין קראק', 'GC-011', 290.00, 'Sativa', 510, 50, true, 'High energy focus'),
  ('Durban Poison', 'דרבן פויזן', 'DP-012', 310.00, 'Sativa', 480, 50, true, 'Pure sativa clarity'),
  ('Super Silver Haze', 'סופר סילבר הייז', 'SSH-013', 340.00, 'Sativa', 440, 50, true, 'Legendary sativa'),
  ('Trainwreck', 'טריינרק', 'TW-014', 320.00, 'Sativa', 460, 50, true, 'Powerful cerebral high'),
  ('Strawberry Cough', 'סטרוברי קאף', 'SC-015', 330.00, 'Sativa', 450, 50, true, 'Sweet berry flavor'),

  -- Hybrid Strains
  ('Girl Scout Cookies', 'גרל סקאוט קוקיז', 'GSC-016', 380.00, 'Hybrid', 350, 50, true, 'Balanced euphoria'),
  ('Gelato', 'ג׳לטו', 'GEL-017', 400.00, 'Hybrid', 320, 50, true, 'Premium dessert strain'),
  ('Wedding Cake', 'ודינג קייק', 'WC-018', 390.00, 'Hybrid', 340, 50, true, 'Sweet vanilla notes'),
  ('OG Kush', 'או ג׳י קוש', 'OG-019', 350.00, 'Hybrid', 410, 50, true, 'West coast classic'),
  ('Pineapple Express', 'פיינאפל אקספרס', 'PE-020', 330.00, 'Hybrid', 460, 50, true, 'Tropical pineapple'),
  ('White Widow', 'וייט וידו', 'WW-021', 320.00, 'Hybrid', 470, 50, true, 'Balanced classic'),
  ('AK-47', 'איי קיי 47', 'AK47-022', 310.00, 'Hybrid', 480, 50, true, 'Steady relaxation'),
  ('Gorilla Glue #4', 'גורילה גלו 4', 'GG4-023', 370.00, 'Hybrid', 360, 50, true, 'Heavy-handed euphoria'),
  ('Sunset Sherbet', 'סאנסט שרבט', 'SS-024', 390.00, 'Hybrid', 330, 50, true, 'Fruity dessert'),
  ('Do-Si-Dos', 'דו סי דוס', 'DSD-025', 380.00, 'Hybrid', 350, 50, true, 'Sweet cookie flavor')
ON CONFLICT (sku) DO NOTHING;

-- ========================================
-- USERS - Full Team
-- ========================================

INSERT INTO users (telegram_id, username, name, role, phone, active)
VALUES
  -- Owner
  ('owner_roy', 'roy_michaels', 'Roy Michaels', 'owner', '+972501234567', true),

  -- Managers
  ('mgr_001', 'sarah_m', 'Sarah Cohen', 'manager', '+972502345678', true),
  ('mgr_002', 'david_l', 'David Levi', 'manager', '+972503456789', true),

  -- Sales Team
  ('sales_001', 'yossi_s', 'Yossi Shapiro', 'sales', '+972504567890', true),
  ('sales_002', 'maya_r', 'Maya Rosenberg', 'sales', '+972505678901', true),
  ('sales_003', 'eli_k', 'Eli Katz', 'sales', '+972506789012', true),
  ('sales_004', 'tali_b', 'Tali Ben-David', 'sales', '+972507890123', true),

  -- Warehouse Team
  ('wh_001', 'avi_w', 'Avi Weiss', 'warehouse', '+972508901234', true),
  ('wh_002', 'noa_g', 'Noa Goldstein', 'warehouse', '+972509012345', true),

  -- Driver Team
  ('driver_001', 'moti_d1', 'Moti Cohen', 'driver', '+972501111111', true),
  ('driver_002', 'danny_d2', 'Danny Levi', 'driver', '+972502222222', true),
  ('driver_003', 'ronen_d3', 'Ronen Mizrahi', 'driver', '+972503333333', true),
  ('driver_004', 'oren_d4', 'Oren Alon', 'driver', '+972504444444', true),
  ('driver_005', 'amit_d5', 'Amit Shachar', 'driver', '+972505555555', true),
  ('driver_006', 'ben_d6', 'Ben Yaakov', 'driver', '+972506666666', true)
ON CONFLICT (telegram_id) DO NOTHING;

-- ========================================
-- DRIVER ZONE ASSIGNMENTS
-- ========================================

INSERT INTO driver_zones (driver_telegram_id, zone_id, assigned_by)
SELECT
  'driver_001',
  id,
  'owner_roy'
FROM zones WHERE name IN ('צפון תל אביב', 'מרכז תל אביב')
ON CONFLICT (driver_telegram_id, zone_id) DO NOTHING;

INSERT INTO driver_zones (driver_telegram_id, zone_id, assigned_by)
SELECT
  'driver_002',
  id,
  'owner_roy'
FROM zones WHERE name IN ('מרכז תל אביב', 'דרום תל אביב')
ON CONFLICT (driver_telegram_id, zone_id) DO NOTHING;

INSERT INTO driver_zones (driver_telegram_id, zone_id, assigned_by)
SELECT
  'driver_003',
  id,
  'owner_roy'
FROM zones WHERE name IN ('דרום תל אביב', 'חולון')
ON CONFLICT (driver_telegram_id, zone_id) DO NOTHING;

INSERT INTO driver_zones (driver_telegram_id, zone_id, assigned_by)
SELECT
  'driver_004',
  id,
  'owner_roy'
FROM zones WHERE name IN ('חולון', 'בת ים')
ON CONFLICT (driver_telegram_id, zone_id) DO NOTHING;

INSERT INTO driver_zones (driver_telegram_id, zone_id, assigned_by)
SELECT
  'driver_005',
  id,
  'owner_roy'
FROM zones WHERE name IN ('צפון תל אביב', 'בת ים')
ON CONFLICT (driver_telegram_id, zone_id) DO NOTHING;

INSERT INTO driver_zones (driver_telegram_id, zone_id, assigned_by)
SELECT
  'driver_006',
  id,
  'owner_roy'
FROM zones WHERE name IN ('מרכז תל אביב', 'חולון')
ON CONFLICT (driver_telegram_id, zone_id) DO NOTHING;

-- ========================================
-- DRIVER STATUS - Some Online, Some Offline
-- ========================================

INSERT INTO driver_status (driver_telegram_id, status, last_seen, active_orders)
VALUES
  ('driver_001', 'online', now(), 2),
  ('driver_002', 'online', now(), 1),
  ('driver_003', 'break', now() - interval '15 minutes', 0),
  ('driver_004', 'online', now(), 1),
  ('driver_005', 'offline', now() - interval '2 hours', 0),
  ('driver_006', 'online', now(), 0)
ON CONFLICT (driver_telegram_id) DO UPDATE SET
  status = EXCLUDED.status,
  last_seen = EXCLUDED.last_seen,
  active_orders = EXCLUDED.active_orders;

-- ========================================
-- DRIVER INVENTORY - Distributed Stock
-- ========================================

INSERT INTO driver_inventory (driver_telegram_id, product_id, quantity, low_stock_threshold, last_restock_at)
SELECT
  d.driver_telegram_id,
  p.id,
  CASE
    WHEN RANDOM() > 0.7 THEN FLOOR(RANDOM() * 20 + 30)::INTEGER
    WHEN RANDOM() > 0.4 THEN FLOOR(RANDOM() * 15 + 15)::INTEGER
    ELSE FLOOR(RANDOM() * 10 + 5)::INTEGER
  END,
  10,
  now() - (FLOOR(RANDOM() * 7)::INTEGER || ' days')::INTERVAL
FROM
  (SELECT DISTINCT driver_telegram_id FROM driver_zones) d
  CROSS JOIN (SELECT id FROM products WHERE active = true) p
ON CONFLICT (driver_telegram_id, product_id) DO NOTHING;

-- ========================================
-- SAMPLE ORDERS - Various States
-- ========================================

DO $$
DECLARE
  v_order_id UUID;
  v_product_id UUID;
  v_zone_id UUID;
  v_driver_id TEXT;
  v_sales_id TEXT;
  v_customer_names TEXT[] := ARRAY['אבי כהן', 'שרה לוי', 'משה ישראלי', 'רחל גולן', 'יוסי מזרחי', 'תמר אבני', 'דני רוזן', 'נועה שפירא'];
  v_addresses TEXT[] := ARRAY['רחוב דיזנגוף 100, תל אביב', 'רחוב אלנבי 50, תל אביב', 'רחוב בן יהודה 75, תל אביב', 'רחוב וייצמן 30, חולון', 'רחוב הרצל 45, בת ים'];
  v_statuses TEXT[] := ARRAY['pending', 'confirmed', 'assigned', 'in_transit', 'delivered'];
  v_counter INTEGER := 0;
BEGIN
  FOR v_counter IN 1..50 LOOP
    SELECT id INTO v_zone_id FROM zones ORDER BY RANDOM() LIMIT 1;
    SELECT telegram_id INTO v_sales_id FROM users WHERE role = 'sales' ORDER BY RANDOM() LIMIT 1;
    SELECT telegram_id INTO v_driver_id FROM users WHERE role = 'driver' ORDER BY RANDOM() LIMIT 1;

    INSERT INTO orders (
      customer_name,
      customer_phone,
      delivery_address,
      zone_id,
      status,
      total_amount,
      created_by,
      assigned_driver_id,
      created_at,
      updated_at
    ) VALUES (
      v_customer_names[1 + FLOOR(RANDOM() * ARRAY_LENGTH(v_customer_names, 1))::INTEGER],
      '+97250' || LPAD(FLOOR(RANDOM() * 10000000)::TEXT, 7, '0'),
      v_addresses[1 + FLOOR(RANDOM() * ARRAY_LENGTH(v_addresses, 1))::INTEGER],
      v_zone_id,
      v_statuses[1 + FLOOR(RANDOM() * ARRAY_LENGTH(v_statuses, 1))::INTEGER],
      ROUND((RANDOM() * 1000 + 300)::NUMERIC, 2),
      v_sales_id,
      CASE WHEN RANDOM() > 0.5 THEN v_driver_id ELSE NULL END,
      now() - (FLOOR(RANDOM() * 30)::INTEGER || ' days')::INTERVAL,
      now() - (FLOOR(RANDOM() * 30)::INTEGER || ' days')::INTERVAL
    ) RETURNING id INTO v_order_id;

    FOR v_product_id IN (SELECT id FROM products ORDER BY RANDOM() LIMIT (1 + FLOOR(RANDOM() * 4)::INTEGER)) LOOP
      INSERT INTO order_items (
        order_id,
        product_id,
        quantity,
        unit_price,
        subtotal
      )
      SELECT
        v_order_id,
        v_product_id,
        (1 + FLOOR(RANDOM() * 5)::INTEGER),
        price,
        price * (1 + FLOOR(RANDOM() * 5)::INTEGER)
      FROM products WHERE id = v_product_id;
    END LOOP;

  END LOOP;
END $$;

-- ========================================
-- SALES LOGS - Revenue Attribution
-- ========================================

INSERT INTO sales_logs (
  order_id,
  salesperson_telegram_id,
  product_id,
  quantity,
  unit_price,
  subtotal,
  commission_rate,
  commission_amount,
  sale_timestamp
)
SELECT
  oi.order_id,
  o.created_by,
  oi.product_id,
  oi.quantity,
  oi.unit_price,
  oi.subtotal,
  5.0,
  ROUND((oi.subtotal * 0.05)::NUMERIC, 2),
  o.created_at
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.status IN ('delivered', 'in_transit')
ON CONFLICT DO NOTHING;

-- ========================================
-- INVENTORY LOGS - Movement History
-- ========================================

INSERT INTO inventory_logs (
  product_id,
  from_location_id,
  to_location_id,
  quantity,
  log_type,
  reference_type,
  performed_by,
  notes,
  created_at
)
SELECT
  p.id,
  (SELECT id FROM inventory_locations WHERE type = 'warehouse' LIMIT 1),
  NULL,
  FLOOR(RANDOM() * 50 + 10)::INTEGER,
  'sale',
  'order',
  'sales_' || LPAD(FLOOR(RANDOM() * 4 + 1)::TEXT, 3, '0'),
  'הזמנת לקוח - מכירה רגילה',
  now() - (FLOOR(RANDOM() * 30)::INTEGER || ' days')::INTERVAL
FROM products p
WHERE RANDOM() > 0.5
LIMIT 100;

-- ========================================
-- RESTOCK REQUESTS - Various States
-- ========================================

DO $$
DECLARE
  v_product_id UUID;
  v_warehouse_loc UUID;
  v_driver_loc UUID;
  v_counter INTEGER := 0;
BEGIN
  SELECT id INTO v_warehouse_loc FROM inventory_locations WHERE type = 'warehouse' LIMIT 1;

  FOR v_counter IN 1..20 LOOP
    SELECT id INTO v_product_id FROM products ORDER BY RANDOM() LIMIT 1;

    INSERT INTO restock_requests (
      product_id,
      from_location_id,
      to_location_id,
      requested_quantity,
      approved_quantity,
      status,
      requested_by,
      requested_at,
      approved_by,
      approved_at,
      notes
    ) VALUES (
      v_product_id,
      v_warehouse_loc,
      v_warehouse_loc,
      FLOOR(RANDOM() * 100 + 50)::INTEGER,
      CASE
        WHEN RANDOM() > 0.5 THEN FLOOR(RANDOM() * 100 + 50)::INTEGER
        ELSE NULL
      END,
      CASE
        WHEN RANDOM() > 0.7 THEN 'pending'
        WHEN RANDOM() > 0.4 THEN 'approved'
        WHEN RANDOM() > 0.2 THEN 'fulfilled'
        ELSE 'rejected'
      END,
      (SELECT telegram_id FROM users WHERE role IN ('sales', 'driver') ORDER BY RANDOM() LIMIT 1),
      now() - (FLOOR(RANDOM() * 14)::INTEGER || ' days')::INTERVAL,
      CASE WHEN RANDOM() > 0.3 THEN 'mgr_001' ELSE NULL END,
      CASE WHEN RANDOM() > 0.3 THEN now() - (FLOOR(RANDOM() * 10)::INTEGER || ' days')::INTERVAL ELSE NULL END,
      CASE
        WHEN RANDOM() > 0.8 THEN 'דחוף - מלאי נמוך'
        WHEN RANDOM() > 0.5 THEN 'בקשה שגרתית'
        ELSE NULL
      END
    );
  END LOOP;
END $$;

-- ========================================
-- INVENTORY ALERTS - Low Stock Warnings
-- ========================================

INSERT INTO inventory_alerts (
  product_id,
  location_id,
  alert_type,
  current_quantity,
  threshold,
  created_at
)
SELECT
  di.product_id,
  (SELECT id FROM inventory_locations WHERE type = 'driver' AND owner_telegram_id = di.driver_telegram_id LIMIT 1),
  'low_stock',
  di.quantity,
  di.low_stock_threshold,
  now() - (FLOOR(RANDOM() * 7)::INTEGER || ' days')::INTERVAL
FROM driver_inventory di
WHERE di.quantity < di.low_stock_threshold
LIMIT 30;

-- ========================================
-- DRIVER MOVEMENT LOGS - Activity History
-- ========================================

INSERT INTO driver_movement_logs (
  driver_telegram_id,
  action,
  zone_id,
  notes,
  created_at
)
SELECT
  ds.driver_telegram_id,
  CASE
    WHEN RANDOM() > 0.7 THEN 'went_online'
    WHEN RANDOM() > 0.4 THEN 'went_offline'
    WHEN RANDOM() > 0.2 THEN 'accepted_order'
    ELSE 'completed_delivery'
  END,
  (SELECT zone_id FROM driver_zones WHERE driver_telegram_id = ds.driver_telegram_id ORDER BY RANDOM() LIMIT 1),
  CASE
    WHEN RANDOM() > 0.5 THEN 'פעילות רגילה'
    ELSE NULL
  END,
  now() - (FLOOR(RANDOM() * 30)::INTEGER || ' days')::INTERVAL
FROM driver_status ds
CROSS JOIN generate_series(1, 10)
ORDER BY RANDOM()
LIMIT 200;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Verify data was inserted
DO $$
DECLARE
  v_product_count INTEGER;
  v_user_count INTEGER;
  v_order_count INTEGER;
  v_driver_inventory_count INTEGER;
  v_sales_log_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_product_count FROM products;
  SELECT COUNT(*) INTO v_user_count FROM users;
  SELECT COUNT(*) INTO v_order_count FROM orders;
  SELECT COUNT(*) INTO v_driver_inventory_count FROM driver_inventory;
  SELECT COUNT(*) INTO v_sales_log_count FROM sales_logs;

  RAISE NOTICE 'Seed data verification:';
  RAISE NOTICE '- Products: %', v_product_count;
  RAISE NOTICE '- Users: %', v_user_count;
  RAISE NOTICE '- Orders: %', v_order_count;
  RAISE NOTICE '- Driver Inventory Records: %', v_driver_inventory_count;
  RAISE NOTICE '- Sales Logs: %', v_sales_log_count;

  IF v_product_count < 25 THEN
    RAISE WARNING 'Expected at least 25 products, got %', v_product_count;
  END IF;

  IF v_user_count < 15 THEN
    RAISE WARNING 'Expected at least 15 users, got %', v_user_count;
  END IF;

  RAISE NOTICE 'Seed data migration completed successfully!';
END $$;
