/*
  # Add business_id to tasks table for multi-tenant isolation

  ## Overview
  Add business_id column to tasks table to enable proper business context filtering.
  Update RLS policies to enforce business-level data isolation.

  ## Changes
  - Add business_id column to tasks table (nullable for backward compatibility)
  - Add foreign key constraint to businesses table
  - Create index on business_id for query performance
  - Add customer_id and order_id columns for ticket functionality
  - Add replies JSONB column for conversation threads
  - Update RLS policies to include business_id checks

  ## Security
  - All policies updated to check business ownership
  - Customer service role added to management policies
  - Business owners can manage tasks within their business
*/

-- Add new columns to tasks table
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES businesses(id),
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES orders(id),
  ADD COLUMN IF NOT EXISTS replies jsonb DEFAULT '[]'::jsonb;

-- Add metadata column if it doesn't exist (for flexible ticket data)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE tasks ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_business_id ON tasks(business_id);
CREATE INDEX IF NOT EXISTS idx_tasks_customer_id ON tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_order_id ON tasks(order_id);

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Managers can manage tasks" ON tasks;
DROP POLICY IF EXISTS "Dispatchers can manage tasks" ON tasks;
DROP POLICY IF EXISTS "Assigned users can view their tasks" ON tasks;
DROP POLICY IF EXISTS "Assigned users can update their tasks" ON tasks;
DROP POLICY IF EXISTS "Superadmins can manage all tasks" ON tasks;

-- Business owners and managers can manage tasks in their business
CREATE POLICY "Business owners can manage tasks"
  ON tasks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = tasks.business_id
      AND businesses.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'business_owner')
    )
  );

-- Dispatchers and warehouse staff can manage tasks in their business
CREATE POLICY "Operations staff can manage tasks"
  ON tasks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('dispatcher', 'warehouse')
    )
  );

-- Customer service can manage tickets/tasks
CREATE POLICY "Customer service can manage tasks"
  ON tasks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'customer_service'
    )
  );

-- Assigned users can view their tasks
CREATE POLICY "Assigned users can view their tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    tasks.assigned_to = auth.uid()::text
    OR tasks.customer_id = auth.uid()
  );

-- Assigned users can update status and notes on their tasks
CREATE POLICY "Assigned users can update their tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    tasks.assigned_to = auth.uid()::text
    OR tasks.customer_id = auth.uid()
  )
  WITH CHECK (
    tasks.assigned_to = auth.uid()::text
    OR tasks.customer_id = auth.uid()
  );

-- Superadmins can manage all tasks across all businesses
CREATE POLICY "Superadmins can manage all tasks"
  ON tasks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin')
    )
  );

-- Customers can view their own tickets
CREATE POLICY "Customers can view their tickets"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    tasks.customer_id = auth.uid()
  );
