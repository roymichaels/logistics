/*
  # Fix ENUM Conversion for Existing Schema

  This migration handles the ENUM conversion when the types already exist
  from the complete schema migration.

  ## Changes
  - Safely converts TEXT columns to ENUM types
  - Handles case where ENUM types already exist
  - Cleans up invalid data
  - Recreates RLS policies that depend on role column
*/

-- ============================================================================
-- STEP 1: Clean up any invalid data in users table
-- ============================================================================

-- Update any users with roles not in the ENUM
UPDATE users
SET role = 'user'
WHERE role NOT IN (
  'user',
  'infrastructure_owner',
  'business_owner',
  'manager',
  'dispatcher',
  'driver',
  'warehouse',
  'sales',
  'customer_service'
);

-- ============================================================================
-- STEP 2: Convert users.role column if still TEXT
-- ============================================================================

DO $$
BEGIN
  -- Check if the column is still TEXT type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
    AND column_name = 'role'
    AND data_type = 'text'
  ) THEN
    -- Drop all policies that reference the role column
    DROP POLICY IF EXISTS "Managers and warehouse can insert products" ON products;
    DROP POLICY IF EXISTS "Managers and warehouse can update products" ON products;
    DROP POLICY IF EXISTS "Managers can delete products" ON products;
    DROP POLICY IF EXISTS "Staff can read orders" ON orders;
    DROP POLICY IF EXISTS "Managers and sales can insert orders" ON orders;
    DROP POLICY IF EXISTS "Managers, sales, dispatchers can update orders" ON orders;
    DROP POLICY IF EXISTS "Managers can delete orders" ON orders;
    DROP POLICY IF EXISTS "Users can read relevant tasks" ON tasks;
    DROP POLICY IF EXISTS "Managers and dispatchers can insert tasks" ON tasks;
    DROP POLICY IF EXISTS "Assigned users can update tasks" ON tasks;
    DROP POLICY IF EXISTS "Managers can delete tasks" ON tasks;
    DROP POLICY IF EXISTS "Drivers and managers can read routes" ON routes;
    DROP POLICY IF EXISTS "Managers and dispatchers can insert routes" ON routes;
    DROP POLICY IF EXISTS "Managers and dispatchers can update routes" ON routes;
    DROP POLICY IF EXISTS "Members can read their chats" ON group_chats;
    DROP POLICY IF EXISTS "Managers can manage chats" ON group_chats;
    DROP POLICY IF EXISTS "Subscribers can read channels" ON channels;
    DROP POLICY IF EXISTS "Managers can manage channels" ON channels;
    DROP POLICY IF EXISTS "Managers can manage app config" ON app_config;
    DROP POLICY IF EXISTS "Infrastructure owners can manage all businesses" ON businesses;
    DROP POLICY IF EXISTS "Users can read business_users for their businesses" ON business_users;
    DROP POLICY IF EXISTS "Business owners and infrastructure owners can manage business_users" ON business_users;
    DROP POLICY IF EXISTS "Managers can manage inventory locations" ON inventory_locations;
    DROP POLICY IF EXISTS "Warehouse and managers can manage inventory" ON inventory_records;
    DROP POLICY IF EXISTS "Drivers can read own inventory" ON driver_inventory_records;
    DROP POLICY IF EXISTS "Managers can manage driver inventory" ON driver_inventory_records;
    DROP POLICY IF EXISTS "Managers can manage zones" ON zones;
    DROP POLICY IF EXISTS "Users can read zone assignments" ON driver_zone_assignments;
    DROP POLICY IF EXISTS "Managers can manage zone assignments" ON driver_zone_assignments;
    DROP POLICY IF EXISTS "Drivers can manage own status" ON driver_status_records;
    DROP POLICY IF EXISTS "Users can read relevant movement logs" ON driver_movement_logs;
    DROP POLICY IF EXISTS "Users can read relevant restock requests" ON restock_requests;
    DROP POLICY IF EXISTS "Managers can update restock requests" ON restock_requests;
    DROP POLICY IF EXISTS "Users can read inventory logs" ON inventory_logs;
    DROP POLICY IF EXISTS "Users can read sales logs" ON sales_logs;
    DROP POLICY IF EXISTS "Sales users can create sales logs" ON sales_logs;
    DROP POLICY IF EXISTS "Users can read own registration" ON user_registrations;
    DROP POLICY IF EXISTS "Managers can update registrations" ON user_registrations;
    DROP POLICY IF EXISTS "Chat members can read messages" ON messages;

    -- Now convert the column
    ALTER TABLE users
      ALTER COLUMN role TYPE user_role
      USING role::user_role;

    -- Recreate all the policies
    -- Products policies
    CREATE POLICY "Managers and warehouse can insert products"
      ON products FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'warehouse')
        )
      );

    CREATE POLICY "Managers and warehouse can update products"
      ON products FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'warehouse')
        )
      );

    CREATE POLICY "Managers can delete products"
      ON products FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role = 'manager'
        )
      );

    -- Orders policies
    CREATE POLICY "Staff can read orders"
      ON orders FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service')
        )
      );

    CREATE POLICY "Managers and sales can insert orders"
      ON orders FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'sales')
        )
      );

    CREATE POLICY "Managers, sales, dispatchers can update orders"
      ON orders FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'sales', 'dispatcher')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'sales', 'dispatcher')
        )
      );

    CREATE POLICY "Managers can delete orders"
      ON orders FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role = 'manager'
        )
      );

    -- Tasks policies
    CREATE POLICY "Users can read relevant tasks"
      ON tasks FOR SELECT TO authenticated
      USING (
        assigned_to = (auth.jwt() ->> 'telegram_id')
        OR assigned_by = (auth.jwt() ->> 'telegram_id')
        OR EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'dispatcher')
        )
      );

    CREATE POLICY "Managers and dispatchers can insert tasks"
      ON tasks FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'dispatcher')
        )
      );

    CREATE POLICY "Assigned users can update tasks"
      ON tasks FOR UPDATE TO authenticated
      USING (
        assigned_to = (auth.jwt() ->> 'telegram_id')
        OR assigned_by = (auth.jwt() ->> 'telegram_id')
        OR EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'dispatcher')
        )
      )
      WITH CHECK (
        assigned_to = (auth.jwt() ->> 'telegram_id')
        OR assigned_by = (auth.jwt() ->> 'telegram_id')
        OR EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'dispatcher')
        )
      );

    CREATE POLICY "Managers can delete tasks"
      ON tasks FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role = 'manager'
        )
      );

    -- Routes policies
    CREATE POLICY "Drivers and managers can read routes"
      ON routes FOR SELECT TO authenticated
      USING (
        driver_id = (auth.jwt() ->> 'telegram_id')
        OR EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'dispatcher')
        )
      );

    CREATE POLICY "Managers and dispatchers can insert routes"
      ON routes FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'dispatcher')
        )
      );

    CREATE POLICY "Managers and dispatchers can update routes"
      ON routes FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'dispatcher')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'dispatcher')
        )
      );

    -- Group chats policies
    CREATE POLICY "Members can read their chats"
      ON group_chats FOR SELECT TO authenticated
      USING (
        (auth.jwt() ->> 'telegram_id') = ANY(members)
        OR EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role = 'manager'
        )
      );

    CREATE POLICY "Managers can manage chats"
      ON group_chats FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role = 'manager'
        )
      );

    -- Channels policies
    CREATE POLICY "Subscribers can read channels"
      ON channels FOR SELECT TO authenticated
      USING (
        (auth.jwt() ->> 'telegram_id') = ANY(subscribers)
        OR EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role = 'manager'
        )
      );

    CREATE POLICY "Managers can manage channels"
      ON channels FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role = 'manager'
        )
      );

    -- App config policies
    CREATE POLICY "Managers can manage app config"
      ON app_config FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role = 'manager'
        )
      );

    -- Recreate new table policies that depend on users.role
    CREATE POLICY "Infrastructure owners can manage all businesses"
      ON businesses FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role = 'infrastructure_owner'
        )
      );

    CREATE POLICY "Users can read business_users for their businesses"
      ON business_users FOR SELECT TO authenticated
      USING (
        business_id IN (
          SELECT business_id FROM business_users
          WHERE user_id = (auth.jwt() ->> 'telegram_id') AND active = true
        )
        OR EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role = 'infrastructure_owner'
        )
      );

    CREATE POLICY "Business owners and infrastructure owners can manage business_users"
      ON business_users FOR ALL TO authenticated
      USING (
        business_id IN (
          SELECT business_id FROM business_users
          WHERE user_id = (auth.jwt() ->> 'telegram_id')
          AND role = 'business_owner' AND active = true
        )
        OR EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role = 'infrastructure_owner'
        )
      );

    CREATE POLICY "Managers can manage inventory locations"
      ON inventory_locations FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'warehouse', 'infrastructure_owner', 'business_owner')
        )
      );

    CREATE POLICY "Warehouse and managers can manage inventory"
      ON inventory_records FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'warehouse', 'infrastructure_owner', 'business_owner')
        )
      );

    CREATE POLICY "Drivers can read own inventory"
      ON driver_inventory_records FOR SELECT TO authenticated
      USING (
        driver_id = (auth.jwt() ->> 'telegram_id')
        OR EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'dispatcher', 'warehouse', 'infrastructure_owner', 'business_owner')
        )
      );

    CREATE POLICY "Managers can manage driver inventory"
      ON driver_inventory_records FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'dispatcher', 'warehouse', 'infrastructure_owner', 'business_owner')
        )
      );

    CREATE POLICY "Managers can manage zones"
      ON zones FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'dispatcher', 'infrastructure_owner', 'business_owner')
        )
      );

    CREATE POLICY "Users can read zone assignments"
      ON driver_zone_assignments FOR SELECT TO authenticated
      USING (
        driver_id = (auth.jwt() ->> 'telegram_id')
        OR EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'dispatcher', 'infrastructure_owner', 'business_owner')
        )
      );

    CREATE POLICY "Managers can manage zone assignments"
      ON driver_zone_assignments FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'dispatcher', 'infrastructure_owner', 'business_owner')
        )
      );

    CREATE POLICY "Drivers can manage own status"
      ON driver_status_records FOR ALL TO authenticated
      USING (
        driver_id = (auth.jwt() ->> 'telegram_id')
        OR EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'dispatcher', 'infrastructure_owner', 'business_owner')
        )
      )
      WITH CHECK (
        driver_id = (auth.jwt() ->> 'telegram_id')
        OR EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'dispatcher', 'infrastructure_owner', 'business_owner')
        )
      );

    CREATE POLICY "Users can read relevant movement logs"
      ON driver_movement_logs FOR SELECT TO authenticated
      USING (
        driver_id = (auth.jwt() ->> 'telegram_id')
        OR EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'dispatcher', 'infrastructure_owner', 'business_owner')
        )
      );

    CREATE POLICY "Users can read relevant restock requests"
      ON restock_requests FOR SELECT TO authenticated
      USING (
        requested_by = (auth.jwt() ->> 'telegram_id')
        OR EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'warehouse', 'infrastructure_owner', 'business_owner')
        )
      );

    CREATE POLICY "Managers can update restock requests"
      ON restock_requests FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'warehouse', 'infrastructure_owner', 'business_owner')
        )
      );

    CREATE POLICY "Users can read inventory logs"
      ON inventory_logs FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'warehouse', 'dispatcher', 'infrastructure_owner', 'business_owner')
        )
      );

    CREATE POLICY "Users can read sales logs"
      ON sales_logs FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'sales', 'warehouse', 'infrastructure_owner', 'business_owner')
        )
      );

    CREATE POLICY "Sales users can create sales logs"
      ON sales_logs FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'sales', 'driver', 'infrastructure_owner', 'business_owner')
        )
      );

    CREATE POLICY "Users can read own registration"
      ON user_registrations FOR SELECT TO authenticated
      USING (
        telegram_id = (auth.jwt() ->> 'telegram_id')
        OR EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'infrastructure_owner')
        )
      );

    CREATE POLICY "Managers can update registrations"
      ON user_registrations FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'infrastructure_owner')
        )
      );

    CREATE POLICY "Chat members can read messages"
      ON messages FOR SELECT TO authenticated
      USING (
        chat_id IN (
          SELECT id FROM group_chats
          WHERE (auth.jwt() ->> 'telegram_id') = ANY(members)
        )
        OR EXISTS (
          SELECT 1 FROM users
          WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
          AND role IN ('manager', 'infrastructure_owner')
        )
      );

    RAISE NOTICE 'Successfully converted users.role to user_role ENUM';
  ELSE
    RAISE NOTICE 'users.role is already user_role ENUM type, skipping conversion';
  END IF;
END $$;
