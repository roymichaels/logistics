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
*/

-- Create ENUM types
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('new', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_type AS ENUM ('delivery', 'warehouse', 'sales', 'customer_service', 'general');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE route_status AS ENUM ('planned', 'active', 'completed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Convert users.role column
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'role' AND data_type = 'text'
  ) THEN
    ALTER TABLE users 
      ALTER COLUMN role TYPE user_role 
      USING role::user_role;
  END IF;
END $$;

-- Convert orders.status column
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'status' AND data_type = 'text'
  ) THEN
    ALTER TABLE orders 
      ALTER COLUMN status TYPE order_status 
      USING status::order_status;
  END IF;
END $$;

-- Convert tasks.type column
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'type' AND data_type = 'text'
  ) THEN
    ALTER TABLE tasks 
      ALTER COLUMN type TYPE task_type 
      USING type::task_type;
  END IF;
END $$;

-- Convert tasks.status column
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'status' AND data_type = 'text'
  ) THEN
    ALTER TABLE tasks 
      ALTER COLUMN status TYPE task_status 
      USING status::task_status;
  END IF;
END $$;

-- Convert tasks.priority column
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'priority' AND data_type = 'text'
  ) THEN
    ALTER TABLE tasks 
      ALTER COLUMN priority TYPE task_priority 
      USING priority::task_priority;
  END IF;
END $$;

-- Convert routes.status column
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'routes' AND column_name = 'status' AND data_type = 'text'
  ) THEN
    ALTER TABLE routes 
      ALTER COLUMN status TYPE route_status 
      USING status::route_status;
  END IF;
END $$;
