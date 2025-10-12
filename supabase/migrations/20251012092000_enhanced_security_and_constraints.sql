/*
  # Enhanced Security Policies and Foreign Key Constraints

  ## Overview
  This migration implements comprehensive business context isolation through
  enhanced RLS policies and adds missing foreign key constraints for data integrity.

  ## Part 1: Business Context Isolation
  - Add business_id to all tenant-scoped tables
  - Create policies for multi-tenant data isolation
  - Implement cross-business access controls

  ## Part 2: Foreign Key Constraints
  - Add proper CASCADE and SET NULL rules
  - Ensure referential integrity across tables
  - Add constraints for telegram_id references

  ## Part 3: Data Validation
  - Add check constraints for data quality
  - Implement domain-specific validations
  - Add triggers for automated validations
*/

-- ============================================================================
-- STEP 1: Add business_id to tenant-scoped tables if missing
-- ============================================================================

-- Add business_id to orders table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;
    CREATE INDEX idx_orders_business_id ON orders(business_id) WHERE business_id IS NOT NULL;
  END IF;
END $$;

-- Add business_id to products table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE products ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
    CREATE INDEX idx_products_business_id ON products(business_id) WHERE business_id IS NOT NULL;
  END IF;
END $$;

-- Add business_id to inventory_locations table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_locations' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE inventory_locations ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
    CREATE INDEX idx_inventory_locations_business_id ON inventory_locations(business_id) WHERE business_id IS NOT NULL;
  END IF;
END $$;

-- Add business_id to zones table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'zones' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE zones ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
    CREATE INDEX idx_zones_business_id ON zones(business_id) WHERE business_id IS NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Create helper function for business context checking
-- ============================================================================

