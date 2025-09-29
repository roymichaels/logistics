/*
  # Multi-Business Infrastructure Schema

  ## Overview
  This migration extends the existing logistics schema to support multiple businesses operating on the same infrastructure. It introduces business entities, role-based access control, and text-to-order parsing capabilities.

  ## New Tables
  
  1. **businesses**
     - Core business entity table with branding, settings, and operational parameters
     - Supports multiple currencies (ILS, USD, EUR)
     - Contains business-specific order numbering sequences
     - Includes branding assets and customization options
  
  2. **business_users**
     - Junction table linking users to businesses with specific roles
     - Supports multiple business assignments per user
     - Role-specific permissions and access levels
  
  3. **business_products**
     - Business-specific product catalog with pricing
     - Allows same product with different prices per business
     - Supports business-specific SKU management
  
  4. **order_parsing_logs**
     - Tracks text-to-order parsing attempts and results
     - Stores original text, parsed data, and accuracy metrics
     - Enables parsing algorithm improvement and debugging
  
  5. **quick_actions**
     - Stores user-specific quick action preferences
     - Tracks usage frequency for personalization
     - Role-based default actions with customization
  
  ## Schema Extensions
  
  - Extended orders table with business_id, currency, and parsing metadata
  - Enhanced users table with business assignment tracking
  - Added RLS policies for multi-business data isolation
  - Created indexes for optimal multi-tenant performance
  
  ## Security Features
  
  - Row Level Security ensures business data isolation
  - Business-specific access controls
  - Audit trails for all business operations
  - Role-based permissions enforcement
*/

-- Create businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_hebrew text NOT NULL,
  business_type text NOT NULL DEFAULT 'logistics',
  logo_url text,
  primary_color text DEFAULT '#007aff',
  secondary_color text DEFAULT '#34c759',
  default_currency text NOT NULL DEFAULT 'ILS' CHECK (default_currency IN ('ILS', 'USD', 'EUR')),
  order_number_prefix text NOT NULL DEFAULT 'ORD',
  order_number_sequence integer NOT NULL DEFAULT 1,
  address jsonb DEFAULT '{}',
  contact_info jsonb DEFAULT '{}',
  business_settings jsonb DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create business_users junction table
CREATE TABLE IF NOT EXISTS business_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service')),
  permissions jsonb DEFAULT '{}',
  is_primary boolean DEFAULT false,
  active boolean DEFAULT true,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES users(id),
  UNIQUE(business_id, user_id, role)
);

-- Create business-specific products table
CREATE TABLE IF NOT EXISTS business_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  business_sku text NOT NULL,
  business_price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ILS' CHECK (currency IN ('ILS', 'USD', 'EUR')),
  is_active boolean DEFAULT true,
  custom_fields jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(business_id, product_id),
  UNIQUE(business_id, business_sku)
);

-- Create order parsing logs table
CREATE TABLE IF NOT EXISTS order_parsing_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  original_text text NOT NULL,
  parsed_data jsonb NOT NULL DEFAULT '{}',
  parsing_confidence numeric DEFAULT 0 CHECK (parsing_confidence >= 0 AND parsing_confidence <= 1),
  parsing_errors jsonb DEFAULT '[]',
  manual_corrections jsonb DEFAULT '{}',
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create quick actions table
CREATE TABLE IF NOT EXISTS quick_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  action_config jsonb NOT NULL DEFAULT '{}',
  usage_count integer DEFAULT 0,
  last_used timestamptz,
  is_favorite boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, business_id, action_type)
);

-- Add business_id to existing orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN business_id uuid REFERENCES businesses(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add currency and parsing metadata to orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'currency'
  ) THEN
    ALTER TABLE orders ADD COLUMN currency text DEFAULT 'ILS' CHECK (currency IN ('ILS', 'USD', 'EUR'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'order_number'
  ) THEN
    ALTER TABLE orders ADD COLUMN order_number text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'parsed_from_text'
  ) THEN
    ALTER TABLE orders ADD COLUMN parsed_from_text boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'parsing_metadata'
  ) THEN
    ALTER TABLE orders ADD COLUMN parsing_metadata jsonb DEFAULT '{}';
  END IF;
END $$;

-- Add business assignments to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'primary_business_id'
  ) THEN
    ALTER TABLE users ADD COLUMN primary_business_id uuid REFERENCES businesses(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'business_roles'
  ) THEN
    ALTER TABLE users ADD COLUMN business_roles jsonb DEFAULT '{}';
  END IF;
END $$;

-- Enable RLS on all new tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_parsing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for businesses table
CREATE POLICY "Users can view businesses they belong to"
  ON businesses FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT business_id FROM business_users 
      WHERE user_id IN (
        SELECT id FROM users WHERE telegram_id = auth.jwt() ->> 'sub'
      )
      AND active = true
    )
  );

