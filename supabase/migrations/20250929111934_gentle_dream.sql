/*
  # Initial Schema for Logistics Mini App

  1. New Tables
    - `users` - User profiles linked to Telegram accounts
    - `orders` - Delivery orders with customer and item details
    - `tasks` - Courier tasks linked to orders
    - `routes` - Daily routes for couriers
    - `user_preferences` - User app preferences (demo/real mode)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Secure access based on user roles
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('dispatcher', 'courier')),
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('new', 'assigned', 'enroute', 'delivered', 'failed')),
  customer TEXT NOT NULL,
  address TEXT NOT NULL,
  eta TIMESTAMPTZ,
  notes TEXT,
  items JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  courier_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'enroute', 'done', 'failed')),
  gps JSONB,
  proof_url TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Routes table
CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  courier_id TEXT NOT NULL,
  date DATE NOT NULL,
  stops JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(courier_id, date)
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  telegram_id TEXT NOT NULL,
  app TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('demo', 'real')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (telegram_id, app)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (telegram_id = (auth.jwt() ->> 'telegram_id'));

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (telegram_id = (auth.jwt() ->> 'telegram_id'));

-- RLS Policies for orders table
CREATE POLICY "Dispatchers can manage all orders"
  ON orders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id') 
      AND role = 'dispatcher'
    )
  );

CREATE POLICY "Couriers can read assigned orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.order_id = orders.id 
      AND tasks.courier_id = (auth.jwt() ->> 'telegram_id')
    )
  );

-- RLS Policies for tasks table
CREATE POLICY "Dispatchers can manage all tasks"
  ON tasks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id') 
      AND role = 'dispatcher'
    )
  );

CREATE POLICY "Couriers can read and update own tasks"
  ON tasks
  FOR ALL
  TO authenticated
  USING (courier_id = (auth.jwt() ->> 'telegram_id'));

-- RLS Policies for routes table
CREATE POLICY "Dispatchers can read all routes"
  ON routes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE telegram_id = (auth.jwt() ->> 'telegram_id') 
      AND role = 'dispatcher'
    )
  );

CREATE POLICY "Couriers can read own routes"
  ON routes
  FOR SELECT
  TO authenticated
  USING (courier_id = (auth.jwt() ->> 'telegram_id'));

-- RLS Policies for user_preferences table
CREATE POLICY "Users can manage own preferences"
  ON user_preferences
  FOR ALL
  TO authenticated
  USING (telegram_id = (auth.jwt() ->> 'telegram_id'));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_courier_id ON tasks(courier_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_routes_courier_date ON routes(courier_id, date);