-- Function to check if user has access to business
CREATE OR REPLACE FUNCTION has_business_access(p_business_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Infrastructure owners have access to all businesses
  IF is_infrastructure_owner() THEN
    RETURN true;
  END IF;

  -- Check if user is assigned to this business
  RETURN EXISTS (
    SELECT 1 FROM business_users bu
    WHERE bu.business_id = p_business_id
    AND bu.user_id = (auth.jwt() ->> 'telegram_id')
    AND bu.active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user has specific role in business
CREATE OR REPLACE FUNCTION has_role_in_specific_business(
  p_business_id UUID,
  p_required_roles user_role[]
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Infrastructure owners always have access
  IF is_infrastructure_owner() THEN
    RETURN true;
  END IF;

  -- Check if user has required role in this business
  RETURN EXISTS (
    SELECT 1 FROM business_users bu
    JOIN users u ON u.telegram_id = bu.user_id
    WHERE bu.business_id = p_business_id
    AND bu.user_id = (auth.jwt() ->> 'telegram_id')
    AND u.role = ANY(p_required_roles)
    AND bu.active = true
    AND u.registration_status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get user's businesses
CREATE OR REPLACE FUNCTION get_user_businesses()
RETURNS TABLE(business_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT bu.business_id
  FROM business_users bu
  WHERE bu.user_id = (auth.jwt() ->> 'telegram_id')
  AND bu.active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- STEP 3: Enhanced RLS policies for orders table
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Staff can read orders" ON orders;
DROP POLICY IF EXISTS "Managers and sales can insert orders" ON orders;
DROP POLICY IF EXISTS "Managers, sales, dispatchers can update orders" ON orders;
DROP POLICY IF EXISTS "Managers can delete orders" ON orders;
DROP POLICY IF EXISTS "All staff can read orders" ON orders;
DROP POLICY IF EXISTS "Managers and sales can create orders" ON orders;

-- New business-aware policies
CREATE POLICY "orders_select_business_members"
  ON orders FOR SELECT
  TO authenticated
  USING (
    -- Access own business orders
    (business_id IS NULL OR has_business_access(business_id))
    OR
    -- Infrastructure owners see all
    is_infrastructure_owner()
    OR
    -- Users see orders they created
    created_by = (auth.jwt() ->> 'telegram_id')
    OR
    -- Drivers see assigned orders
    (assigned_driver = (auth.jwt() ->> 'telegram_id') AND get_current_user_role() = 'driver')
  );

CREATE POLICY "orders_insert_authorized_roles"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must have manager or sales role in the business
    (business_id IS NULL OR has_role_in_specific_business(business_id, ARRAY['manager', 'sales', 'business_owner']::user_role[]))
    OR
    -- Infrastructure owners can create anywhere
    is_infrastructure_owner()
  );

CREATE POLICY "orders_update_authorized_roles"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    (business_id IS NULL OR has_role_in_specific_business(business_id, ARRAY['manager', 'sales', 'dispatcher', 'business_owner']::user_role[]))
    OR
    is_infrastructure_owner()
    OR
    -- Drivers can update their assigned orders
    (assigned_driver = (auth.jwt() ->> 'telegram_id') AND get_current_user_role() = 'driver')
  )
  WITH CHECK (
    (business_id IS NULL OR has_role_in_specific_business(business_id, ARRAY['manager', 'sales', 'dispatcher', 'business_owner']::user_role[]))
    OR
    is_infrastructure_owner()
    OR
    (assigned_driver = (auth.jwt() ->> 'telegram_id') AND get_current_user_role() = 'driver')
  );

CREATE POLICY "orders_delete_managers_only"
  ON orders FOR DELETE
  TO authenticated
  USING (
    (business_id IS NULL OR has_role_in_specific_business(business_id, ARRAY['manager', 'business_owner']::user_role[]))
    OR
    is_infrastructure_owner()
  );

-- ============================================================================
-- STEP 4: Enhanced RLS policies for products table
-- ============================================================================

DROP POLICY IF EXISTS "All authenticated users can read products" ON products;
DROP POLICY IF EXISTS "Managers and warehouse staff can create products" ON products;
DROP POLICY IF EXISTS "Managers and warehouse staff can update products" ON products;
DROP POLICY IF EXISTS "Managers and warehouse can insert products" ON products;
DROP POLICY IF EXISTS "Managers and warehouse can update products" ON products;
DROP POLICY IF EXISTS "Managers can delete products" ON products;

CREATE POLICY "products_select_business_members"
  ON products FOR SELECT
  TO authenticated
  USING (
    (business_id IS NULL OR has_business_access(business_id))
    OR
    is_infrastructure_owner()
  );

CREATE POLICY "products_insert_authorized_roles"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    (business_id IS NULL OR has_role_in_specific_business(business_id, ARRAY['manager', 'warehouse', 'business_owner']::user_role[]))
    OR
    is_infrastructure_owner()
  );

CREATE POLICY "products_update_authorized_roles"
  ON products FOR UPDATE
  TO authenticated
  USING (
    (business_id IS NULL OR has_role_in_specific_business(business_id, ARRAY['manager', 'warehouse', 'business_owner']::user_role[]))
    OR
    is_infrastructure_owner()
  );

CREATE POLICY "products_delete_managers_only"
  ON products FOR DELETE
  TO authenticated
  USING (
    (business_id IS NULL OR has_role_in_specific_business(business_id, ARRAY['manager', 'business_owner']::user_role[]))
    OR
    is_infrastructure_owner()
  );

-- ============================================================================
-- STEP 5: Enhanced RLS policies for zones table
-- ============================================================================

DROP POLICY IF EXISTS "All authenticated users can read zones" ON zones;
DROP POLICY IF EXISTS "Managers can manage zones" ON zones;

CREATE POLICY "zones_select_business_members"
  ON zones FOR SELECT
  TO authenticated
  USING (
    (business_id IS NULL OR has_business_access(business_id))
    OR
    is_infrastructure_owner()
  );

CREATE POLICY "zones_manage_authorized_roles"
  ON zones FOR ALL
  TO authenticated
  USING (
    (business_id IS NULL OR has_role_in_specific_business(business_id, ARRAY['manager', 'dispatcher', 'business_owner']::user_role[]))
    OR
    is_infrastructure_owner()
  );

-- ============================================================================
-- STEP 6: Enhanced RLS policies for inventory_locations table
-- ============================================================================

DROP POLICY IF EXISTS "All staff can read inventory locations" ON inventory_locations;
DROP POLICY IF EXISTS "Managers and warehouse can manage locations" ON inventory_locations;
DROP POLICY IF EXISTS "Managers can manage inventory locations" ON inventory_locations;

CREATE POLICY "inventory_locations_select_business_members"
  ON inventory_locations FOR SELECT
  TO authenticated
  USING (
    (business_id IS NULL OR has_business_access(business_id))
    OR
    is_infrastructure_owner()
  );

CREATE POLICY "inventory_locations_manage_authorized_roles"
  ON inventory_locations FOR ALL
  TO authenticated
  USING (
    (business_id IS NULL OR has_role_in_specific_business(business_id, ARRAY['manager', 'warehouse', 'business_owner']::user_role[]))
    OR
    is_infrastructure_owner()
  );

-- ============================================================================
-- STEP 7: Add missing foreign key constraints
-- ============================================================================

-- Add foreign key for orders.created_by to users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_orders_created_by'
  ) THEN
    -- Note: We use telegram_id as reference, not UUID id
    -- This constraint will be added as a trigger since telegram_id is TEXT
    CREATE OR REPLACE FUNCTION validate_order_created_by()
    RETURNS TRIGGER AS $trigger$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM users WHERE telegram_id = NEW.created_by) THEN
        RAISE EXCEPTION 'Invalid created_by: user % does not exist', NEW.created_by;
      END IF;
      RETURN NEW;
    END;
    $trigger$ LANGUAGE plpgsql;

    CREATE TRIGGER orders_validate_created_by
      BEFORE INSERT OR UPDATE ON orders
      FOR EACH ROW
      EXECUTE FUNCTION validate_order_created_by();
  END IF;
