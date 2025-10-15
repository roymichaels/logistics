/*
  # Create business_types table

  1. New Tables
    - `business_types`
      - `id` (uuid, primary key)
      - `type_value` (text, unique) - The internal value used in code (e.g., 'logistics')
      - `label_hebrew` (text) - Display name in Hebrew
      - `label_english` (text) - Display name in English
      - `icon` (text) - Emoji or icon identifier
      - `description` (text) - Optional description
      - `is_system_default` (boolean) - Whether this is a system-provided type
      - `active` (boolean) - Whether this type is currently active
      - `display_order` (integer) - For custom sorting
      - `created_at` (timestamptz)
      - `created_by` (uuid) - User who created this type
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `business_types` table
    - Allow all authenticated users to read active business types
    - Allow only infrastructure_owner users to create/update/delete business types
  
  3. Indexes
    - Add index on type_value for fast lookups
    - Add index on active for filtering active types
  
  4. Initial Data
    - Seed the table with existing hardcoded business types
*/

-- Create business_types table
CREATE TABLE IF NOT EXISTS business_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_value text UNIQUE NOT NULL,
  label_hebrew text NOT NULL,
  label_english text NOT NULL,
  icon text DEFAULT '🏢',
  description text,
  is_system_default boolean DEFAULT false,
  active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_business_types_type_value ON business_types(type_value);
CREATE INDEX IF NOT EXISTS idx_business_types_active ON business_types(active);
CREATE INDEX IF NOT EXISTS idx_business_types_display_order ON business_types(display_order);

-- Enable RLS
ALTER TABLE business_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "All authenticated users can view active business types"
  ON business_types FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "Infrastructure owners can view all business types"
  ON business_types FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

CREATE POLICY "Infrastructure owners can create business types"
  ON business_types FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

CREATE POLICY "Infrastructure owners can update business types"
  ON business_types FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

CREATE POLICY "Infrastructure owners can delete business types"
  ON business_types FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- Seed initial business types
INSERT INTO business_types (type_value, label_hebrew, label_english, icon, is_system_default, display_order, active)
VALUES
  ('logistics', 'לוגיסטיקה', 'Logistics', '🚚', true, 1, true),
  ('retail', 'קמעונאות', 'Retail', '🏪', true, 2, true),
  ('food_delivery', 'משלוחי מזון', 'Food Delivery', '🍔', true, 3, true),
  ('electronics', 'אלקטרוניקה', 'Electronics', '💻', true, 4, true),
  ('fashion', 'אופנה', 'Fashion', '👕', true, 5, true),
  ('education', 'חינוך', 'Education', '📚', true, 6, true)
ON CONFLICT (type_value) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_business_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER business_types_updated_at
  BEFORE UPDATE ON business_types
  FOR EACH ROW
  EXECUTE FUNCTION update_business_types_updated_at();