-- Enable Row Level Security and policies for logistics driver and inventory tables

-- Enable RLS on target tables
ALTER TABLE driver_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE restock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_movements ENABLE ROW LEVEL SECURITY;

-- Helper expression: reusable role check via inline functions not possible so using policies directly.

-- Driver Inventory policies
DROP POLICY IF EXISTS "Drivers manage own inventory" ON driver_inventory;
DROP POLICY IF EXISTS "Managers manage driver inventory" ON driver_inventory;
DROP POLICY IF EXISTS "Warehouse manage driver inventory" ON driver_inventory;

CREATE POLICY "Drivers manage own inventory"
  ON driver_inventory
  FOR ALL
  TO authenticated
  USING (driver_id = auth.jwt() ->> 'telegram_id')
  WITH CHECK (driver_id = auth.jwt() ->> 'telegram_id');

CREATE POLICY "Managers and warehouse manage driver inventory"
  ON driver_inventory
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.telegram_id = auth.jwt() ->> 'telegram_id'
        AND u.role IN ('manager', 'warehouse')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.telegram_id = auth.jwt() ->> 'telegram_id'
        AND u.role IN ('manager', 'warehouse')
    )
  );

-- Restock requests policies
DROP POLICY IF EXISTS "Sales view own restock requests" ON restock_requests;
DROP POLICY IF EXISTS "Sales create restock requests" ON restock_requests;
DROP POLICY IF EXISTS "Managers manage restock requests" ON restock_requests;

CREATE POLICY "Sales view own restock requests"
  ON restock_requests
  FOR SELECT
  TO authenticated
  USING (
    requested_by = auth.jwt() ->> 'telegram_id'
    AND EXISTS (
      SELECT 1
      FROM users u
      WHERE u.telegram_id = auth.jwt() ->> 'telegram_id'
        AND u.role = 'sales'
    )
  );

CREATE POLICY "Sales create restock requests"
  ON restock_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = auth.jwt() ->> 'telegram_id'
    AND EXISTS (
      SELECT 1
      FROM users u
      WHERE u.telegram_id = auth.jwt() ->> 'telegram_id'
        AND u.role = 'sales'
    )
  );

CREATE POLICY "Managers and warehouse manage restock requests"
  ON restock_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.telegram_id = auth.jwt() ->> 'telegram_id'
        AND u.role IN ('manager', 'warehouse')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.telegram_id = auth.jwt() ->> 'telegram_id'
        AND u.role IN ('manager', 'warehouse')
    )
  );

-- Inventory logs policies
DROP POLICY IF EXISTS "Drivers view own inventory logs" ON inventory_logs;
DROP POLICY IF EXISTS "Drivers create inventory logs" ON inventory_logs;
DROP POLICY IF EXISTS "Managers manage inventory logs" ON inventory_logs;

CREATE POLICY "Drivers view own inventory logs"
  ON inventory_logs
  FOR SELECT
  TO authenticated
  USING (created_by = auth.jwt() ->> 'telegram_id');

CREATE POLICY "Drivers create inventory logs"
  ON inventory_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.jwt() ->> 'telegram_id');

CREATE POLICY "Managers and warehouse manage inventory logs"
  ON inventory_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.telegram_id = auth.jwt() ->> 'telegram_id'
        AND u.role IN ('manager', 'warehouse')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.telegram_id = auth.jwt() ->> 'telegram_id'
        AND u.role IN ('manager', 'warehouse')
    )
  );

-- Zones policies
DROP POLICY IF EXISTS "Authenticated users can view zones" ON zones;
DROP POLICY IF EXISTS "Managers manage zones" ON zones;

CREATE POLICY "Authenticated users can view zones"
  ON zones
  FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Managers manage zones"
  ON zones
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.telegram_id = auth.jwt() ->> 'telegram_id'
        AND u.role IN ('manager', 'warehouse')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.telegram_id = auth.jwt() ->> 'telegram_id'
        AND u.role IN ('manager', 'warehouse')
    )
  );

-- Driver zones policies
DROP POLICY IF EXISTS "Drivers view own zone assignments" ON driver_zones;
DROP POLICY IF EXISTS "Managers manage driver zones" ON driver_zones;

