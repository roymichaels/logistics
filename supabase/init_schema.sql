-- =====================================================
-- Logistics Platform Lean Schema Initialization
-- Generated for multi-tenant logistics MVP baseline
-- =====================================================

BEGIN;

-- Extensions required for the schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- =====================================================
-- Enumerated types
-- =====================================================

CREATE TYPE user_role AS ENUM (
  'superadmin',
  'infrastructure_owner',
  'business_owner',
  'manager',
  'dispatcher',
  'driver',
  'warehouse',
  'support',
  'user'
);

CREATE TYPE registration_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE equity_transaction_type AS ENUM ('grant', 'transfer', 'buyback', 'adjustment');
CREATE TYPE equity_transfer_type AS ENUM ('grant', 'transfer', 'sale');
CREATE TYPE inventory_movement_type AS ENUM (
  'adjustment',
  'allocation',
  'transfer',
  'restock',
  'delivery_load',
  'delivery_return',
  'sale'
);
CREATE TYPE stock_allocation_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE restock_request_status AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'fulfilled');
CREATE TYPE driver_shift_status AS ENUM ('off_shift', 'on_shift', 'break');
CREATE TYPE driver_availability_status AS ENUM ('offline', 'available', 'busy');
CREATE TYPE order_status AS ENUM (
  'draft',
  'pending',
  'confirmed',
  'preparing',
  'en_route',
  'delivered',
  'cancelled'
);
CREATE TYPE order_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE task_status AS ENUM ('open', 'in_progress', 'blocked', 'completed', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'normal', 'high', 'critical');
CREATE TYPE chat_room_type AS ENUM ('direct', 'group', 'team', 'channel');
CREATE TYPE message_type AS ENUM ('text', 'image', 'file', 'system');
CREATE TYPE notification_type AS ENUM ('system', 'order', 'inventory', 'chat');

-- =====================================================
-- Helper functions for RLS checks
-- =====================================================

CREATE OR REPLACE FUNCTION auth_is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(auth.jwt()->>'role', '') = 'superadmin';
$$;

CREATE OR REPLACE FUNCTION auth_current_business_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claim text;
BEGIN
  claim := auth.jwt()->>'business_id';
  IF claim IS NULL OR claim = '' THEN
    RETURN NULL;
  END IF;
  BEGIN
    RETURN claim::uuid;
  EXCEPTION
    WHEN others THEN
      RETURN NULL;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION auth_current_infrastructure_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claim text;
BEGIN
  claim := auth.jwt()->>'infrastructure_id';
  IF claim IS NULL OR claim = '' THEN
    RETURN NULL;
  END IF;
  BEGIN
    RETURN claim::uuid;
  EXCEPTION
    WHEN others THEN
      RETURN NULL;
  END;
END;
$$;

-- =====================================================
-- Core infrastructure tables
-- =====================================================

CREATE TABLE infrastructures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE system_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE TABLE businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  infrastructure_id uuid NOT NULL REFERENCES infrastructures(id) ON DELETE CASCADE,
  business_type_id uuid,
  name text NOT NULL,
  name_hebrew text,
  description text,
  active boolean NOT NULL DEFAULT true,
  default_currency text NOT NULL DEFAULT 'ILS',
  logo_url text,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

CREATE TABLE business_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  infrastructure_id uuid NOT NULL REFERENCES infrastructures(id) ON DELETE CASCADE,
  type_key text NOT NULL,
  label_en text,
  label_he text,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  UNIQUE (infrastructure_id, type_key)
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id text UNIQUE,
  phone citext,
  email citext,
  display_name text,
  first_name text,
  last_name text,
  photo_url text,
  global_role user_role NOT NULL DEFAULT 'user',
  active boolean NOT NULL DEFAULT true,
  last_login timestamptz,
  last_active timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id text NOT NULL,
  phone citext,
  email citext,
  full_name text,
  requested_role user_role,
  status registration_status NOT NULL DEFAULT 'pending',
  notes text,
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key text UNIQUE NOT NULL,
  scope text NOT NULL CHECK (scope IN ('infrastructure', 'business')),
  name_en text NOT NULL,
  name_he text,
  description text,
  hierarchy integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key text UNIQUE NOT NULL,
  category text NOT NULL,
  name_en text NOT NULL,
  name_he text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE role_permissions (
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  base_role_id uuid REFERENCES roles(id) ON DELETE SET NULL,
  role_key text NOT NULL,
  name_en text NOT NULL,
  name_he text,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, role_key)
);