END $$;

-- Add foreign key for orders.assigned_driver to users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'orders_validate_assigned_driver'
  ) THEN
    CREATE OR REPLACE FUNCTION validate_order_assigned_driver()
    RETURNS TRIGGER AS $trigger$
    BEGIN
      IF NEW.assigned_driver IS NOT NULL THEN
        IF NOT EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = NEW.assigned_driver
          AND role = 'driver'
          AND registration_status = 'approved'
        ) THEN
          RAISE EXCEPTION 'Invalid assigned_driver: driver % does not exist or is not approved', NEW.assigned_driver;
        END IF;
      END IF;
      RETURN NEW;
    END;
    $trigger$ LANGUAGE plpgsql;

    CREATE TRIGGER orders_validate_assigned_driver
      BEFORE INSERT OR UPDATE ON orders
      FOR EACH ROW
      EXECUTE FUNCTION validate_order_assigned_driver();
  END IF;
END $$;

-- Add foreign key for tasks.assigned_to to users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'tasks_validate_assigned_to'
  ) THEN
    CREATE OR REPLACE FUNCTION validate_task_assigned_to()
    RETURNS TRIGGER AS $trigger$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM users WHERE telegram_id = NEW.assigned_to) THEN
        RAISE EXCEPTION 'Invalid assigned_to: user % does not exist', NEW.assigned_to;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM users WHERE telegram_id = NEW.assigned_by) THEN
        RAISE EXCEPTION 'Invalid assigned_by: user % does not exist', NEW.assigned_by;
      END IF;
      RETURN NEW;
    END;
    $trigger$ LANGUAGE plpgsql;

    CREATE TRIGGER tasks_validate_assigned_to
      BEFORE INSERT OR UPDATE ON tasks
      FOR EACH ROW
      EXECUTE FUNCTION validate_task_assigned_to();
  END IF;
END $$;

-- ============================================================================
-- STEP 8: Add data validation constraints
-- ============================================================================

-- Ensure order total_amount is non-negative
ALTER TABLE orders DROP CONSTRAINT IF EXISTS check_orders_total_amount_positive;
ALTER TABLE orders ADD CONSTRAINT check_orders_total_amount_positive
  CHECK (total_amount >= 0);

-- Ensure product price and stock are non-negative
ALTER TABLE products DROP CONSTRAINT IF EXISTS check_products_price_positive;
ALTER TABLE products ADD CONSTRAINT check_products_price_positive
  CHECK (price >= 0);

ALTER TABLE products DROP CONSTRAINT IF EXISTS check_products_stock_nonnegative;
ALTER TABLE products ADD CONSTRAINT check_products_stock_nonnegative
  CHECK (stock_quantity >= 0);

-- Ensure inventory quantities are non-negative
ALTER TABLE inventory_records DROP CONSTRAINT IF EXISTS check_inventory_quantities_nonnegative;
ALTER TABLE inventory_records ADD CONSTRAINT check_inventory_quantities_nonnegative
  CHECK (
    on_hand_quantity >= 0
    AND reserved_quantity >= 0
    AND damaged_quantity >= 0
    AND low_stock_threshold >= 0
  );

-- Ensure driver inventory quantity is non-negative
ALTER TABLE driver_inventory_records DROP CONSTRAINT IF EXISTS check_driver_inventory_quantity_nonnegative;
ALTER TABLE driver_inventory_records ADD CONSTRAINT check_driver_inventory_quantity_nonnegative
  CHECK (quantity >= 0);

-- Ensure restock requested_quantity is positive
ALTER TABLE restock_requests DROP CONSTRAINT IF EXISTS check_restock_quantity_positive;
ALTER TABLE restock_requests ADD CONSTRAINT check_restock_quantity_positive
  CHECK (requested_quantity > 0);

