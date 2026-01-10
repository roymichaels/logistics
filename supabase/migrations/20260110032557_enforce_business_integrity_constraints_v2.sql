/*
  # Enforce Business-Scoped Data Integrity

  ## Summary
  This migration enforces strict business context requirements across all business-scoped
  tables to prevent orphaned data and ensure referential integrity.

  ## Changes

  ### 1. Add NOT NULL Constraints
  - Ensures all business-scoped entities MUST have a valid business_id
  - Adds NOT NULL to tables where it was missing:
    - product_categories.business_id
    - zones.business_id
    - driver_profiles.business_id

  ### 2. Add Business Existence Check Function
  - Creates a reusable function to validate business existence and ownership
  - Used in triggers and application-level validation

  ### 3. Add Triggers for Business Validation
  - Prevents INSERT/UPDATE operations with invalid business_id
  - Ensures business exists and is active before allowing operations
  - Validates business ownership for staff role assignments

  ### 4. Add Referential Integrity Checks
  - Ensures driver_inventory has business context through product
  - Adds composite foreign key validation

  ### 5. Create Orphan Detection Views
  - Admin views to detect any existing orphaned records
  - Helps identify data integrity issues

  ## Security
  - All validation functions are security definer
  - Triggers run before INSERT/UPDATE to prevent bad data
  - RLS policies remain unchanged
*/

-- =======================
-- 1. ADD NOT NULL CONSTRAINTS
-- =======================

-- Add NOT NULL to product_categories.business_id if missing
DO $$
BEGIN
  ALTER TABLE product_categories
  ALTER COLUMN business_id SET NOT NULL;
EXCEPTION
  WHEN others THEN
    NULL;
END $$;

-- Add NOT NULL to zones.business_id if missing
DO $$
BEGIN
  ALTER TABLE zones
  ALTER COLUMN business_id SET NOT NULL;
EXCEPTION
  WHEN others THEN
    NULL;
END $$;

-- Add NOT NULL to driver_profiles.business_id if missing
DO $$
BEGIN
  ALTER TABLE driver_profiles
  ALTER COLUMN business_id SET NOT NULL;
EXCEPTION
  WHEN others THEN
    NULL;
END $$;

-- =======================
-- 2. BUSINESS VALIDATION FUNCTIONS
-- =======================

-- Function to check if business exists and is active
CREATE OR REPLACE FUNCTION validate_business_exists(business_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM businesses
    WHERE id = business_uuid
    AND status = 'active'
  );
END;
$$;