CREATE TABLE custom_role_permissions (
  custom_role_id uuid REFERENCES custom_roles(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  PRIMARY KEY (custom_role_id, permission_id)
);

CREATE TABLE user_business_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE SET NULL,
  custom_role_id uuid REFERENCES custom_roles(id) ON DELETE SET NULL,
  ownership_percentage numeric(5,2) NOT NULL DEFAULT 0,
  commission_percentage numeric(5,2) NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, business_id)
);

CREATE TABLE user_business_contexts (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
  infrastructure_id uuid REFERENCES infrastructures(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_permissions_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  permissions text[] NOT NULL,
  cache_version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, business_id)
);

CREATE TABLE login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  telegram_id text,
  ip_address inet,
  user_agent text,
  success boolean NOT NULL,
  suspicious boolean NOT NULL DEFAULT false,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE permission_check_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
  permission_key text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_pins (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  telegram_id text,
  hashed_pin text NOT NULL,
  salt text NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_verified_at timestamptz,
  pin_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  require_pin boolean NOT NULL DEFAULT false,
  pin_length integer NOT NULL DEFAULT 6 CHECK (pin_length BETWEEN 4 AND 8),
  max_failed_attempts integer NOT NULL DEFAULT 5 CHECK (max_failed_attempts >= 3),
  lockout_duration_minutes integer NOT NULL DEFAULT 15 CHECK (lockout_duration_minutes > 0),
  require_pin_on_context_switch boolean NOT NULL DEFAULT true,
  require_pin_on_chat boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  telegram_id text,
  business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
  action text NOT NULL,
  success boolean NOT NULL,
  ip_address inet,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- Equity management
-- =====================================================

CREATE TABLE business_equity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  stakeholder_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  equity_type text NOT NULL,
  percentage numeric(6,3) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  vested_percentage numeric(6,3) NOT NULL DEFAULT 0 CHECK (vested_percentage >= 0 AND vested_percentage <= 100),
  notes text,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, stakeholder_id, equity_type)
);

CREATE TABLE equity_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  stakeholder_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_type equity_transaction_type NOT NULL,
  percentage_change numeric(6,3) NOT NULL,
  notes text,
  reference_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE equity_transfer_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  from_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  to_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  transfer_type equity_transfer_type NOT NULL,
  percentage numeric(6,3) NOT NULL,
  consideration numeric(12,2),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- Inventory management
-- =====================================================

CREATE TABLE warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  infrastructure_id uuid NOT NULL REFERENCES infrastructures(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text,
  address text,
  contact_name text,
  contact_phone text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (infrastructure_id, code)
);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sku text UNIQUE,
  name text NOT NULL,
  description text,
  category text,
  unit text,
  price numeric(12,2) NOT NULL DEFAULT 0,
  cost numeric(12,2),
  barcode text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE inventory_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  infrastructure_id uuid NOT NULL REFERENCES infrastructures(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  location_type text NOT NULL,
  code text,
  name text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (infrastructure_id, code)
);

CREATE TABLE inventory_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  on_hand numeric(12,3) NOT NULL DEFAULT 0,
  reserved numeric(12,3) NOT NULL DEFAULT 0,
  damaged numeric(12,3) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, location_id)
);

CREATE TABLE inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  from_location_id uuid REFERENCES inventory_locations(id) ON DELETE SET NULL,
  to_location_id uuid REFERENCES inventory_locations(id) ON DELETE SET NULL,
  movement_type inventory_movement_type NOT NULL,
  quantity numeric(12,3) NOT NULL,
  reference_table text,
  reference_id uuid,
  initiated_by uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE stock_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  from_location_id uuid REFERENCES inventory_locations(id) ON DELETE SET NULL,
  to_location_id uuid REFERENCES inventory_locations(id) ON DELETE SET NULL,
  requested_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  quantity numeric(12,3) NOT NULL,
  status stock_allocation_status NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  notes text
);

