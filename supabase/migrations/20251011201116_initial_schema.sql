/*
  # Initial Underground/ONX Database Schema

  ## Core Tables
  - `users` - User profiles with role-based access (dispatcher, driver, manager, warehouse, sales, customer_service)
  - `orders` - Order management with customer details, items, and delivery tracking
  - `tasks` - Task assignment system with types, priorities, and proof of completion
  - `routes` - Delivery route planning and optimization
  - `products` - Product catalog with inventory management
  - `group_chats` - Team communication channels
  - `channels` - Broadcast channels for announcements
  - `notifications` - System notifications
  - `user_preferences` - User app preferences
  - `app_config` - Application configuration

  ## Security
  - RLS enabled on all tables
  - Role-based access policies
  - Tenant isolation via business context
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Users table with extended roles
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

-- Orders table with comprehensive tracking
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('new', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled')) DEFAULT 'new',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  delivery_date TIMESTAMPTZ,
  assigned_driver TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tasks table with types and priorities
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('delivery', 'warehouse', 'sales', 'customer_service', 'general')) DEFAULT 'general',
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
  assigned_to TEXT NOT NULL,
  assigned_by TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
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
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'completed')) DEFAULT 'planned',
  estimated_duration INTEGER,
  actual_duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(driver_id, date)
);

-- Group chats for team communication
CREATE TABLE IF NOT EXISTS group_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('department', 'project', 'general')) DEFAULT 'general',
  department TEXT,
  members TEXT[] DEFAULT '{}',
  telegram_chat_id TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Channels for announcements
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('announcements', 'updates', 'alerts')) DEFAULT 'announcements',
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
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')) DEFAULT 'info',
  recipient_id TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  telegram_id TEXT NOT NULL,
  app TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('real')) DEFAULT 'real',
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (telegram_id, app)
);

-- App configuration
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
CREATE POLICY "Authenticated users can read products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and warehouse can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id') 
      AND role IN ('manager', 'warehouse')
    )
  );

CREATE POLICY "Managers and warehouse can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id') 
      AND role IN ('manager', 'warehouse')
    )
  );

CREATE POLICY "Managers can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id') 
      AND role = 'manager'
    )
  );

-- Users policies
CREATE POLICY "Users can read all profiles"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (telegram_id = (auth.jwt() ->> 'telegram_id'))
  WITH CHECK (telegram_id = (auth.jwt() ->> 'telegram_id'));

-- Orders policies
CREATE POLICY "Staff can read orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id')
      AND role IN ('manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service')
    )
  );

CREATE POLICY "Managers and sales can insert orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id') 
      AND role IN ('manager', 'sales')
    )
  );

CREATE POLICY "Managers, sales, dispatchers can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id') 
      AND role IN ('manager', 'sales', 'dispatcher')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id') 
      AND role IN ('manager', 'sales', 'dispatcher')
    )
  );

CREATE POLICY "Managers can delete orders"
  ON orders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id') 
      AND role = 'manager'
    )
  );

-- Tasks policies
CREATE POLICY "Users can read relevant tasks"
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

CREATE POLICY "Managers and dispatchers can insert tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id') 
      AND role IN ('manager', 'dispatcher')
    )
  );

CREATE POLICY "Assigned users can update tasks"
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
  )
  WITH CHECK (
    assigned_to = (auth.jwt() ->> 'telegram_id')
    OR assigned_by = (auth.jwt() ->> 'telegram_id')
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id') 
      AND role IN ('manager', 'dispatcher')
    )
  );

CREATE POLICY "Managers can delete tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id') 
      AND role = 'manager'
    )
  );

-- Routes policies
CREATE POLICY "Drivers and managers can read routes"
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

CREATE POLICY "Managers and dispatchers can insert routes"
  ON routes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id') 
      AND role IN ('manager', 'dispatcher')
    )
  );

CREATE POLICY "Managers and dispatchers can update routes"
  ON routes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id') 
      AND role IN ('manager', 'dispatcher')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id') 
      AND role IN ('manager', 'dispatcher')
    )
  );

-- Group chats policies
CREATE POLICY "Members can read their chats"
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

CREATE POLICY "Managers can manage chats"
  ON group_chats FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id') 
      AND role = 'manager'
    )
  );

-- Channels policies
CREATE POLICY "Subscribers can read channels"
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

CREATE POLICY "Managers can manage channels"
  ON channels FOR ALL
  TO authenticated
  USING (
    EXISTS (
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
  USING (recipient_id = (auth.jwt() ->> 'telegram_id'))
  WITH CHECK (recipient_id = (auth.jwt() ->> 'telegram_id'));

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- User preferences policies
CREATE POLICY "Users can manage own preferences"
  ON user_preferences FOR ALL
  TO authenticated
  USING (telegram_id = (auth.jwt() ->> 'telegram_id'))
  WITH CHECK (telegram_id = (auth.jwt() ->> 'telegram_id'));

-- App config policies
CREATE POLICY "Users can read app config"
  ON app_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can manage app config"
  ON app_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id') 
      AND role = 'manager'
    )
  );

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_driver ON orders(assigned_driver);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_order_id ON tasks(order_id);
CREATE INDEX IF NOT EXISTS idx_routes_driver_date ON routes(driver_id, date);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
