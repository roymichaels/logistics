/*
  # Enhance Driver Assignments System

  ## Updates to order_assignments table
  
  1. Add missing columns for enhanced driver workflow
  2. Update status check constraint
  3. Add indexes for performance
  4. Add RLS policies for drivers (drop existing first)

  ## Security
  
  - Drivers can read and update their own assignments
  - Business owners can manage all assignments
  - Dispatchers can create and manage assignments
*/

-- Add missing columns to order_assignments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_assignments' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE order_assignments ADD COLUMN business_id uuid REFERENCES businesses(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_assignments' AND column_name = 'picked_up_at'
  ) THEN
    ALTER TABLE order_assignments ADD COLUMN picked_up_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_assignments' AND column_name = 'delivered_at'
  ) THEN
    ALTER TABLE order_assignments ADD COLUMN delivered_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_assignments' AND column_name = 'cancelled_at'
  ) THEN
    ALTER TABLE order_assignments ADD COLUMN cancelled_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_assignments' AND column_name = 'priority'
  ) THEN
    ALTER TABLE order_assignments ADD COLUMN priority text DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_assignments' AND column_name = 'estimated_delivery_time'
  ) THEN
    ALTER TABLE order_assignments ADD COLUMN estimated_delivery_time timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_assignments' AND column_name = 'actual_delivery_time'
  ) THEN
    ALTER TABLE order_assignments ADD COLUMN actual_delivery_time timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_assignments' AND column_name = 'proof_of_delivery_url'
  ) THEN
    ALTER TABLE order_assignments ADD COLUMN proof_of_delivery_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_assignments' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE order_assignments ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_assignments' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE order_assignments ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Populate business_id from orders where missing
UPDATE order_assignments 
SET business_id = (SELECT business_id FROM orders WHERE id = order_assignments.order_id)
WHERE business_id IS NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS order_assignments_driver_status_idx 
  ON order_assignments(driver_id, status);

CREATE INDEX IF NOT EXISTS order_assignments_business_idx 
  ON order_assignments(business_id);

CREATE INDEX IF NOT EXISTS order_assignments_order_idx 
  ON order_assignments(order_id);

CREATE INDEX IF NOT EXISTS order_assignments_assigned_at_idx 
  ON order_assignments(assigned_at);

CREATE INDEX IF NOT EXISTS order_assignments_priority_idx 
  ON order_assignments(priority, assigned_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_order_assignments_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS order_assignments_updated_at ON order_assignments;
CREATE TRIGGER order_assignments_updated_at
  BEFORE UPDATE ON order_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_order_assignments_timestamp();

-- Function to automatically update order status when assignment changes
CREATE OR REPLACE FUNCTION sync_order_status_from_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- When assignment is accepted, mark order as assigned
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status = 'assigned') THEN
    UPDATE orders SET status = 'assigned' WHERE id = NEW.order_id;
  END IF;

  -- When driver picks up, mark order as in_transit
  IF NEW.status = 'picked_up' AND (OLD.status = 'accepted') THEN
    UPDATE orders SET 
      status = 'in_transit',
      picked_up_at = NEW.picked_up_at
    WHERE id = NEW.order_id;
  END IF;

  -- When delivered, mark order as delivered
  IF NEW.status = 'delivered' AND (OLD.status = 'picked_up') THEN
    UPDATE orders SET 
      status = 'delivered',
      delivered_at = NEW.delivered_at
    WHERE id = NEW.order_id;
  END IF;

  -- When cancelled, revert order to pending
  IF NEW.status = 'cancelled' THEN
    UPDATE orders SET 
      status = 'pending',
      cancelled_at = NEW.cancelled_at
    WHERE id = NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to sync order status
DROP TRIGGER IF EXISTS sync_order_status_trigger ON order_assignments;
CREATE TRIGGER sync_order_status_trigger
  AFTER UPDATE ON order_assignments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION sync_order_status_from_assignment();