CREATE TABLE restock_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
  requested_quantity numeric(12,3) NOT NULL,
  status restock_request_status NOT NULL DEFAULT 'draft',
  requested_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  notes text
);

CREATE TABLE driver_inventory_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity numeric(12,3) NOT NULL DEFAULT 0,
  reserved numeric(12,3) NOT NULL DEFAULT 0,
  damaged numeric(12,3) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (driver_id, product_id, business_id)
);

CREATE TABLE driver_vehicle_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_identifier text NOT NULL,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity numeric(12,3) NOT NULL DEFAULT 0,
  reserved numeric(12,3) NOT NULL DEFAULT 0,
  damaged numeric(12,3) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (driver_id, vehicle_identifier, product_id)
);

CREATE TABLE driver_zone_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  zone_key text NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  UNIQUE (driver_id, zone_key, business_id)
);

CREATE TABLE driver_status_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  shift_status driver_shift_status NOT NULL DEFAULT 'off_shift',
  availability driver_availability_status NOT NULL DEFAULT 'offline',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE driver_movement_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  action text NOT NULL,
  quantity numeric(12,3),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sales_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id uuid REFERENCES inventory_locations(id) ON DELETE SET NULL,
  recorded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  quantity numeric(12,3) NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  sale_total numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sale_time timestamptz NOT NULL DEFAULT now(),
  notes text
);

-- =====================================================
-- Orders and delivery
-- =====================================================

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_name text,
  customer_phone text,
  delivery_address text,
  route_id uuid,
  assigned_driver_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status order_status NOT NULL DEFAULT 'pending',
  priority order_priority NOT NULL DEFAULT 'normal',
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  requested_delivery_at timestamptz,
  delivered_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity numeric(12,3) NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  total numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

CREATE TABLE routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text,
  scheduled_date date,
  dispatcher_id uuid REFERENCES users(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  sequence integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  planned_arrival timestamptz,
  actual_arrival timestamptz,
  notes text,
  UNIQUE (route_id, sequence)
);

CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status task_status NOT NULL DEFAULT 'open',
  priority task_priority NOT NULL DEFAULT 'normal',
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  due_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE orders
  ADD CONSTRAINT orders_route_id_fkey
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL;

-- =====================================================
-- Communications
-- =====================================================

CREATE TABLE chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  infrastructure_id uuid NOT NULL REFERENCES infrastructures(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
  room_type chat_room_type NOT NULL,
  title text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  is_encrypted boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE chat_room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  muted boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);

CREATE TABLE chat_encryption_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  version integer NOT NULL,
  key_material text NOT NULL,
  rotated_at timestamptz NOT NULL DEFAULT now(),
  rotated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (room_id, version)
);

CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES users(id) ON DELETE SET NULL,
  parent_message_id uuid REFERENCES chat_messages(id) ON DELETE SET NULL,
  message_type message_type NOT NULL DEFAULT 'text',
  body text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

CREATE TABLE message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  content_type text,
  size_bytes integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE chat_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, reaction)
);

CREATE TABLE chat_notifications_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES chat_messages(id) ON DELETE SET NULL,
  recipient_id uuid REFERENCES users(id) ON DELETE SET NULL,
  delivery_channel text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE direct_message_participants (
  room_id uuid PRIMARY KEY REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_a uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_a, user_b)
);

ALTER TABLE direct_message_participants
  ADD CONSTRAINT direct_message_participants_users_check
  CHECK (user_a <> user_b);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  title text,
  message text,
  action_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- System auditing
-- =====================================================

CREATE TABLE app_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE system_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  infrastructure_id uuid REFERENCES infrastructures(id) ON DELETE SET NULL,
  business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_table text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- Indexes & constraints
-- =====================================================

