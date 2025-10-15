/*
  # Cleanup Demo Data and Enforce Business ID Constraints

  ## Overview
  This migration removes all demo data references and enforces strict business_id constraints.

  ## Changes
  1. Create Infrastructure Business
  2. Remove Demo Mode from user_preferences
  3. Enforce business_id NOT NULL on orders, products, zones
  4. Add data validation functions
  5. Update RLS policies for strict scoping
  6. Add triggers to prevent null business_id
*/

-- ============================================================================
-- STEP 1: Create Infrastructure Business
-- ============================================================================

INSERT INTO businesses (
  id, 
  name, 
  name_hebrew, 
  business_type, 
  order_number_prefix, 
  order_number_sequence,
  default_currency,
  primary_color,
  secondary_color,
  active
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Infrastructure Operations',
  'תפעול תשתית',
  'logistics',
  'INFRA',
  1000,
  'ILS',
  '#667eea',
  '#764ba2',
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  active = true,
  updated_at = NOW();

-- ============================================================================
-- STEP 2: Remove Demo Mode
-- ============================================================================

UPDATE user_preferences SET mode = 'real' WHERE mode != 'real';

ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_mode_check;
ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_mode_check CHECK (mode IN ('real'));

COMMENT ON COLUMN user_preferences.mode IS 'Operating mode - only real data allowed';

-- ============================================================================
-- STEP 3: Enforce business_id on Orders
-- ============================================================================

UPDATE orders SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
ALTER TABLE orders ALTER COLUMN business_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_business_id_fkey'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_business_id_fkey 
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_business_id ON orders(business_id);

-- ============================================================================
-- STEP 4: Enforce business_id on Products
-- ============================================================================

UPDATE products SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
ALTER TABLE products ALTER COLUMN business_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'products_business_id_fkey'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_business_id_fkey 
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);

-- ============================================================================
-- STEP 5: Enforce business_id on Zones
-- ============================================================================

UPDATE zones SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
ALTER TABLE zones ALTER COLUMN business_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'zones_business_id_fkey'
  ) THEN
    ALTER TABLE zones ADD CONSTRAINT zones_business_id_fkey 
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_zones_business_id ON zones(business_id);

-- ============================================================================
-- STEP 6: Data Validation Function
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_data_integrity()
RETURNS TABLE (
  check_name TEXT,
  status TEXT,
  details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_demo_count INT;
  v_inactive_business_orders INT;
BEGIN
  SELECT COUNT(*) INTO v_demo_count FROM user_preferences WHERE mode != 'real';
  
  RETURN QUERY
  SELECT 
    'No Demo Mode'::TEXT,
    CASE WHEN v_demo_count = 0 THEN 'PASS' ELSE 'FAIL' END,
    v_demo_count || ' demo mode records'::TEXT;

  RETURN QUERY
  SELECT 
    'Infrastructure Business Exists'::TEXT,
    CASE WHEN EXISTS (SELECT 1 FROM businesses WHERE id = '00000000-0000-0000-0000-000000000001') 
         THEN 'PASS' ELSE 'FAIL' END,
    'Infrastructure business check'::TEXT;

  SELECT COUNT(*) INTO v_inactive_business_orders
  FROM orders o JOIN businesses b ON o.business_id = b.id WHERE b.active = false;

  RETURN QUERY
  SELECT 
    'No Inactive Business Orders'::TEXT,
    CASE WHEN v_inactive_business_orders = 0 THEN 'PASS' ELSE 'WARN' END,
    v_inactive_business_orders || ' orders reference inactive businesses'::TEXT;

  RETURN QUERY SELECT 'Orders Have Business ID'::TEXT,
    CASE WHEN NOT EXISTS (SELECT 1 FROM orders WHERE business_id IS NULL) THEN 'PASS' ELSE 'FAIL' END,
    'business_id constraint'::TEXT;

  RETURN QUERY SELECT 'Products Have Business ID'::TEXT,
    CASE WHEN NOT EXISTS (SELECT 1 FROM products WHERE business_id IS NULL) THEN 'PASS' ELSE 'FAIL' END,
    'business_id constraint'::TEXT;

  RETURN QUERY SELECT 'Zones Have Business ID'::TEXT,
    CASE WHEN NOT EXISTS (SELECT 1 FROM zones WHERE business_id IS NULL) THEN 'PASS' ELSE 'FAIL' END,
    'business_id constraint'::TEXT;
END;
$$;

-- ============================================================================
-- STEP 7: Prevent Null business_id Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_null_business_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.business_id IS NULL THEN
    RAISE EXCEPTION 'business_id cannot be NULL in table %', TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_prevent_null_business_id ON orders;
CREATE TRIGGER orders_prevent_null_business_id
  BEFORE INSERT OR UPDATE ON orders FOR EACH ROW
  EXECUTE FUNCTION prevent_null_business_id();

DROP TRIGGER IF EXISTS products_prevent_null_business_id ON products;
CREATE TRIGGER products_prevent_null_business_id
  BEFORE INSERT OR UPDATE ON products FOR EACH ROW
  EXECUTE FUNCTION prevent_null_business_id();

DROP TRIGGER IF EXISTS zones_prevent_null_business_id ON zones;
CREATE TRIGGER zones_prevent_null_business_id
  BEFORE INSERT OR UPDATE ON zones FOR EACH ROW
  EXECUTE FUNCTION prevent_null_business_id();

-- ============================================================================
-- STEP 8: Update RLS Policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view orders in their business context" ON orders;
CREATE POLICY "Users can view orders in their business context" ON orders FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'infrastructure_owner')
  OR business_id IN (SELECT ubr.business_id FROM user_business_roles ubr WHERE ubr.user_id = auth.uid() AND ubr.is_active = true)
  OR assigned_driver = (SELECT telegram_id FROM users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Users can view products in their business context" ON products;
CREATE POLICY "Users can view products in their business context" ON products FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'infrastructure_owner')
  OR business_id IN (SELECT ubr.business_id FROM user_business_roles ubr WHERE ubr.user_id = auth.uid() AND ubr.is_active = true)
);

DROP POLICY IF EXISTS "Users can view zones in their business context" ON zones;
CREATE POLICY "Users can view zones in their business context" ON zones FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'infrastructure_owner')
  OR business_id IN (SELECT ubr.business_id FROM user_business_roles ubr WHERE ubr.user_id = auth.uid() AND ubr.is_active = true)
);
