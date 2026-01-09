/*
  # Product Workflow and Approval System

  1. New Tables
    - `product_change_requests`
      - Tracks all product change requests requiring approval
      - Supports create/edit/delete/price/publish workflows
      - Stores before/after snapshots for audit trail
      - Tracks request status and reviewer information

    - `product_versions`
      - Complete version history for all product changes
      - Stores full product snapshot at each version
      - Enables rollback and version comparison
      - Tracks who made changes and when

    - `catalog_audit_logs`
      - Enhanced audit logging for catalog operations
      - Tracks all catalog actions with detailed context
      - Stores before/after values for changes
      - Records IP address and user agent for security

  2. Security
    - Enable RLS on all new tables
    - Business owners can manage all requests for their businesses
    - Managers can create and view requests
    - Staff can view requests relevant to them
    - Audit logs are read-only for non-owners

  3. Features
    - Approval workflow for sensitive operations
    - Complete audit trail
    - Version control with rollback capability
    - Change request system with comments
*/

-- =====================================================
-- PRODUCT CHANGE REQUESTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS product_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,

  -- Request metadata
  change_type text NOT NULL CHECK (change_type IN ('create', 'edit', 'delete', 'price', 'publish', 'bulk')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- Request details
  title text NOT NULL,
  description text,
  reason text,

  -- Data snapshots
  before_data jsonb,
  after_data jsonb NOT NULL,
  affected_product_ids uuid[],

  -- People involved
  requested_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  rejection_reason text,

  -- Additional metadata
  metadata jsonb DEFAULT '{}',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_change_requests_business ON product_change_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_product_change_requests_product ON product_change_requests(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_change_requests_status ON product_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_product_change_requests_requester ON product_change_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_product_change_requests_created ON product_change_requests(created_at DESC);

-- =====================================================
-- PRODUCT VERSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS product_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Version information
  version_number integer NOT NULL,
  change_type text NOT NULL CHECK (change_type IN ('created', 'updated', 'deleted', 'published', 'unpublished', 'price_changed', 'restored')),

  -- Complete product snapshot
  snapshot jsonb NOT NULL,

  -- Change details
  change_summary text,
  changes_made jsonb,

  -- Who made the change
  changed_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  changed_at timestamptz NOT NULL DEFAULT now(),

  -- Reference to change request if applicable
  change_request_id uuid REFERENCES product_change_requests(id) ON DELETE SET NULL,

  -- Additional context
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}',

  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(product_id, version_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_versions_product ON product_versions(product_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_product_versions_business ON product_versions(business_id);
CREATE INDEX IF NOT EXISTS idx_product_versions_changed_by ON product_versions(changed_by);
CREATE INDEX IF NOT EXISTS idx_product_versions_created ON product_versions(created_at DESC);

-- =====================================================
-- CATALOG AUDIT LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS catalog_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- What was affected
  entity_type text NOT NULL CHECK (entity_type IN ('product', 'category', 'variant', 'bulk_operation')),
  entity_id uuid,

  -- What action was taken
  action text NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'publish', 'unpublish', 'approve', 'reject', 'export', 'import', 'bulk_update', 'bulk_delete')),
  action_category text NOT NULL CHECK (action_category IN ('catalog_management', 'pricing', 'inventory', 'publishing', 'approval', 'bulk_operation', 'export_import')),

  -- Details of the change
  description text NOT NULL,
  before_value jsonb,
  after_value jsonb,
  changes_made jsonb,

  -- Who performed the action
  performed_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  performed_at timestamptz NOT NULL DEFAULT now(),
  user_role text NOT NULL,

  -- Request context
  ip_address inet,
  user_agent text,

  -- Status and metadata
  status text DEFAULT 'success' CHECK (status IN ('success', 'failed', 'partial')),
  error_message text,
  metadata jsonb DEFAULT '{}',

  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_catalog_audit_logs_business ON catalog_audit_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_catalog_audit_logs_entity ON catalog_audit_logs(entity_type, entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_catalog_audit_logs_action ON catalog_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_catalog_audit_logs_performer ON catalog_audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_catalog_audit_logs_created ON catalog_audit_logs(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE product_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PRODUCT CHANGE REQUESTS POLICIES
-- =====================================================

-- Business owners can manage all requests for their businesses
CREATE POLICY "Business owners can manage change requests"
  ON product_change_requests
  FOR ALL
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

-- Managers can view and create requests for assigned business
CREATE POLICY "Managers can view and create change requests"
  ON product_change_requests
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid() AND role = 'manager'
    )
  );

CREATE POLICY "Managers can create change requests"
  ON product_change_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid() AND role = 'manager'
    )
  );

