/*
  # Create Tasks Management System

  ## Overview
  Simple task management system with assignments, priorities, and status tracking.

  ## New Tables
  - `tasks`
    - `id` (uuid, primary key)
    - `title` (text) - task title
    - `description` (text) - detailed description
    - `status` (text) - pending, in_progress, completed, cancelled
    - `priority` (text) - low, normal, high, urgent
    - `assigned_to` (uuid) - user assigned to task
    - `assigned_by` (uuid) - user who created/assigned task
    - `due_date` (timestamptz) - optional due date
    - `notes` (text) - additional notes
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on tasks table
  - Managers and dispatchers can create/update/delete tasks
  - Assigned users can view and update their own tasks
  - Superadmins can view all tasks
*/

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority text DEFAULT 'normal' NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to text,
  assigned_by uuid NOT NULL,
  due_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON tasks(assigned_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Managers can manage tasks" ON tasks;
DROP POLICY IF EXISTS "Dispatchers can manage tasks" ON tasks;
DROP POLICY IF EXISTS "Assigned users can view their tasks" ON tasks;
DROP POLICY IF EXISTS "Assigned users can update their tasks" ON tasks;
DROP POLICY IF EXISTS "Superadmins can manage all tasks" ON tasks;

-- Managers can manage all tasks
CREATE POLICY "Managers can manage tasks"
  ON tasks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'business_owner')
    )
  );

-- Dispatchers can manage all tasks
CREATE POLICY "Dispatchers can manage tasks"
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

-- Assigned users can view their tasks
CREATE POLICY "Assigned users can view their tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    tasks.assigned_to = auth.uid()::text
  );

-- Assigned users can update status and notes on their tasks
CREATE POLICY "Assigned users can update their tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    tasks.assigned_to = auth.uid()::text
  )
  WITH CHECK (
    tasks.assigned_to = auth.uid()::text
  );

-- Superadmins can view and manage all tasks
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

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();