CREATE POLICY "Drivers view own zone assignments"
  ON driver_zones
  FOR SELECT
  TO authenticated
  USING (
    driver_id = auth.jwt() ->> 'telegram_id'
    OR EXISTS (
      SELECT 1
      FROM users u
      WHERE u.telegram_id = auth.jwt() ->> 'telegram_id'
        AND u.role IN ('manager', 'warehouse')
    )
  );

CREATE POLICY "Managers manage driver zones"
  ON driver_zones
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.telegram_id = auth.jwt() ->> 'telegram_id'
        AND u.role IN ('manager', 'warehouse')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.telegram_id = auth.jwt() ->> 'telegram_id'
        AND u.role IN ('manager', 'warehouse')
    )
  );

-- Driver status policies
DROP POLICY IF EXISTS "Drivers manage own status" ON driver_status;
DROP POLICY IF EXISTS "Managers view driver status" ON driver_status;
DROP POLICY IF EXISTS "Managers manage driver status" ON driver_status;

CREATE POLICY "Drivers manage own status"
  ON driver_status
  FOR ALL
  TO authenticated
  USING (driver_id = auth.jwt() ->> 'telegram_id')
  WITH CHECK (driver_id = auth.jwt() ->> 'telegram_id');

CREATE POLICY "Managers view driver status"
  ON driver_status
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.telegram_id = auth.jwt() ->> 'telegram_id'
        AND u.role IN ('manager', 'warehouse')
    )
  );

CREATE POLICY "Managers manage driver status"
  ON driver_status
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.telegram_id = auth.jwt() ->> 'telegram_id'
        AND u.role IN ('manager', 'warehouse')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.telegram_id = auth.jwt() ->> 'telegram_id'
        AND u.role IN ('manager', 'warehouse')
    )
  );

-- Driver movement policies
DROP POLICY IF EXISTS "Drivers manage own movements" ON driver_movements;
DROP POLICY IF EXISTS "Managers view driver movements" ON driver_movements;
DROP POLICY IF EXISTS "Managers manage driver movements" ON driver_movements;

CREATE POLICY "Drivers manage own movements"
  ON driver_movements
  FOR ALL
  TO authenticated
  USING (driver_id = auth.jwt() ->> 'telegram_id')
  WITH CHECK (driver_id = auth.jwt() ->> 'telegram_id');

CREATE POLICY "Managers view driver movements"
  ON driver_movements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.telegram_id = auth.jwt() ->> 'telegram_id'
        AND u.role IN ('manager', 'warehouse')
    )
  );

CREATE POLICY "Managers manage driver movements"
  ON driver_movements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.telegram_id = auth.jwt() ->> 'telegram_id'
        AND u.role IN ('manager', 'warehouse')
    )
  );

-- Allow managers to delete driver movements if necessary
CREATE POLICY "Managers delete driver movements"
  ON driver_movements
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.telegram_id = auth.jwt() ->> 'telegram_id'
        AND u.role IN ('manager', 'warehouse')
    )
  );

-- Synchronize role permissions with RLS expectations
INSERT INTO role_permissions (
  role,
  can_view_inventory,
  can_request_restock,
  can_approve_restock,
  can_fulfill_restock,
  can_transfer_inventory,
  can_adjust_inventory,
  can_view_movements,
  can_manage_locations,
  can_view_sales
) VALUES
  ('manager', true, true, true, true, true, true, true, true, true),
  ('warehouse', true, true, true, true, true, true, true, false, false),
  ('dispatcher', true, true, false, false, true, false, true, false, false),
  ('driver', true, true, false, false, false, false, false, false, false),
  ('sales', false, true, false, false, false, false, false, false, true)
ON CONFLICT (role) DO UPDATE SET
  can_view_inventory = EXCLUDED.can_view_inventory,
  can_request_restock = EXCLUDED.can_request_restock,
  can_approve_restock = EXCLUDED.can_approve_restock,
  can_fulfill_restock = EXCLUDED.can_fulfill_restock,
  can_transfer_inventory = EXCLUDED.can_transfer_inventory,
  can_adjust_inventory = EXCLUDED.can_adjust_inventory,
  can_view_movements = EXCLUDED.can_view_movements,
  can_manage_locations = EXCLUDED.can_manage_locations,
  can_view_sales = EXCLUDED.can_view_sales;