-- Staff can view requests they created
CREATE POLICY "Users can view their own change requests"
  ON product_change_requests
  FOR SELECT
  TO authenticated
  USING (requested_by = auth.uid());

-- Admins can manage all requests
CREATE POLICY "Admins can manage all change requests"
  ON product_change_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- PRODUCT VERSIONS POLICIES
-- =====================================================

-- Business owners can view all versions for their products
CREATE POLICY "Business owners can view product versions"
  ON product_versions
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Managers can view versions for assigned business
CREATE POLICY "Managers can view product versions"
  ON product_versions
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid() AND role IN ('manager', 'warehouse', 'sales', 'customer_service')
    )
  );

-- System can insert versions (triggered by changes)
CREATE POLICY "Authenticated users can create versions"
  ON product_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admins can view all versions
CREATE POLICY "Admins can view all product versions"
  ON product_versions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- CATALOG AUDIT LOGS POLICIES
-- =====================================================

-- Business owners can view audit logs for their businesses
CREATE POLICY "Business owners can view catalog audit logs"
  ON catalog_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Managers can view audit logs for assigned business
CREATE POLICY "Managers can view catalog audit logs"
  ON catalog_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM user_business_roles
      WHERE user_id = auth.uid() AND role = 'manager'
    )
  );

-- System can insert audit logs
CREATE POLICY "Authenticated users can create audit logs"
  ON catalog_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admins can view all audit logs
CREATE POLICY "Admins can view all catalog audit logs"
  ON catalog_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get next version number for a product
CREATE OR REPLACE FUNCTION get_next_product_version(p_product_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_version integer;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_next_version
  FROM product_versions
  WHERE product_id = p_product_id;

  RETURN v_next_version;
END;
$$;

-- Function to create product version snapshot
CREATE OR REPLACE FUNCTION create_product_version_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_version_number integer;
  v_change_type text;
  v_snapshot jsonb;
BEGIN
  -- Determine change type
  IF TG_OP = 'INSERT' THEN
    v_change_type := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      v_change_type := 'published';
    ELSIF OLD.price != NEW.price THEN
      v_change_type := 'price_changed';
    ELSE
      v_change_type := 'updated';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_change_type := 'deleted';
  END IF;

  -- Get next version number
  v_version_number := get_next_product_version(COALESCE(NEW.id, OLD.id));

  -- Create snapshot of product data
  v_snapshot := to_jsonb(COALESCE(NEW, OLD));

  -- Insert version record
  INSERT INTO product_versions (
    product_id,
    business_id,
    version_number,
    change_type,
    snapshot,
    changed_by,
    changed_at
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.business_id, OLD.business_id),
    v_version_number,
    v_change_type,
    v_snapshot,
    auth.uid(),
    now()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger to automatically version products
DROP TRIGGER IF EXISTS product_version_trigger ON products;
CREATE TRIGGER product_version_trigger
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW
  EXECUTE FUNCTION create_product_version_snapshot();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for product_change_requests
DROP TRIGGER IF EXISTS update_product_change_requests_updated_at ON product_change_requests;
CREATE TRIGGER update_product_change_requests_updated_at
  BEFORE UPDATE ON product_change_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
