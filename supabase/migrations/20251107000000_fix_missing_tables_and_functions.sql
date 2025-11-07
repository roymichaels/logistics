/*
  # Fix Missing Database Tables and Functions

  1. Missing Tables
    - `group_chats` - For group chat functionality
    - `user_presence` - For real-time user status tracking
    - Verify and enhance `orders` table for business metrics
    - Add `direct_message_rooms` view for compatibility

  2. Missing Functions
    - `get_business_metrics` - Returns business analytics and metrics
    - Helper functions for common operations

  3. Performance Indexes
    - Add indexes for frequently queried columns
    - Optimize query performance

  4. Security
    - Enable RLS on all new tables
    - Add appropriate policies for each role
*/

-- =====================================================
-- Create group_chats table if not exists
-- =====================================================

CREATE TABLE IF NOT EXISTS group_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  infrastructure_id uuid REFERENCES infrastructures(id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  members text[] NOT NULL DEFAULT '{}',
  is_encrypted boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on group_chats
ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;

-- Policies for group_chats
CREATE POLICY "Users can view group chats they are members of"
  ON group_chats FOR SELECT
  TO authenticated
  USING (
    auth.uid()::text = ANY(members) OR
    created_by = auth.uid()
  );

CREATE POLICY "Authenticated users can create group chats"
  ON group_chats FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
  );

CREATE POLICY "Group chat creators and members can update"
  ON group_chats FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    auth.uid()::text = ANY(members)
  )
  WITH CHECK (
    created_by = auth.uid() OR
    auth.uid()::text = ANY(members)
  );

-- =====================================================
-- Create user_presence table
-- =====================================================

CREATE TABLE IF NOT EXISTS user_presence (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  is_online boolean NOT NULL DEFAULT false,
  last_seen timestamptz NOT NULL DEFAULT now(),
  status text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on user_presence
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Policies for user_presence
CREATE POLICY "Users can view all user presence"
  ON user_presence FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own presence"
  ON user_presence FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presence status"
  ON user_presence FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- Create direct_message_rooms view for compatibility
-- =====================================================

CREATE OR REPLACE VIEW direct_message_rooms AS
SELECT
  dmp.room_id as id,
  dmp.user_id as user1_id,
  dmp2.user_id as user2_id,
  cr.created_at,
  cr.updated_at
FROM direct_message_participants dmp
JOIN chat_rooms cr ON cr.id = dmp.room_id
JOIN direct_message_participants dmp2 ON dmp2.room_id = dmp.room_id AND dmp2.user_id != dmp.user_id
WHERE cr.room_type = 'direct_message';

-- =====================================================
-- Create or replace get_business_metrics function
-- =====================================================

CREATE OR REPLACE FUNCTION get_business_metrics(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_total_orders integer;
  v_total_revenue numeric;
  v_active_customers integer;
  v_pending_orders integer;
  v_completed_orders integer;
  v_avg_order_value numeric;
BEGIN
  -- Check if business exists
  IF NOT EXISTS (SELECT 1 FROM businesses WHERE id = p_business_id) THEN
    RETURN jsonb_build_object(
      'error', 'Business not found',
      'business_id', p_business_id
    );
  END IF;

  -- Get total orders count
  SELECT COUNT(*) INTO v_total_orders
  FROM orders
  WHERE business_id = p_business_id;

  -- Get total revenue
  SELECT COALESCE(SUM(total_amount), 0) INTO v_total_revenue
  FROM orders
  WHERE business_id = p_business_id
    AND status = 'completed';

  -- Get active customers (unique customers in last 30 days)
  SELECT COUNT(DISTINCT customer_phone) INTO v_active_customers
  FROM orders
  WHERE business_id = p_business_id
    AND created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND customer_phone IS NOT NULL;

  -- Get pending orders
  SELECT COUNT(*) INTO v_pending_orders
  FROM orders
  WHERE business_id = p_business_id
    AND status IN ('pending', 'processing');

  -- Get completed orders
  SELECT COUNT(*) INTO v_completed_orders
  FROM orders
  WHERE business_id = p_business_id
    AND status = 'completed';

  -- Get average order value
  SELECT COALESCE(AVG(total_amount), 0) INTO v_avg_order_value
  FROM orders
  WHERE business_id = p_business_id
    AND status = 'completed';

  -- Build result
  v_result := jsonb_build_object(
    'business_id', p_business_id,
    'total_orders', v_total_orders,
    'total_revenue', v_total_revenue,
    'active_customers', v_active_customers,
    'pending_orders', v_pending_orders,
    'completed_orders', v_completed_orders,
    'avg_order_value', v_avg_order_value,
    'generated_at', now()
  );

  RETURN v_result;
END;
$$;

-- =====================================================
-- Create helper function for safe user lookup
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_by_telegram_id(p_telegram_id text)
RETURNS users
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user users;
BEGIN
  SELECT * INTO v_user
  FROM users
  WHERE telegram_id = p_telegram_id
  LIMIT 1;

  RETURN v_user;
END;
$$;

-- =====================================================
-- Performance Indexes
-- =====================================================

-- Indexes for orders table
CREATE INDEX IF NOT EXISTS idx_orders_business_id ON orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_driver ON orders(assigned_driver_id);

-- Indexes for group_chats
CREATE INDEX IF NOT EXISTS idx_group_chats_business_id ON group_chats(business_id);
CREATE INDEX IF NOT EXISTS idx_group_chats_infrastructure_id ON group_chats(infrastructure_id);
CREATE INDEX IF NOT EXISTS idx_group_chats_created_by ON group_chats(created_by);
CREATE INDEX IF NOT EXISTS idx_group_chats_members ON group_chats USING gin(members);

-- Indexes for user_presence
CREATE INDEX IF NOT EXISTS idx_user_presence_is_online ON user_presence(is_online);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen DESC);

-- Indexes for users table (if not exists)
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active) WHERE active = true;

-- =====================================================
-- Update trigger for updated_at columns
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for new tables
DROP TRIGGER IF EXISTS update_group_chats_updated_at ON group_chats;
CREATE TRIGGER update_group_chats_updated_at
  BEFORE UPDATE ON group_chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_presence_updated_at ON user_presence;
CREATE TRIGGER update_user_presence_updated_at
  BEFORE UPDATE ON user_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Grant necessary permissions
-- =====================================================

GRANT SELECT ON direct_message_rooms TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_metrics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_telegram_id(text) TO authenticated;
