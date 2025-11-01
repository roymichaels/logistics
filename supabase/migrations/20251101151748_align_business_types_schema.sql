/*
  # Align business_types Table Schema

  1. Schema Changes
    - Rename columns to match TypeScript interface
    - Add missing columns
    - Make infrastructure_id nullable for global business types

  2. Security
    - Update RLS policies to allow authenticated users to read active business types

  3. Seed Data
    - Insert default business types
*/

-- Add new columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_types' AND column_name = 'icon') THEN
    ALTER TABLE business_types ADD COLUMN icon text DEFAULT '🏢';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_types' AND column_name = 'description') THEN
    ALTER TABLE business_types ADD COLUMN description text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_types' AND column_name = 'is_system_default') THEN
    ALTER TABLE business_types ADD COLUMN is_system_default boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_types' AND column_name = 'created_by') THEN
    ALTER TABLE business_types ADD COLUMN created_by uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_types' AND column_name = 'created_at') THEN
    ALTER TABLE business_types ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_types' AND column_name = 'updated_at') THEN
    ALTER TABLE business_types ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Rename columns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_types' AND column_name = 'type_key') THEN
    ALTER TABLE business_types RENAME COLUMN type_key TO type_value;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_types' AND column_name = 'label_en') THEN
    ALTER TABLE business_types RENAME COLUMN label_en TO label_english;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_types' AND column_name = 'label_he') THEN
    ALTER TABLE business_types RENAME COLUMN label_he TO label_hebrew;
  END IF;
END $$;

-- Make infrastructure_id nullable
ALTER TABLE business_types ALTER COLUMN infrastructure_id DROP NOT NULL;

-- Drop old unique constraint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_types_infrastructure_id_type_key_key') THEN
    ALTER TABLE business_types DROP CONSTRAINT business_types_infrastructure_id_type_key_key;
  END IF;
END $$;

-- Add new unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_types_type_value_unique
  ON business_types(type_value) WHERE infrastructure_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_business_types_infra_type_unique
  ON business_types(infrastructure_id, type_value) WHERE infrastructure_id IS NOT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_business_types_type_value ON business_types(type_value);
CREATE INDEX IF NOT EXISTS idx_business_types_active ON business_types(active);
CREATE INDEX IF NOT EXISTS idx_business_types_display_order ON business_types(display_order);

-- Drop existing policies
DROP POLICY IF EXISTS business_types_access ON business_types;
DROP POLICY IF EXISTS "All authenticated users can view active business types" ON business_types;
DROP POLICY IF EXISTS "Infrastructure owners can view all business types" ON business_types;
DROP POLICY IF EXISTS "Infrastructure owners can create business types" ON business_types;
DROP POLICY IF EXISTS "Infrastructure owners can update business types" ON business_types;
DROP POLICY IF EXISTS "Infrastructure owners can delete business types" ON business_types;

-- Create new policies
CREATE POLICY "Authenticated users can view active business types"
  ON business_types FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "Service role can view all business types"
  ON business_types FOR SELECT
  TO authenticated
  USING (
    auth.jwt()->>'role' = 'service_role'
    OR auth.jwt()->>'role' = 'superadmin'
  );

CREATE POLICY "Infrastructure owners can insert business types"
  ON business_types FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.global_role = 'infrastructure_owner'
    )
  );

CREATE POLICY "Infrastructure owners can update business types"
  ON business_types FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.global_role = 'infrastructure_owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.global_role = 'infrastructure_owner'
    )
  );

CREATE POLICY "Infrastructure owners can delete business types"
  ON business_types FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.global_role = 'infrastructure_owner'
    )
  );

-- Create trigger
CREATE OR REPLACE FUNCTION update_business_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS business_types_updated_at ON business_types;

CREATE TRIGGER business_types_updated_at
  BEFORE UPDATE ON business_types
  FOR EACH ROW
  EXECUTE FUNCTION update_business_types_updated_at();

-- Insert default business types
INSERT INTO business_types (
  type_value,
  label_hebrew,
  label_english,
  icon,
  description,
  is_system_default,
  active,
  display_order,
  infrastructure_id
)
SELECT * FROM (VALUES
  ('logistics', 'לוגיסטיקה', 'Logistics', '🚚', 'ניהול הפצה ומשלוחים', true, true, 1, NULL::uuid),
  ('retail', 'קמעונאות', 'Retail', '🏪', 'חנויות קמעונאיות ומכירות', true, true, 2, NULL::uuid),
  ('food_delivery', 'משלוחי מזון', 'Food Delivery', '🍔', 'משלוחי אוכל ומסעדות', true, true, 3, NULL::uuid),
  ('electronics', 'אלקטרוניקה', 'Electronics', '💻', 'מכירת מוצרי אלקטרוניקה', true, true, 4, NULL::uuid),
  ('fashion', 'אופנה', 'Fashion', '👕', 'אופנה וביגוד', true, true, 5, NULL::uuid),
  ('education', 'חינוך', 'Education', '📚', 'מוסדות חינוך והדרכה', true, true, 6, NULL::uuid),
  ('healthcare', 'בריאות', 'Healthcare', '🏥', 'שירותי בריאות ורפואה', true, true, 7, NULL::uuid),
  ('construction', 'בנייה', 'Construction', '🏗️', 'בנייה ושיפוצים', true, true, 8, NULL::uuid)
) AS v(type_value, label_hebrew, label_english, icon, description, is_system_default, active, display_order, infrastructure_id)
WHERE NOT EXISTS (
  SELECT 1 FROM business_types
  WHERE business_types.type_value = v.type_value
  AND business_types.infrastructure_id IS NULL
)
ON CONFLICT DO NOTHING;

-- Update timestamps
UPDATE business_types SET created_at = now() WHERE created_at IS NULL;
UPDATE business_types SET updated_at = now() WHERE updated_at IS NULL;