CREATE INDEX idx_users_telegram ON users(telegram_id);
CREATE INDEX idx_users_global_role ON users(global_role);
CREATE INDEX idx_user_business_roles_user ON user_business_roles(user_id);
CREATE INDEX idx_user_business_roles_business ON user_business_roles(business_id);
CREATE INDEX idx_inventory_records_business ON inventory_records(business_id);
CREATE INDEX idx_inventory_movements_business ON inventory_movements(business_id, created_at DESC);
CREATE INDEX idx_orders_business_status ON orders(business_id, status);
CREATE INDEX idx_orders_driver ON orders(assigned_driver_id);
CREATE INDEX idx_routes_business ON routes(business_id, scheduled_date);
CREATE INDEX idx_chat_messages_room ON chat_messages(room_id, sent_at DESC);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id, sent_at DESC);
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_system_audit_business ON system_audit_log(business_id, created_at DESC);
CREATE UNIQUE INDEX idx_dm_participants_pair
  ON direct_message_participants (LEAST(user_a, user_b), GREATEST(user_a, user_b));

-- =====================================================
-- Row Level Security (baseline enabling only)
-- =====================================================

ALTER TABLE infrastructures ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_business_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_business_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_check_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE pin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_equity ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity_transfer_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE restock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_inventory_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_vehicle_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_zone_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_status_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_movement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_notifications_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_message_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Row Level Security policies
-- =====================================================

-- Infrastructure tables
CREATE POLICY infrastructures_admin_manage ON infrastructures
  FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superadmin())
  WITH CHECK (auth.role() = 'service_role' OR auth_is_superadmin());

CREATE POLICY infrastructures_member_read ON infrastructures
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR (auth_current_infrastructure_id() IS NOT NULL AND auth_current_infrastructure_id() = id)
  );

CREATE POLICY businesses_admin_manage ON businesses
  FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superadmin())
  WITH CHECK (auth.role() = 'service_role' OR auth_is_superadmin());

CREATE POLICY businesses_member_access ON businesses
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR (auth_current_business_id() IS NOT NULL AND auth_current_business_id() = id)
    OR (auth_current_infrastructure_id() IS NOT NULL AND auth_current_infrastructure_id() = infrastructure_id)
  );

CREATE POLICY business_insert_update_policy ON businesses
  FOR INSERT TO PUBLIC
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR (
      auth_current_infrastructure_id() IS NOT NULL
      AND auth_current_infrastructure_id() = infrastructure_id
    )
  );

CREATE POLICY business_update_policy ON businesses
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR (auth_current_business_id() IS NOT NULL AND auth_current_business_id() = id)
    OR (auth_current_infrastructure_id() IS NOT NULL AND auth_current_infrastructure_id() = infrastructure_id)
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR (auth_current_business_id() IS NOT NULL AND auth_current_business_id() = id)
    OR (auth_current_infrastructure_id() IS NOT NULL AND auth_current_infrastructure_id() = infrastructure_id)
  );

CREATE POLICY business_types_access ON business_types
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR (auth_current_infrastructure_id() IS NOT NULL AND auth_current_infrastructure_id() = infrastructure_id)
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR (auth_current_infrastructure_id() IS NOT NULL AND auth_current_infrastructure_id() = infrastructure_id)
  );

-- Global catalogs
CREATE POLICY roles_read_authenticated ON roles
  FOR SELECT
  USING (
    auth.role() IN ('authenticated', 'service_role')
    OR auth_is_superadmin()
  );

CREATE POLICY roles_manage_admin ON roles
  FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superadmin())
  WITH CHECK (auth.role() = 'service_role' OR auth_is_superadmin());

CREATE POLICY permissions_read_authenticated ON permissions
  FOR SELECT
  USING (
    auth.role() IN ('authenticated', 'service_role')
    OR auth_is_superadmin()
  );

CREATE POLICY permissions_manage_admin ON permissions
  FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superadmin())
  WITH CHECK (auth.role() = 'service_role' OR auth_is_superadmin());

CREATE POLICY role_permissions_manage_admin ON role_permissions
  FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superadmin())
  WITH CHECK (auth.role() = 'service_role' OR auth_is_superadmin());

-- User tables
CREATE POLICY users_service_manage ON users
  FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superadmin())
  WITH CHECK (auth.role() = 'service_role' OR auth_is_superadmin());

CREATE POLICY users_self_select ON users
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR auth.uid() = id
  );

