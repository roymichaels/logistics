/*
  # Complete Logistics Schema Update

  This migration updates the database schema to match the comprehensive frontend data types
  and adds all necessary tables for the full logistics system functionality.

  ## New Tables
  - `products` - Product catalog with inventory management
  - `group_chats` - Team communication channels  
  - `channels` - Announcement and update channels
  - `notifications` - System notifications for users
  - `app_config` - Application configuration storage

  ## Updated Tables
  - `users` - Enhanced user profiles with extended roles
  - `orders` - Comprehensive order management with items and customer details
  - `tasks` - Extended task system with types and priorities

  ## Security
  - Enable RLS on all tables
  - Add comprehensive policies for role-based access
  - Secure sensitive operations
*/

-- Drop existing schema to rebuild completely
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS routes CASCADE; 
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;

-- Products table for inventory management
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  warehouse_location TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enhanced users table with extended roles
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service')),
  name TEXT,
  username TEXT,
  photo_url TEXT,
  department TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Comprehensive orders table with items and customer details
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('new', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled')),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  delivery_date TIMESTAMPTZ,
  assigned_driver TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enhanced tasks table with types and priorities
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('delivery', 'warehouse', 'sales', 'customer_service', 'general')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  assigned_to TEXT NOT NULL,
  assigned_by TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  proof_url TEXT,
  location TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Routes table for delivery planning
CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id TEXT NOT NULL,
  date DATE NOT NULL,
  orders TEXT[] DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'completed')),
  estimated_duration INTEGER,
  actual_duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(driver_id, date)
);

-- Group chats for team communication
CREATE TABLE IF NOT EXISTS group_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('department', 'project', 'general')),
  department TEXT,
  members TEXT[] DEFAULT '{}',
  telegram_chat_id TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Channels for announcements and updates
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('announcements', 'updates', 'alerts')),
  telegram_channel_id TEXT,
  description TEXT,
  subscribers TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
  recipient_id TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  telegram_id TEXT NOT NULL,
  app TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('real')),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (telegram_id, app)
);

-- App configuration table
CREATE TABLE IF NOT EXISTS app_config (
  app TEXT PRIMARY KEY,
  config JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Products policies
CREATE POLICY "All authenticated users can read products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and warehouse staff can create products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id') 
      AND role IN ('manager', 'warehouse')
    )
  );

CREATE POLICY "Managers and warehouse staff can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id') 
      AND role IN ('manager', 'warehouse')
    )
  );

-- Users policies
CREATE POLICY "Users can read own profile and colleagues"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (telegram_id = (auth.jwt() ->> 'telegram_id'));

-- Orders policies
CREATE POLICY "All staff can read orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role != 'user'
    )
  );

CREATE POLICY "Managers and sales can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id') 
      AND role IN ('manager', 'sales')
    )
  );

CREATE POLICY "Managers, sales, and dispatchers can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id') 
      AND role IN ('manager', 'sales', 'dispatcher')
    )
  );

-- Tasks policies
CREATE POLICY "Users can read assigned tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    assigned_to = (auth.jwt() ->> 'telegram_id')
    OR assigned_by = (auth.jwt() ->> 'telegram_id')
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id') 
      AND role IN ('manager', 'dispatcher')
    )
  );

CREATE POLICY "Managers and dispatchers can create tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id') 
      AND role IN ('manager', 'dispatcher')
    )
  );

CREATE POLICY "Assigned users can update their tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    assigned_to = (auth.jwt() ->> 'telegram_id')
    OR assigned_by = (auth.jwt() ->> 'telegram_id')
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id') 
      AND role IN ('manager', 'dispatcher')
    )
  );

-- Routes policies
CREATE POLICY "Drivers can read own routes"
  ON routes FOR SELECT
  TO authenticated
  USING (
    driver_id = (auth.jwt() ->> 'telegram_id')
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id') 
      AND role IN ('manager', 'dispatcher')
    )
  );

-- Group chats policies
CREATE POLICY "Members can read their group chats"
  ON group_chats FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'telegram_id') = ANY(members)
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id') 
      AND role = 'manager'
    )
  );

-- Channels policies
CREATE POLICY "Subscribers can read their channels"
  ON channels FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'telegram_id') = ANY(subscribers)
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id') 
      AND role = 'manager'
    )
  );

-- Notifications policies
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (recipient_id = (auth.jwt() ->> 'telegram_id'));

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = (auth.jwt() ->> 'telegram_id'));

-- User preferences policies
CREATE POLICY "Users can manage own preferences"
  ON user_preferences FOR ALL
  TO authenticated
  USING (telegram_id = (auth.jwt() ->> 'telegram_id'));

-- App config policies (read-only for all authenticated users)
CREATE POLICY "All authenticated users can read app config"
  ON app_config FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, read);
CREATE INDEX IF NOT EXISTS idx_routes_driver_date ON routes(driver_id, date);

-- Insert default app configuration
INSERT INTO app_config (app, config) VALUES (
  'logistics', 
  '{
    "app": "logistics",
    "adapters": {
      "data": "postgres"
    },
    "features": {
      "offline_mode": true,
      "photo_upload": true,
      "gps_tracking": true,
      "group_chats": true,
      "notifications": true
    },
    "ui": {
      "brand": "מערכת לוגיסטיקה",
      "accent": "#007aff",
      "theme": "auto",
      "language": "he"
    },
    "defaults": {
      "mode": "real"
    }
  }'::jsonb
) ON CONFLICT (app) DO UPDATE SET 
  config = EXCLUDED.config,
  updated_at = now();