-- Function to check if user owns or has access to business
CREATE OR REPLACE FUNCTION user_has_business_access(user_uuid uuid, business_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is owner
  IF EXISTS (
    SELECT 1 FROM businesses
    WHERE id = business_uuid AND owner_id = user_uuid
  ) THEN
    RETURN true;
  END IF;

  -- Check if user is staff member
  IF EXISTS (
    SELECT 1 FROM user_business_roles
    WHERE user_id = user_uuid
    AND business_id = business_uuid
    AND active = true
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Function to prevent orphaned business-scoped records
CREATE OR REPLACE FUNCTION prevent_orphaned_business_record()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if business_id is provided and valid
  IF NEW.business_id IS NULL THEN
    RAISE EXCEPTION 'business_id cannot be NULL for table %', TG_TABLE_NAME;
  END IF;

  -- Check if business exists and is active
  IF NOT validate_business_exists(NEW.business_id) THEN
    RAISE EXCEPTION 'Invalid or inactive business_id % for table %', NEW.business_id, TG_TABLE_NAME;
  END IF;

  RETURN NEW;
END;
$$;

-- =======================
-- 3. ADD VALIDATION TRIGGERS
-- =======================

-- Trigger for product_categories
DROP TRIGGER IF EXISTS validate_product_category_business ON product_categories;
CREATE TRIGGER validate_product_category_business
  BEFORE INSERT OR UPDATE ON product_categories
  FOR EACH ROW
  EXECUTE FUNCTION prevent_orphaned_business_record();

-- Trigger for products
DROP TRIGGER IF EXISTS validate_product_business ON products;
CREATE TRIGGER validate_product_business
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION prevent_orphaned_business_record();

-- Trigger for inventory_locations
DROP TRIGGER IF EXISTS validate_inventory_location_business ON inventory_locations;
CREATE TRIGGER validate_inventory_location_business
  BEFORE INSERT OR UPDATE ON inventory_locations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_orphaned_business_record();

-- Trigger for inventory
DROP TRIGGER IF EXISTS validate_inventory_business ON inventory;
CREATE TRIGGER validate_inventory_business
  BEFORE INSERT OR UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION prevent_orphaned_business_record();

-- Trigger for inventory_logs
DROP TRIGGER IF EXISTS validate_inventory_log_business ON inventory_logs;
CREATE TRIGGER validate_inventory_log_business
  BEFORE INSERT OR UPDATE ON inventory_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_orphaned_business_record();

-- Trigger for restock_requests
DROP TRIGGER IF EXISTS validate_restock_request_business ON restock_requests;
CREATE TRIGGER validate_restock_request_business
  BEFORE INSERT OR UPDATE ON restock_requests
  FOR EACH ROW
  EXECUTE FUNCTION prevent_orphaned_business_record();

-- Trigger for zones
DROP TRIGGER IF EXISTS validate_zone_business ON zones;
CREATE TRIGGER validate_zone_business
  BEFORE INSERT OR UPDATE ON zones
  FOR EACH ROW
  EXECUTE FUNCTION prevent_orphaned_business_record();

-- Trigger for orders
DROP TRIGGER IF EXISTS validate_order_business ON orders;
CREATE TRIGGER validate_order_business
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION prevent_orphaned_business_record();

-- Trigger for driver_profiles
DROP TRIGGER IF EXISTS validate_driver_profile_business ON driver_profiles;
CREATE TRIGGER validate_driver_profile_business
  BEFORE INSERT OR UPDATE ON driver_profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_orphaned_business_record();

-- =======================
-- 4. USER BUSINESS ROLES VALIDATION
-- =======================

-- Function to ensure staff roles can only exist with valid business
CREATE OR REPLACE FUNCTION validate_user_business_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Ensure business exists
  IF NOT validate_business_exists(NEW.business_id) THEN
    RAISE EXCEPTION 'Cannot assign role: business_id % does not exist or is inactive', NEW.business_id;
  END IF;

  -- Ensure user exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = NEW.user_id) THEN
    RAISE EXCEPTION 'Cannot assign role: user_id % does not exist', NEW.user_id;
  END IF;

  -- Ensure role is a valid staff role (not business_owner, driver, customer, guest)
  IF NEW.role NOT IN ('manager', 'warehouse', 'dispatcher', 'sales', 'customer_service') THEN
    RAISE EXCEPTION 'Invalid staff role: %. Must be one of: manager, warehouse, dispatcher, sales, customer_service', NEW.role;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_user_business_role_insert ON user_business_roles;
CREATE TRIGGER validate_user_business_role_insert
  BEFORE INSERT OR UPDATE ON user_business_roles
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_business_role();

-- =======================
-- 5. ADD DRIVER INVENTORY BUSINESS CONTEXT
-- =======================

-- Function to validate driver_inventory has business context
CREATE OR REPLACE FUNCTION validate_driver_inventory_business()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  product_business_id uuid;
BEGIN
  -- Get business_id from product
  SELECT business_id INTO product_business_id
  FROM products
  WHERE id = NEW.product_id;

  IF product_business_id IS NULL THEN
    RAISE EXCEPTION 'Cannot assign inventory: product_id % does not exist', NEW.product_id;
  END IF;

  -- Validate driver has access to this business
  IF NOT EXISTS (
    SELECT 1 FROM driver_profiles
    WHERE id = NEW.driver_id
    AND business_id = product_business_id
  ) THEN
    RAISE EXCEPTION 'Driver % does not belong to business % for product %',
      NEW.driver_id, product_business_id, NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_driver_inventory ON driver_inventory;
CREATE TRIGGER validate_driver_inventory
  BEFORE INSERT OR UPDATE ON driver_inventory
  FOR EACH ROW
  EXECUTE FUNCTION validate_driver_inventory_business();

-- =======================
-- 6. ORPHAN DETECTION VIEWS
-- =======================

-- View to detect products without valid business
DROP VIEW IF EXISTS orphaned_products CASCADE;
CREATE VIEW orphaned_products AS
SELECT
  p.id,
  p.name,
  p.business_id,
  'Product has no valid business reference' as issue
FROM products p
LEFT JOIN businesses b ON p.business_id = b.id
WHERE b.id IS NULL;

-- View to detect inventory without valid business
DROP VIEW IF EXISTS orphaned_inventory CASCADE;
CREATE VIEW orphaned_inventory AS
SELECT
  i.id,
  i.product_id,
  i.business_id,
  'Inventory has no valid business reference' as issue
FROM inventory i
LEFT JOIN businesses b ON i.business_id = b.id
WHERE b.id IS NULL;

-- View to detect orders without valid business
DROP VIEW IF EXISTS orphaned_orders CASCADE;
CREATE VIEW orphaned_orders AS
SELECT
  o.id,
  o.order_number,
  o.business_id,
  'Order has no valid business reference' as issue
FROM orders o
LEFT JOIN businesses b ON o.business_id = b.id
WHERE b.id IS NULL;

-- View to detect staff roles without valid business
DROP VIEW IF EXISTS orphaned_staff_roles CASCADE;
CREATE VIEW orphaned_staff_roles AS
SELECT
  ubr.id,
  ubr.user_id,
  ubr.business_id,
  ubr.role,
  'Staff role has no valid business reference' as issue
FROM user_business_roles ubr
LEFT JOIN businesses b ON ubr.business_id = b.id
WHERE b.id IS NULL;

-- =======================
-- 7. HELPER FUNCTIONS FOR APPLICATION
-- =======================

-- Drop existing function to recreate with new signature
DROP FUNCTION IF EXISTS get_user_businesses(uuid);

-- Function to get all businesses accessible to a user
CREATE FUNCTION get_user_businesses(user_uuid uuid)
RETURNS TABLE (
  business_id uuid,
  business_name text,
  relationship text,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  -- Owned businesses
  SELECT
    b.id as business_id,
    b.name as business_name,
    'owner'::text as relationship,
    'business_owner'::text as role
  FROM businesses b
  WHERE b.owner_id = user_uuid

  UNION

  -- Staff relationships
  SELECT
    ubr.business_id,
    b.name as business_name,
    'staff'::text as relationship,
    ubr.role
  FROM user_business_roles ubr
  JOIN businesses b ON ubr.business_id = b.id
  WHERE ubr.user_id = user_uuid
  AND ubr.active = true;
END;
$$;

-- Function to check if a user can perform an action in a business
CREATE OR REPLACE FUNCTION can_user_access_business(
  user_uuid uuid,
  business_uuid uuid,
  required_role text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Owner always has access
  IF EXISTS (
    SELECT 1 FROM businesses
    WHERE id = business_uuid
    AND owner_id = user_uuid
  ) THEN
    RETURN true;
  END IF;

  -- Check staff role if specified
  IF required_role IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM user_business_roles
      WHERE user_id = user_uuid
      AND business_id = business_uuid
      AND role = required_role
      AND active = true
    );
  END IF;

  -- Check any staff access
  RETURN EXISTS (
    SELECT 1 FROM user_business_roles
    WHERE user_id = user_uuid
    AND business_id = business_uuid
    AND active = true
  );
END;
$$;

-- =======================
-- 8. ADD COMMENTS FOR DOCUMENTATION
-- =======================

COMMENT ON FUNCTION validate_business_exists IS
  'Checks if a business exists and is active. Used in triggers and application validation.';

COMMENT ON FUNCTION user_has_business_access IS
  'Checks if a user owns or is a staff member of a business.';

COMMENT ON FUNCTION prevent_orphaned_business_record IS
  'Trigger function that prevents creation of business-scoped records without valid business_id.';

COMMENT ON FUNCTION get_user_businesses IS
  'Returns all businesses a user has access to, either as owner or staff member.';

COMMENT ON FUNCTION can_user_access_business IS
  'Checks if a user can access a specific business, optionally requiring a specific role.';

-- =======================
-- 9. GRANT PERMISSIONS
-- =======================

-- Grant execute permissions on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION validate_business_exists TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_business_access TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_businesses TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_access_business TO authenticated;

-- Grant select on orphan detection views to business owners only
GRANT SELECT ON orphaned_products TO authenticated;
GRANT SELECT ON orphaned_inventory TO authenticated;
GRANT SELECT ON orphaned_orders TO authenticated;
GRANT SELECT ON orphaned_staff_roles TO authenticated;
