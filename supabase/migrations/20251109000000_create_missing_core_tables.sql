/*
  # Create Missing Core Tables for Application

  1. New Tables
    - `notifications` - User notification system
    - `chat_rooms` - Chat room management
    - `direct_message_participants` - DM participant tracking
    - `driver_status` - Real-time driver availability
    - `zones` - Delivery zone management
    - `role_permissions` - Dynamic RBAC system
    - `inventory_low_stock_alerts` - Inventory alerts
    - `restock_requests` - Inventory restocking workflow

  2. Security
    - Enable RLS on all tables
    - Add comprehensive policies for data access
    - Ensure proper tenant isolation

  3. Performance
    - Add indexes for frequently queried columns
    - Optimize for real-time operations
*/

-- =====================================================
-- 1. NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES users(id) ON DELETE SET NULL,
  infrastructure_id uuid REFERENCES infrastructures(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

CREATE POLICY "Authenticated users can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_business_id ON notifications(business_id);

-- =====================================================
-- 2. CHAT ROOMS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  infrastructure_id uuid REFERENCES infrastructures(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  room_type text NOT NULL CHECK (room_type IN ('direct', 'group', 'channel')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  last_message_at timestamptz,
  last_message_preview text,
  last_message_sender uuid REFERENCES users(id) ON DELETE SET NULL,
  is_encrypted boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view chat rooms they participate in"
  ON chat_rooms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM direct_message_participants dmp
      WHERE dmp.room_id = chat_rooms.id
      AND dmp.telegram_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

CREATE POLICY "Authenticated users can create chat rooms"
  ON chat_rooms FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Chat room participants can update"
  ON chat_rooms FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM direct_message_participants dmp
      WHERE dmp.room_id = chat_rooms.id
      AND dmp.telegram_id = auth.uid()
    )
    OR created_by = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM direct_message_participants dmp
      WHERE dmp.room_id = chat_rooms.id
      AND dmp.telegram_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_rooms_business_id ON chat_rooms(business_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_infrastructure_id ON chat_rooms(infrastructure_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_created_by ON chat_rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_last_message_at ON chat_rooms(last_message_at DESC);

-- =====================================================
-- 3. DIRECT MESSAGE PARTICIPANTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS direct_message_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  telegram_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name text,
  role text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, telegram_id)
);

-- Enable RLS
ALTER TABLE direct_message_participants ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view participants in their rooms"
  ON direct_message_participants FOR SELECT
  TO authenticated
  USING (
    telegram_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM direct_message_participants dmp2
      WHERE dmp2.room_id = direct_message_participants.room_id
      AND dmp2.telegram_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert themselves as participants"
  ON direct_message_participants FOR INSERT
  TO authenticated
  WITH CHECK (telegram_id = auth.uid());

CREATE POLICY "Users can update their own participation"
  ON direct_message_participants FOR UPDATE
  TO authenticated
  USING (telegram_id = auth.uid())
  WITH CHECK (telegram_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dmp_room_id ON direct_message_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_dmp_telegram_id ON direct_message_participants(telegram_id);
CREATE INDEX IF NOT EXISTS idx_dmp_is_active ON direct_message_participants(is_active) WHERE is_active = true;

-- =====================================================
-- 4. DRIVER STATUS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS driver_status (
  driver_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  infrastructure_id uuid REFERENCES infrastructures(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('offline', 'available', 'busy', 'on_delivery', 'break')),
  is_online boolean NOT NULL DEFAULT false,
  current_zone_id uuid,
  current_location point,
  last_location_update timestamptz,
  capacity_remaining integer DEFAULT 100,
  total_deliveries_today integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  last_updated timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE driver_status ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Drivers can view and update their own status"
  ON driver_status FOR ALL
  TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Business members can view driver status"
  ON driver_status FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Infrastructure managers can view all driver status"
  ON driver_status FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('infrastructure_owner', 'infrastructure_manager', 'infrastructure_dispatcher')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_driver_status_business_id ON driver_status(business_id);
CREATE INDEX IF NOT EXISTS idx_driver_status_infrastructure_id ON driver_status(infrastructure_id);
CREATE INDEX IF NOT EXISTS idx_driver_status_status ON driver_status(status);
CREATE INDEX IF NOT EXISTS idx_driver_status_is_online ON driver_status(is_online) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_driver_status_last_updated ON driver_status(last_updated DESC);

-- =====================================================
-- 5. ZONES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  infrastructure_id uuid NOT NULL REFERENCES infrastructures(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  color text DEFAULT '#3B82F6',
  boundary polygon,
  center point,
  radius_meters integer,
  priority integer DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  delivery_fee numeric(10,2) DEFAULT 0,
  min_order_amount numeric(10,2) DEFAULT 0,
  estimated_delivery_minutes integer DEFAULT 30,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view zones in their business"
  ON zones FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
    )
    OR business_id IS NULL
  );

CREATE POLICY "Business owners can manage their zones"
  ON zones FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
      AND role IN ('business_owner', 'manager')
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
      AND role IN ('business_owner', 'manager')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_zones_infrastructure_id ON zones(infrastructure_id);
CREATE INDEX IF NOT EXISTS idx_zones_business_id ON zones(business_id);
CREATE INDEX IF NOT EXISTS idx_zones_active ON zones(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_zones_code ON zones(code);

-- =====================================================
-- 6. ROLE PERMISSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  resource text NOT NULL,
  action text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  conditions jsonb DEFAULT '{}'::jsonb,
  infrastructure_id uuid REFERENCES infrastructures(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, resource, action, infrastructure_id, business_id)
);

-- Enable RLS
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view permissions for their roles"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (
    role IN (
      SELECT role FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Infrastructure owners can manage permissions"
  ON role_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'infrastructure_owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'infrastructure_owner'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_resource ON role_permissions(resource);
CREATE INDEX IF NOT EXISTS idx_role_permissions_business_id ON role_permissions(business_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_infrastructure_id ON role_permissions(infrastructure_id);

-- =====================================================
-- 7. INVENTORY LOW STOCK ALERTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory_low_stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  product_name text NOT NULL,
  location_id uuid NOT NULL,
  location_name text NOT NULL,
  infrastructure_id uuid REFERENCES infrastructures(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  on_hand_quantity integer NOT NULL,
  low_stock_threshold integer NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'critical', 'out_of_stock')),
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE inventory_low_stock_alerts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view alerts for their business"
  ON inventory_low_stock_alerts FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can resolve alerts"
  ON inventory_low_stock_alerts FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
      AND role IN ('business_owner', 'manager', 'infrastructure_warehouse')
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
      AND role IN ('business_owner', 'manager', 'infrastructure_warehouse')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_business_id ON inventory_low_stock_alerts(business_id);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_is_resolved ON inventory_low_stock_alerts(is_resolved) WHERE is_resolved = false;
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_severity ON inventory_low_stock_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_triggered_at ON inventory_low_stock_alerts(triggered_at DESC);

-- =====================================================
-- 8. RESTOCK REQUESTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS restock_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  infrastructure_id uuid REFERENCES infrastructures(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  from_location_id uuid,
  to_location_id uuid NOT NULL,
  requested_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  requested_quantity integer NOT NULL CHECK (requested_quantity > 0),
  approved_quantity integer,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'in_transit', 'completed', 'cancelled')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  notes text,
  approved_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE restock_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view restock requests for their business"
  ON restock_requests FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
    )
    OR requested_by = auth.uid()
  );

CREATE POLICY "Users can create restock requests"
  ON restock_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can update restock requests"
  ON restock_requests FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
      AND role IN ('business_owner', 'manager', 'infrastructure_warehouse')
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_memberships
      WHERE user_id = auth.uid()
      AND role IN ('business_owner', 'manager', 'infrastructure_warehouse')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_restock_requests_business_id ON restock_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_restock_requests_status ON restock_requests(status);
CREATE INDEX IF NOT EXISTS idx_restock_requests_requested_by ON restock_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_restock_requests_priority ON restock_requests(priority);
CREATE INDEX IF NOT EXISTS idx_restock_requests_created_at ON restock_requests(created_at DESC);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Notifications
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Chat rooms
DROP TRIGGER IF EXISTS update_chat_rooms_updated_at ON chat_rooms;
CREATE TRIGGER update_chat_rooms_updated_at
  BEFORE UPDATE ON chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Direct message participants
DROP TRIGGER IF EXISTS update_dmp_updated_at ON direct_message_participants;
CREATE TRIGGER update_dmp_updated_at
  BEFORE UPDATE ON direct_message_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Zones
DROP TRIGGER IF EXISTS update_zones_updated_at ON zones;
CREATE TRIGGER update_zones_updated_at
  BEFORE UPDATE ON zones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Role permissions
DROP TRIGGER IF EXISTS update_role_permissions_updated_at ON role_permissions;
CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Restock requests
DROP TRIGGER IF EXISTS update_restock_requests_updated_at ON restock_requests;
CREATE TRIGGER update_restock_requests_updated_at
  BEFORE UPDATE ON restock_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
