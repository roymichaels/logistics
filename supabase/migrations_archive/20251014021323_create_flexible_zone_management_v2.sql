/*
  # Flexible Zone Management System

  1. Changes to zones table
    - Add created_by field to track who created the zone
    - Add updated_by field to track who last modified the zone
    - Add business_id field for business-specific zones (nullable)
    - Add metadata JSONB field for extensible properties
    - Add deleted_at field for soft deletes
    - Add city and region fields if not exists
    - Ensure proper indexes

  2. New Tables
    - zone_audit_logs: Track all changes to zones
    
  3. Security
    - Enable RLS on zones table
    - Add policies for infrastructure owners, managers, and business owners
    - Enable RLS on zone_audit_logs
    - Add read-only policies for audit logs
*/

-- Add new columns to zones table if they don't exist
DO $$ 
BEGIN
  -- Add created_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'zones' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE zones ADD COLUMN created_by TEXT;
  END IF;

  -- Add updated_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'zones' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE zones ADD COLUMN updated_by TEXT;
  END IF;

  -- Add business_id column for business-specific zones
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'zones' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE zones ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
  END IF;

  -- Add metadata column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'zones' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE zones ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Add deleted_at column for soft deletes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'zones' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE zones ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;

  -- Add city column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'zones' AND column_name = 'city'
  ) THEN
    ALTER TABLE zones ADD COLUMN city TEXT;
  END IF;

  -- Add region column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'zones' AND column_name = 'region'
  ) THEN
    ALTER TABLE zones ADD COLUMN region TEXT;
  END IF;
END $$;

-- Create zone audit logs table
CREATE TABLE IF NOT EXISTS zone_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'restored')),
  changed_by TEXT NOT NULL,
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS zone_audit_logs_zone_id_idx ON zone_audit_logs(zone_id);
CREATE INDEX IF NOT EXISTS zone_audit_logs_created_at_idx ON zone_audit_logs(created_at DESC);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS zones_business_id_idx ON zones(business_id) WHERE business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS zones_deleted_at_idx ON zones(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS zones_city_idx ON zones(city);
CREATE INDEX IF NOT EXISTS zones_region_idx ON zones(region);

-- Enable RLS on zones table
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

-- Enable RLS on zone_audit_logs table
ALTER TABLE zone_audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "zones_select_policy" ON zones;
DROP POLICY IF EXISTS "zones_insert_policy" ON zones;
DROP POLICY IF EXISTS "zones_update_policy" ON zones;
DROP POLICY IF EXISTS "zones_delete_policy" ON zones;

-- Zones SELECT policy: Anyone authenticated can view non-deleted zones
CREATE POLICY "zones_select_policy"
  ON zones
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- Zones INSERT policy: Infrastructure owners, managers, and business owners can create zones
CREATE POLICY "zones_insert_policy"
  ON zones
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role IN ('infrastructure_owner', 'manager', 'business_owner')
    )
  );

-- Zones UPDATE policy: Infrastructure owners and managers can update any zone
CREATE POLICY "zones_update_policy"
  ON zones
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role IN ('infrastructure_owner', 'manager', 'business_owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role IN ('infrastructure_owner', 'manager', 'business_owner')
    )
  );

-- Zones DELETE policy: Only infrastructure owners can hard delete zones
CREATE POLICY "zones_delete_policy"
  ON zones
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'infrastructure_owner'
    )
  );

-- Zone audit logs SELECT policy: Authenticated users can view audit logs
CREATE POLICY "zone_audit_logs_select_policy"
  ON zone_audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Zone audit logs INSERT policy: System can insert audit logs
CREATE POLICY "zone_audit_logs_insert_policy"
  ON zone_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create function to log zone changes
CREATE OR REPLACE FUNCTION log_zone_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO zone_audit_logs (zone_id, action, changed_by, changes)
    VALUES (NEW.id, 'created', NEW.created_by, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO zone_audit_logs (zone_id, action, changed_by, changes)
    VALUES (
      NEW.id, 
      CASE WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN 'deleted'
           WHEN NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN 'restored'
           ELSE 'updated' END,
      NEW.updated_by,
      jsonb_build_object(
        'old', to_jsonb(OLD),
        'new', to_jsonb(NEW)
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for zone audit logging
DROP TRIGGER IF EXISTS zone_audit_trigger ON zones;
CREATE TRIGGER zone_audit_trigger
  AFTER INSERT OR UPDATE ON zones
  FOR EACH ROW
  EXECUTE FUNCTION log_zone_change();
