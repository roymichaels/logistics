/*
  # Convert role column to ENUM type for dropdown in Supabase UI

  1. Changes
    - Create custom ENUM type for user roles
    - Convert users.role column from TEXT with CHECK to ENUM
    - Convert orders.status column from TEXT with CHECK to ENUM
    - Convert tasks.type and tasks.status columns to ENUM
    - Convert tasks.priority column to ENUM
    - Convert routes.status column to ENUM

  2. Benefits
    - Supabase UI will show dropdowns for these columns
    - Type safety at database level
    - Better performance than TEXT with CHECK

  3. Implementation Strategy
    - Drop all RLS policies that reference the columns being converted
    - Clean up any invalid data
    - Perform the type conversions with explicit casting
    - Recreate all RLS policies with identical logic
    - This prevents "cannot alter type of a column used in a policy definition" errors
*/

-- Create ENUM types
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
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
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'new',
    'confirmed',
    'preparing',
    'ready',
    'out_for_delivery',
    'delivered',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_type AS ENUM (
    'delivery',
    'warehouse',
    'sales',
    'customer_service',
    'general'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE route_status AS ENUM (
    'planned',
    'active',
    'completed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- STEP 1: Drop all RLS policies that reference users.role column
-- ============================================================================

-- Products table policies
DROP POLICY IF EXISTS "Managers and warehouse can insert products" ON products;
DROP POLICY IF EXISTS "Managers and warehouse can update products" ON products;
DROP POLICY IF EXISTS "Managers can delete products" ON products;

-- Orders table policies
DROP POLICY IF EXISTS "Staff can read orders" ON orders;
DROP POLICY IF EXISTS "Managers and sales can insert orders" ON orders;
DROP POLICY IF EXISTS "Managers, sales, dispatchers can update orders" ON orders;
DROP POLICY IF EXISTS "Managers can delete orders" ON orders;

-- Tasks table policies
DROP POLICY IF EXISTS "Users can read relevant tasks" ON tasks;
DROP POLICY IF EXISTS "Managers and dispatchers can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Assigned users can update tasks" ON tasks;
DROP POLICY IF EXISTS "Managers can delete tasks" ON tasks;

-- Routes table policies
DROP POLICY IF EXISTS "Drivers and managers can read routes" ON routes;
DROP POLICY IF EXISTS "Managers and dispatchers can insert routes" ON routes;
DROP POLICY IF EXISTS "Managers and dispatchers can update routes" ON routes;

-- Group chats policies
DROP POLICY IF EXISTS "Members can read their chats" ON group_chats;
DROP POLICY IF EXISTS "Managers can manage chats" ON group_chats;

-- Channels policies
DROP POLICY IF EXISTS "Subscribers can read channels" ON channels;
DROP POLICY IF EXISTS "Managers can manage channels" ON channels;

-- App config policies
DROP POLICY IF EXISTS "Managers can manage app config" ON app_config;

-- ============================================================================
-- STEP 2: Clean up any invalid data and convert column types to ENUM
-- ============================================================================

-- First, normalize any invalid role values to 'user'
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

-- Convert users.role column with explicit text cast
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role' AND data_type = 'text'
  ) THEN
    ALTER TABLE users
      ALTER COLUMN role TYPE user_role
      USING role::text::user_role;
  END IF;
END $$;

-- Convert orders.status column with explicit text cast
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'status' AND data_type = 'text'
  ) THEN
    -- First normalize any invalid status values
    UPDATE orders
    SET status = 'new'
    WHERE status NOT IN ('new', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled');

    ALTER TABLE orders
      ALTER COLUMN status TYPE order_status
      USING status::text::order_status;
  END IF;
END $$;

-- Convert tasks.type column with explicit text cast
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'type' AND data_type = 'text'
  ) THEN
    -- First normalize any invalid type values
    UPDATE tasks
    SET type = 'general'
    WHERE type NOT IN ('delivery', 'warehouse', 'sales', 'customer_service', 'general');

    ALTER TABLE tasks
      ALTER COLUMN type TYPE task_type
      USING type::text::task_type;
  END IF;
END $$;

-- Convert tasks.status column with explicit text cast
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'status' AND data_type = 'text'
  ) THEN
    -- First normalize any invalid status values
    UPDATE tasks
    SET status = 'pending'
    WHERE status NOT IN ('pending', 'in_progress', 'completed', 'cancelled');

    ALTER TABLE tasks
      ALTER COLUMN status TYPE task_status
      USING status::text::task_status;
  END IF;
END $$;

-- Convert tasks.priority column with explicit text cast
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'priority' AND data_type = 'text'
  ) THEN
    -- First normalize any invalid priority values
    UPDATE tasks
    SET priority = 'medium'
    WHERE priority NOT IN ('low', 'medium', 'high', 'urgent');

    ALTER TABLE tasks
      ALTER COLUMN priority TYPE task_priority
      USING priority::text::task_priority;
  END IF;
END $$;

-- Convert routes.status column with explicit text cast
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'routes' AND column_name = 'status' AND data_type = 'text'
  ) THEN
    -- First normalize any invalid status values
    UPDATE routes
    SET status = 'planned'
    WHERE status NOT IN ('planned', 'active', 'completed');

    ALTER TABLE routes
      ALTER COLUMN status TYPE route_status
      USING status::text::route_status;
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Recreate all RLS policies with identical logic
-- ============================================================================

-- Products policies
CREATE POLICY "Managers and warehouse can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'warehouse')
    )
  );

CREATE POLICY "Managers and warehouse can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'warehouse')
    )
  );

CREATE POLICY "Managers can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role = 'manager'
    )
  );

-- Orders policies
CREATE POLICY "Staff can read orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service')
    )
  );

CREATE POLICY "Managers and sales can insert orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'sales')
    )
  );

CREATE POLICY "Managers, sales, dispatchers can update orders"
  ON orders FOR UPDATE
  TO authenticated
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
  ON orders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role = 'manager'
    )
  );

-- Tasks policies
CREATE POLICY "Users can read relevant tasks"
  ON tasks FOR SELECT
  TO authenticated
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
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'dispatcher')
    )
  );

CREATE POLICY "Assigned users can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
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
  ON tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role = 'manager'
    )
  );

-- Routes policies
CREATE POLICY "Drivers and managers can read routes"
  ON routes FOR SELECT
  TO authenticated
  USING (
    driver_id = (auth.jwt() ->> 'telegram_id')
    OR EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'dispatcher')
    )
  );

CREATE POLICY "Managers and dispatchers can insert routes"
  ON routes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'dispatcher')
    )
  );

CREATE POLICY "Managers and dispatchers can update routes"
  ON routes FOR UPDATE
  TO authenticated
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
  ON group_chats FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'telegram_id') = ANY(members)
    OR EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role = 'manager'
    )
  );

CREATE POLICY "Managers can manage chats"
  ON group_chats FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role = 'manager'
    )
  );

-- Channels policies
CREATE POLICY "Subscribers can read channels"
  ON channels FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'telegram_id') = ANY(subscribers)
    OR EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role = 'manager'
    )
  );

CREATE POLICY "Managers can manage channels"
  ON channels FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role = 'manager'
    )
  );

-- App config policies
CREATE POLICY "Managers can manage app config"
  ON app_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role = 'manager'
    )
  );