CREATE POLICY users_self_update ON users
  FOR UPDATE
  USING (auth.role() = 'service_role' OR auth_is_superadmin() OR auth.uid() = id)
  WITH CHECK (auth.role() = 'service_role' OR auth_is_superadmin() OR auth.uid() = id);

CREATE POLICY user_registrations_manage ON user_registrations
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR coalesce(auth.jwt()->>'role', '') IN ('infrastructure_owner', 'business_owner', 'manager')
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR coalesce(auth.jwt()->>'role', '') IN ('infrastructure_owner', 'business_owner', 'manager')
  );

CREATE POLICY user_business_contexts_access ON user_business_contexts
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR auth.uid() = user_id
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR auth.uid() = user_id
  );

CREATE POLICY user_pins_access ON user_pins
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR auth.uid() = user_id
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR auth.uid() = user_id
  );

CREATE POLICY login_history_access ON login_history
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR auth.uid() = user_id
  );

CREATE POLICY pin_audit_log_access ON pin_audit_log
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR auth.uid() = user_id
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR auth.uid() = user_id
  );

CREATE POLICY pin_sessions_access ON pin_sessions
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR auth.uid() = user_id
    OR (
      auth_current_business_id() IS NOT NULL
      AND auth_current_business_id() = business_id
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR auth.uid() = user_id
    OR (
      auth_current_business_id() IS NOT NULL
      AND auth_current_business_id() = business_id
    )
  );

-- Business scoped tables
DO $$
DECLARE
  tbl text;
  expr text := 'auth.role() = ''service_role'' OR auth_is_superadmin() OR (auth_current_business_id() IS NOT NULL AND auth_current_business_id() = business_id)';
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'user_business_roles',
    'custom_roles',
    'permission_check_failures',
    'pin_settings',
    'business_equity',
    'equity_transactions',
    'equity_transfer_log',
    'warehouses',
    'products',
    'inventory_locations',
    'inventory_records',
    'inventory_movements',
    'stock_allocations',
    'restock_requests',
    'driver_inventory_records',
    'driver_vehicle_inventory',
    'driver_zone_assignments',
    'driver_status_records',
    'driver_movement_logs',
    'sales_logs',
    'orders',
    'routes',
    'tasks'
  ]) LOOP
    EXECUTE format(
      'CREATE POLICY %I_business_scope ON %I FOR ALL USING (%s) WITH CHECK (%s);',
      tbl,
      tbl,
      expr,
      expr
    );
  END LOOP;
END $$;

CREATE POLICY custom_role_permissions_access ON custom_role_permissions
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR EXISTS (
      SELECT 1 FROM custom_roles cr
      WHERE cr.id = custom_role_permissions.custom_role_id
        AND auth_current_business_id() IS NOT NULL
        AND auth_current_business_id() = cr.business_id
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR EXISTS (
      SELECT 1 FROM custom_roles cr
      WHERE cr.id = custom_role_permissions.custom_role_id
        AND auth_current_business_id() IS NOT NULL
        AND auth_current_business_id() = cr.business_id
    )
  );

-- Order items inherit access from orders
CREATE POLICY order_items_business_access ON order_items
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND (
          auth_current_business_id() IS NOT NULL
          AND auth_current_business_id() = o.business_id
        )
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND (
          auth_current_business_id() IS NOT NULL
          AND auth_current_business_id() = o.business_id
        )
    )
  );

-- Route stops inherit access from routes
CREATE POLICY route_stops_business_access ON route_stops
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR EXISTS (
      SELECT 1 FROM routes r
      WHERE r.id = route_stops.route_id
        AND (
          auth_current_business_id() IS NOT NULL
          AND auth_current_business_id() = r.business_id
        )
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR EXISTS (
      SELECT 1 FROM routes r
      WHERE r.id = route_stops.route_id
        AND (
          auth_current_business_id() IS NOT NULL
          AND auth_current_business_id() = r.business_id
        )
    )
  );

-- Notifications limited to recipient
CREATE POLICY notifications_access ON notifications
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR auth.uid() = user_id
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR auth.uid() = user_id
  );

-- Chat rooms & related tables
CREATE POLICY chat_rooms_admin_manage ON chat_rooms
  FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superadmin())
  WITH CHECK (auth.role() = 'service_role' OR auth_is_superadmin());