CREATE POLICY "Managers update driver movements"
  ON driver_movements
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.telegram_id = auth.jwt() ->> 'telegram_id'
        AND u.role IN ('manager', 'warehouse')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.telegram_id = auth.jwt() ->> 'telegram_id'
        AND u.role IN ('manager', 'warehouse')
    )
  );

-- Ensure inventory helper functions derive actor from authenticated identity
CREATE OR REPLACE FUNCTION perform_inventory_transfer(
  p_product_id uuid,
  p_from_location_id uuid,
  p_to_location_id uuid,
  p_quantity integer,
  p_actor text,
  p_reference_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_from_record inventory%rowtype;
  v_to_record inventory%rowtype;
  v_actor text := coalesce(auth.jwt() ->> 'telegram_id', p_actor);
BEGIN
  IF v_actor IS NULL OR v_actor = '' THEN
    RAISE EXCEPTION 'Missing authenticated actor identity';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Transfer quantity must be positive';
  END IF;

  IF p_from_location_id = p_to_location_id THEN
    RAISE EXCEPTION 'Source and destination locations must differ';
  END IF;

  UPDATE inventory
  SET on_hand_quantity = on_hand_quantity - p_quantity,
      updated_at = timezone('utc', now())
  WHERE product_id = p_product_id
    AND location_id = p_from_location_id
  RETURNING * INTO v_from_record;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source inventory balance not found';
  END IF;

  IF v_from_record.on_hand_quantity < 0 THEN
    RAISE EXCEPTION 'Insufficient quantity at source location';
  END IF;

  INSERT INTO inventory (product_id, location_id, on_hand_quantity, reserved_quantity, damaged_quantity, low_stock_threshold, updated_at)
  VALUES (p_product_id, p_to_location_id, p_quantity, 0, 0, v_from_record.low_stock_threshold, timezone('utc', now()))
  ON CONFLICT (product_id, location_id) DO UPDATE
    SET on_hand_quantity = inventory.on_hand_quantity + excluded.on_hand_quantity,
        updated_at = excluded.updated_at
  RETURNING * INTO v_to_record;

  INSERT INTO inventory_logs (
    product_id,
    change_type,
    quantity_change,
    from_location_id,
    to_location_id,
    reference_id,
    created_by,
    created_at,
    metadata
  ) VALUES (
    p_product_id,
    'transfer',
    -1 * p_quantity,
    p_from_location_id,
    p_to_location_id,
    p_reference_id,
    v_actor,
    timezone('utc', now()),
    jsonb_build_object('notes', p_notes, 'direction', 'outbound')
  );

  INSERT INTO inventory_logs (
    product_id,
    change_type,
    quantity_change,
    from_location_id,
    to_location_id,
    reference_id,
    created_by,
    created_at,
    metadata
  ) VALUES (
    p_product_id,
    'transfer',
    p_quantity,
    p_from_location_id,
    p_to_location_id,
    p_reference_id,
    v_actor,
    timezone('utc', now()),
    jsonb_build_object('notes', p_notes, 'direction', 'inbound')
  );
END;
$$;

CREATE OR REPLACE FUNCTION approve_restock_request(
  p_request_id uuid,
  p_actor text,
  p_from_location_id uuid,
  p_approved_quantity integer,
  p_notes text DEFAULT NULL
) RETURNS restock_requests
LANGUAGE plpgsql
AS $$
DECLARE
  v_request restock_requests%rowtype;
  v_actor text := coalesce(auth.jwt() ->> 'telegram_id', p_actor);
BEGIN
  IF v_actor IS NULL OR v_actor = '' THEN
    RAISE EXCEPTION 'Missing authenticated actor identity';
  END IF;

  IF p_approved_quantity IS NULL OR p_approved_quantity <= 0 THEN
    RAISE EXCEPTION 'Approved quantity must be positive';
  END IF;

  SELECT * INTO v_request
  FROM restock_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Restock request not found';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending requests can be approved';
  END IF;

  UPDATE restock_requests
  SET status = 'approved',
      approved_by = v_actor,
      approved_quantity = p_approved_quantity,
      from_location_id = p_from_location_id,
      approved_at = timezone('utc', now()),
      updated_at = timezone('utc', now()),
      notes = CASE
        WHEN p_notes IS NOT NULL AND p_notes <> '' THEN coalesce(v_request.notes, '') || '\n' || p_notes
        ELSE v_request.notes
      END
  WHERE id = p_request_id
  RETURNING * INTO v_request;

  INSERT INTO inventory_logs (
    product_id,
    change_type,
    quantity_change,
    from_location_id,
    to_location_id,
    reference_id,
    created_by,
    created_at,
    metadata
  ) VALUES (
    v_request.product_id,
    'reservation',
    p_approved_quantity,
    p_from_location_id,
    v_request.to_location_id,
    v_request.id,
    v_actor,
    timezone('utc', now()),
    jsonb_build_object('event', 'restock_approved', 'notes', p_notes)
  );

  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION fulfill_restock_request(
  p_request_id uuid,
  p_actor text,
  p_fulfilled_quantity integer,
  p_reference_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS restock_requests
LANGUAGE plpgsql
AS $$
DECLARE
  v_request restock_requests%rowtype;
  v_actor text := coalesce(auth.jwt() ->> 'telegram_id', p_actor);
BEGIN
  IF v_actor IS NULL OR v_actor = '' THEN
    RAISE EXCEPTION 'Missing authenticated actor identity';
  END IF;

  IF p_fulfilled_quantity IS NULL OR p_fulfilled_quantity <= 0 THEN
    RAISE EXCEPTION 'Fulfilled quantity must be positive';
  END IF;

  SELECT * INTO v_request
  FROM restock_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Restock request not found';
  END IF;

  IF v_request.status NOT IN ('approved', 'in_transit') THEN
    RAISE EXCEPTION 'Restock request must be approved before fulfillment';
  END IF;

  IF v_request.from_location_id IS NULL THEN
    RAISE EXCEPTION 'Restock request is missing source location';
  END IF;

  PERFORM perform_inventory_transfer(
    v_request.product_id,
    v_request.from_location_id,
    v_request.to_location_id,
    p_fulfilled_quantity,
    v_actor,
    coalesce(p_reference_id, v_request.id),
    p_notes
  );

  UPDATE restock_requests
  SET status = 'fulfilled',
      fulfilled_by = v_actor,
      fulfilled_quantity = p_fulfilled_quantity,
      fulfilled_at = timezone('utc', now()),
      updated_at = timezone('utc', now()),
      notes = CASE
        WHEN p_notes IS NOT NULL AND p_notes <> '' THEN coalesce(v_request.notes, '') || '\n' || p_notes
        ELSE v_request.notes
      END
  WHERE id = p_request_id;

  SELECT * INTO v_request FROM restock_requests WHERE id = p_request_id;
  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION reject_restock_request(
  p_request_id uuid,
  p_actor text,
  p_notes text DEFAULT NULL
) RETURNS restock_requests
LANGUAGE plpgsql
AS $$
DECLARE
  v_request restock_requests%rowtype;
  v_actor text := coalesce(auth.jwt() ->> 'telegram_id', p_actor);
BEGIN
  IF v_actor IS NULL OR v_actor = '' THEN
    RAISE EXCEPTION 'Missing authenticated actor identity';
  END IF;

  SELECT * INTO v_request
  FROM restock_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Restock request not found';
  END IF;

  IF v_request.status IN ('fulfilled', 'rejected') THEN
    RAISE EXCEPTION 'Request already resolved';
  END IF;

  UPDATE restock_requests
  SET status = 'rejected',
      approved_by = v_actor,
      approved_quantity = 0,
      updated_at = timezone('utc', now()),
      notes = CASE
        WHEN p_notes IS NOT NULL AND p_notes <> '' THEN coalesce(v_request.notes, '') || '\n' || p_notes
        ELSE v_request.notes
      END
  WHERE id = p_request_id
  RETURNING * INTO v_request;

  INSERT INTO inventory_logs (
    product_id,
    change_type,
    quantity_change,
    from_location_id,
    to_location_id,
    reference_id,
    created_by,
    created_at,
    metadata
  ) VALUES (
    v_request.product_id,
    'release',
    coalesce(v_request.approved_quantity, v_request.requested_quantity),
    v_request.from_location_id,
    v_request.to_location_id,
    v_request.id,
    v_actor,
    timezone('utc', now()),
    jsonb_build_object('event', 'restock_rejected', 'notes', p_notes)
  );

  RETURN v_request;
END;
$$;
