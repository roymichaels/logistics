/*
  # UndergroundLab Security Store - Complete Schema Setup

  1. Core Tables
    - users (with wallet authentication)
    - businesses (infrastructure)
    - products (security hardware catalog)
    
  2. Security Features
    - Wallet-based authentication (ETH/SOL/TON)
    - Product security certifications
    - RLS policies for data protection
*/

-- Users table with wallet authentication
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE,
  email text UNIQUE,
  role text DEFAULT 'customer' CHECK (role IN ('customer', 'business_owner', 'manager', 'admin')),
  wallet_address text UNIQUE,
  wallet_type text CHECK (wallet_type IN ('ethereum', 'solana', 'ton')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

-- Anyone can insert (for registration)
CREATE POLICY "Anyone can register"
  ON users FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Users can update their own data
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text);

-- Businesses table (for infrastructure)
CREATE TABLE IF NOT EXISTS businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_businesses_owner ON businesses(owner_id);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view businesses"
  ON businesses FOR SELECT
  TO anon, authenticated
  USING (true);

-- Products table with security features
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  short_description text,
  sku text,
  slug text,
  price decimal(10,2) NOT NULL DEFAULT 0,
  cost_price decimal(10,2),
  compare_at_price decimal(10,2),
  stock_quantity integer DEFAULT 0,
  image_url text,
  primary_image_url text,
  category text,
  active boolean DEFAULT true,
  
  -- Security-specific fields
  security_level text CHECK (security_level IN ('military', 'enterprise', 'standard')),
  certifications jsonb DEFAULT '[]'::jsonb,
  threat_model_url text,
  setup_guide_url text,
  product_type text,
  technical_specs jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_security_level ON products(security_level);
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  TO anon, authenticated
  USING (active = true);

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts with wallet-based authentication';
COMMENT ON COLUMN users.wallet_address IS 'Cryptocurrency wallet address for authentication';
COMMENT ON COLUMN users.wallet_type IS 'Type of wallet: ethereum, solana, or ton';

COMMENT ON TABLE products IS 'Security hardware and software products catalog';
COMMENT ON COLUMN products.security_level IS 'Security certification level: military, enterprise, or standard';
COMMENT ON COLUMN products.certifications IS 'JSON array of security certifications (FIPS 140-2, ISO 27001, etc)';
COMMENT ON COLUMN products.threat_model_url IS 'URL to detailed threat model documentation';
COMMENT ON COLUMN products.setup_guide_url IS 'URL to setup and configuration guide';
COMMENT ON COLUMN products.product_type IS 'Type of security product (smartphone, hardware_key, privacy_device, etc)';
COMMENT ON COLUMN products.technical_specs IS 'JSON object containing detailed technical specifications';