CREATE POLICY chat_rooms_member_read ON chat_rooms
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR EXISTS (
      SELECT 1 FROM chat_room_members m
      WHERE m.room_id = chat_rooms.id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY chat_room_members_manage ON chat_room_members
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chat_rooms r
      WHERE r.id = chat_room_members.room_id
        AND auth_current_business_id() IS NOT NULL
        AND auth_current_business_id() = r.business_id
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chat_rooms r
      WHERE r.id = chat_room_members.room_id
        AND auth_current_business_id() IS NOT NULL
        AND auth_current_business_id() = r.business_id
    )
  );

CREATE POLICY chat_encryption_keys_access ON chat_encryption_keys
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR EXISTS (
      SELECT 1 FROM chat_room_members m
      WHERE m.room_id = chat_encryption_keys.room_id
        AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR EXISTS (
      SELECT 1 FROM chat_room_members m
      WHERE m.room_id = chat_encryption_keys.room_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY chat_messages_access ON chat_messages
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR EXISTS (
      SELECT 1 FROM chat_room_members m
      WHERE m.room_id = chat_messages.room_id
        AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR EXISTS (
      SELECT 1 FROM chat_room_members m
      WHERE m.room_id = chat_messages.room_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY message_attachments_access ON message_attachments
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN chat_room_members m ON m.room_id = cm.room_id
      WHERE cm.id = message_attachments.message_id
        AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN chat_room_members m ON m.room_id = cm.room_id
      WHERE cm.id = message_attachments.message_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY chat_message_reactions_access ON chat_message_reactions
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN chat_room_members m ON m.room_id = cm.room_id
      WHERE cm.id = chat_message_reactions.message_id
        AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN chat_room_members m ON m.room_id = cm.room_id
      WHERE cm.id = chat_message_reactions.message_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY chat_notifications_queue_manage ON chat_notifications_queue
  FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superadmin())
  WITH CHECK (auth.role() = 'service_role' OR auth_is_superadmin());

CREATE POLICY direct_message_participants_access ON direct_message_participants
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR user_a = auth.uid()
    OR user_b = auth.uid()
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR user_a = auth.uid()
    OR user_b = auth.uid()
  );

-- System configuration and auditing
CREATE POLICY app_config_manage ON app_config
  FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superadmin())
  WITH CHECK (auth.role() = 'service_role' OR auth_is_superadmin());

CREATE POLICY system_config_manage ON system_config
  FOR ALL
  USING (auth.role() = 'service_role' OR auth_is_superadmin())
  WITH CHECK (auth.role() = 'service_role' OR auth_is_superadmin());

CREATE POLICY system_audit_access ON system_audit_log
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR (
      auth_current_business_id() IS NOT NULL
      AND auth_current_business_id() = business_id
    )
    OR (
      auth_current_infrastructure_id() IS NOT NULL
      AND auth_current_infrastructure_id() = infrastructure_id
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR (
      auth_current_business_id() IS NOT NULL
      AND auth_current_business_id() = business_id
    )
    OR (
      auth_current_infrastructure_id() IS NOT NULL
      AND auth_current_infrastructure_id() = infrastructure_id
    )
  );

-- system tables without direct user interaction
CREATE POLICY permissions_cache_service_update ON user_permissions_cache
  FOR UPDATE
  USING (auth.role() = 'service_role' OR auth_is_superadmin())
  WITH CHECK (auth.role() = 'service_role' OR auth_is_superadmin());

CREATE POLICY permissions_cache_service_insert ON user_permissions_cache
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth_is_superadmin());

CREATE POLICY permissions_cache_select ON user_permissions_cache
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR auth_current_business_id() IS NOT NULL AND auth_current_business_id() = business_id
  );

CREATE POLICY permission_failures_service ON permission_check_failures
  FOR ALL
  USING (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR (
      auth_current_business_id() IS NOT NULL
      AND auth_current_business_id() = business_id
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth_is_superadmin()
    OR (
      auth_current_business_id() IS NOT NULL
      AND auth_current_business_id() = business_id
    )
  );
COMMIT;