-- Ensure business ownership and commission percentages are valid
ALTER TABLE business_users DROP CONSTRAINT IF EXISTS check_business_users_percentages;
ALTER TABLE business_users ADD CONSTRAINT check_business_users_percentages
  CHECK (
    ownership_percentage >= 0 AND ownership_percentage <= 100
    AND commission_percentage >= 0 AND commission_percentage <= 100
  );

-- ============================================================================
-- STEP 9: Add cascade delete rules for cleanup
-- ============================================================================

-- When a business is deleted, clean up related user contexts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_business_contexts_active_business_id_fkey'
  ) THEN
    ALTER TABLE user_business_contexts
      DROP CONSTRAINT user_business_contexts_active_business_id_fkey;
  END IF;

  ALTER TABLE user_business_contexts
    ADD CONSTRAINT user_business_contexts_active_business_id_fkey
    FOREIGN KEY (active_business_id)
    REFERENCES businesses(id)
    ON DELETE SET NULL;
END $$;

-- ============================================================================
-- STEP 10: Create trigger for business context validation
-- ============================================================================

-- Ensure orders are assigned to correct business context
CREATE OR REPLACE FUNCTION validate_order_business_context()
RETURNS TRIGGER AS $$
BEGIN
  -- If order has business_id, validate it matches user's access
  IF NEW.business_id IS NOT NULL THEN
    -- Check if creator has access to this business
    IF NOT EXISTS (
      SELECT 1 FROM business_users
      WHERE business_id = NEW.business_id
      AND user_id = NEW.created_by
      AND active = true
    ) AND NOT is_infrastructure_owner() THEN
      RAISE EXCEPTION 'User % does not have access to business %',
        NEW.created_by, NEW.business_id;
    END IF;

    -- If assigned driver is set, ensure they have access to this business
    IF NEW.assigned_driver IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM business_users
        WHERE business_id = NEW.business_id
        AND user_id = NEW.assigned_driver
        AND active = true
      ) AND NOT is_infrastructure_owner() THEN
        RAISE EXCEPTION 'Driver % does not have access to business %',
          NEW.assigned_driver, NEW.business_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_validate_business_context ON orders;
CREATE TRIGGER orders_validate_business_context
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_business_context();

-- ============================================================================
-- STEP 11: Add indexes for foreign key lookups
-- ============================================================================

-- Indexes for telegram_id lookups (string-based foreign keys)
CREATE INDEX IF NOT EXISTS idx_orders_created_by_lookup ON orders(created_by);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_driver_lookup ON orders(assigned_driver) WHERE assigned_driver IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_lookup ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by_lookup ON tasks(assigned_by);
CREATE INDEX IF NOT EXISTS idx_driver_status_records_driver_lookup ON driver_status_records(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_zone_assignments_driver_lookup ON driver_zone_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_inventory_records_driver_lookup ON driver_inventory_records(driver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_lookup ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_restock_requests_requested_by_lookup ON restock_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_business_users_user_lookup ON business_users(user_id);

-- ============================================================================
-- STEP 12: Add comments for documentation
-- ============================================================================

COMMENT ON FUNCTION has_business_access(UUID) IS 'Checks if current user has access to specified business';
COMMENT ON FUNCTION has_role_in_specific_business(UUID, user_role[]) IS 'Checks if user has specific role(s) in a business';
COMMENT ON FUNCTION get_user_businesses() IS 'Returns list of businesses the current user has access to';

-- ============================================================================
-- Verification and Summary
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
  function_count INTEGER;
  constraint_count INTEGER;
BEGIN
  SELECT count(*) INTO policy_count FROM pg_policies
  WHERE tablename IN ('orders', 'products', 'zones', 'inventory_locations');

  SELECT count(*) INTO function_count FROM pg_proc
  WHERE proname IN ('has_business_access', 'has_role_in_specific_business', 'get_user_businesses');

  SELECT count(*) INTO constraint_count FROM information_schema.table_constraints
  WHERE constraint_type = 'CHECK'
  AND table_name IN ('orders', 'products', 'inventory_records', 'business_users');

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Enhanced Security & Constraints Summary:';
  RAISE NOTICE 'Business-aware RLS policies: %', policy_count;
  RAISE NOTICE 'Business context helper functions: %', function_count;
  RAISE NOTICE 'Data validation constraints: %', constraint_count;
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Multi-tenant isolation: ENABLED';
  RAISE NOTICE 'Foreign key validation: ENABLED (via triggers)';
  RAISE NOTICE 'Data integrity checks: ENABLED';
  RAISE NOTICE '==========================================';
END $$;
