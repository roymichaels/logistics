/*
  # Fix Task Priority Values

  ## Changes
  - Update task priority constraint to use 'medium' instead of 'normal'
  - Update default value from 'normal' to 'medium'
  - Update existing 'normal' priority tasks to 'medium'

  ## Security
  - No RLS changes needed
*/

-- Update existing tasks with 'normal' priority to 'medium'
UPDATE tasks
SET priority = 'medium'
WHERE priority = 'normal';

-- Drop the old constraint
ALTER TABLE tasks
DROP CONSTRAINT IF EXISTS tasks_priority_check;

-- Add new constraint with 'medium' instead of 'normal'
ALTER TABLE tasks
ADD CONSTRAINT tasks_priority_check
CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- Update default value
ALTER TABLE tasks
ALTER COLUMN priority SET DEFAULT 'medium';
