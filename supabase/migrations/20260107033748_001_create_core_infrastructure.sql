-- Core Infrastructure Setup
--
-- 1. New Tables
--    - profiles: User profiles with wallet support
--    - businesses: Business entities owned by users
--    - user_business_roles: Many-to-many relationships for staff
--
-- 2. Security
--    - Enable RLS on all tables
--    - Profiles: Users can read/update own profile
--    - Businesses: Owners can manage their businesses
--    - User_business_roles: Business owners can manage roles

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address text UNIQUE,
  wallet_type text CHECK (wallet_type IN ('eth', 'sol', 'ton')),
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('business_owner', 'manager', 'warehouse', 'dispatcher', 'sales', 'customer_service', 'driver', 'customer', 'guest')),
  name text,
  email text,
  phone text,
  avatar_url text,
  language text DEFAULT 'en',
  timezone text DEFAULT 'UTC',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_hebrew text,
  slug text UNIQUE NOT NULL,
  description text,
  business_type text DEFAULT 'retail',
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  logo_url text,
  primary_color text DEFAULT '#3b82f6',
  secondary_color text DEFAULT '#60a5fa',
  order_number_prefix text,
  default_currency text DEFAULT 'USD',
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_business_roles table (many-to-many)
CREATE TABLE IF NOT EXISTS user_business_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('manager', 'warehouse', 'dispatcher', 'sales', 'customer_service')),
  permissions jsonb DEFAULT '{}',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, business_id, role)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_business_roles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Businesses policies
CREATE POLICY "Business owners can view own businesses"
  ON businesses FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Business owners can update own businesses"
  ON businesses FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Business owners can insert businesses"
  ON businesses FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Business owners can delete own businesses"
  ON businesses FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Public can view active businesses"
  ON businesses FOR SELECT
  TO anon
  USING (status = 'active');

-- User business roles policies
CREATE POLICY "Business owners can view roles in their businesses"
  ON user_business_roles FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can manage roles in their businesses"
  ON user_business_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update roles in their businesses"
  ON user_business_roles FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can delete roles in their businesses"
  ON user_business_roles FOR DELETE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS profiles_wallet_address_idx ON profiles(wallet_address);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);
CREATE INDEX IF NOT EXISTS businesses_owner_id_idx ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS businesses_slug_idx ON businesses(slug);
CREATE INDEX IF NOT EXISTS businesses_status_idx ON businesses(status);
CREATE INDEX IF NOT EXISTS user_business_roles_user_id_idx ON user_business_roles(user_id);
CREATE INDEX IF NOT EXISTS user_business_roles_business_id_idx ON user_business_roles(business_id);