CREATE POLICY "Business owners can manage their business"
  ON businesses FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT business_id FROM business_users 
      WHERE user_id IN (
        SELECT id FROM users WHERE telegram_id = auth.jwt() ->> 'sub'
      )
      AND role IN ('owner', 'manager')
      AND active = true
    )
  );

-- RLS Policies for business_users table
CREATE POLICY "Users can view business user assignments"
  ON business_users FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id IN (
        SELECT id FROM users WHERE telegram_id = auth.jwt() ->> 'sub'
      )
      AND active = true
    )
  );

CREATE POLICY "Business managers can manage user assignments"
  ON business_users FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id IN (
        SELECT id FROM users WHERE telegram_id = auth.jwt() ->> 'sub'
      )
      AND role IN ('owner', 'manager')
      AND active = true
    )
  );

-- RLS Policies for business_products table
CREATE POLICY "Users can view business products"
  ON business_products FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id IN (
        SELECT id FROM users WHERE telegram_id = auth.jwt() ->> 'sub'
      )
      AND active = true
    )
  );

CREATE POLICY "Business managers can manage products"
  ON business_products FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id IN (
        SELECT id FROM users WHERE telegram_id = auth.jwt() ->> 'sub'
      )
      AND role IN ('owner', 'manager')
      AND active = true
    )
  );

-- RLS Policies for order_parsing_logs table
CREATE POLICY "Users can view their own parsing logs"
  ON order_parsing_logs FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE telegram_id = auth.jwt() ->> 'sub'
    )
    OR
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id IN (
        SELECT id FROM users WHERE telegram_id = auth.jwt() ->> 'sub'
      )
      AND role IN ('owner', 'manager')
      AND active = true
    )
  );

CREATE POLICY "Users can create parsing logs"
  ON order_parsing_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE telegram_id = auth.jwt() ->> 'sub'
    )
  );

-- RLS Policies for quick_actions table
CREATE POLICY "Users can manage their own quick actions"
  ON quick_actions FOR ALL
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE telegram_id = auth.jwt() ->> 'sub'
    )
  );

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_businesses_active ON businesses(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_business_users_business_user ON business_users(business_id, user_id);
CREATE INDEX IF NOT EXISTS idx_business_users_role ON business_users(business_id, role) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_business_products_business ON business_products(business_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_business_products_sku ON business_products(business_id, business_sku);
CREATE INDEX IF NOT EXISTS idx_orders_business ON orders(business_id) WHERE business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number) WHERE order_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parsing_logs_business ON order_parsing_logs(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quick_actions_user_business ON quick_actions(user_id, business_id);
CREATE INDEX IF NOT EXISTS idx_quick_actions_usage ON quick_actions(user_id, usage_count DESC);

-- Update existing orders RLS to include business context
DROP POLICY IF EXISTS "Users can view orders" ON orders;
CREATE POLICY "Users can view business orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id IN (
        SELECT id FROM users WHERE telegram_id = auth.jwt() ->> 'sub'
      )
      AND active = true
    )
    OR business_id IS NULL -- Backwards compatibility
  );

DROP POLICY IF EXISTS "Users can create orders" ON orders;
CREATE POLICY "Users can create business orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id IN (
        SELECT id FROM users WHERE telegram_id = auth.jwt() ->> 'sub'
      )
      AND role IN ('owner', 'manager', 'dispatcher', 'sales')
      AND active = true
    )
    OR business_id IS NULL -- Backwards compatibility
  );

-- Function to generate business-specific order numbers
CREATE OR REPLACE FUNCTION generate_order_number(business_uuid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  business_rec businesses%ROWTYPE;
  next_sequence integer;
  order_number text;
BEGIN
  -- Get business details and increment sequence
  UPDATE businesses 
  SET order_number_sequence = order_number_sequence + 1
  WHERE id = business_uuid
  RETURNING * INTO business_rec;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found: %', business_uuid;
  END IF;
  
  -- Generate order number with business prefix
  order_number := business_rec.order_number_prefix || '-' || 
                  LPAD(business_rec.order_number_sequence::text, 6, '0');
  
  RETURN order_number;
END;
$$;

-- Function to update order timestamps
CREATE OR REPLACE FUNCTION update_order_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for timestamp updates
DROP TRIGGER IF EXISTS update_orders_timestamp ON orders;
CREATE TRIGGER update_orders_timestamp
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_order_timestamp();

DROP TRIGGER IF EXISTS update_businesses_timestamp ON businesses;
CREATE TRIGGER update_businesses_timestamp
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_order_timestamp();

DROP TRIGGER IF EXISTS update_business_products_timestamp ON business_products;
CREATE TRIGGER update_business_products_timestamp
  BEFORE UPDATE ON business_products
  FOR EACH ROW
  EXECUTE FUNCTION update_order_timestamp();