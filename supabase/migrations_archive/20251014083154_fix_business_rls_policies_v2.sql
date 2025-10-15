-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Infrastructure owners can view all businesses" ON businesses;
DROP POLICY IF EXISTS "Business owners can view their businesses" ON businesses;
DROP POLICY IF EXISTS "Infrastructure owners can insert businesses" ON businesses;
DROP POLICY IF EXISTS "Infrastructure owners can create businesses" ON businesses;
DROP POLICY IF EXISTS "Infrastructure owners can update businesses" ON businesses;
DROP POLICY IF EXISTS "Business owners can update their businesses" ON businesses;
DROP POLICY IF EXISTS "Infrastructure owners can delete businesses" ON businesses;
DROP POLICY IF EXISTS "Users can view businesses they own or work for" ON businesses;
DROP POLICY IF EXISTS "Infrastructure owners can update all businesses" ON businesses;

-- CREATE businesses policies
CREATE POLICY "Infrastructure owners can view all businesses"
  ON businesses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

CREATE POLICY "Users can view businesses they own or work for"
  ON businesses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_equity
      WHERE business_equity.business_id = businesses.id
      AND business_equity.stakeholder_id = auth.uid()
      AND business_equity.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM users u
      INNER JOIN business_users bu ON bu.user_id = u.telegram_id
      WHERE u.id = auth.uid()
      AND bu.business_id = businesses.id
      AND bu.active = true
    )
  );

CREATE POLICY "Infrastructure owners can create businesses"
  ON businesses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

CREATE POLICY "Infrastructure owners can update all businesses"
  ON businesses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

CREATE POLICY "Business owners can update their businesses"
  ON businesses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_equity
      WHERE business_equity.business_id = businesses.id
      AND business_equity.stakeholder_id = auth.uid()
      AND business_equity.is_active = true
      AND business_equity.equity_type = 'founder'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_equity
      WHERE business_equity.business_id = businesses.id
      AND business_equity.stakeholder_id = auth.uid()
      AND business_equity.is_active = true
      AND business_equity.equity_type = 'founder'
    )
  );

CREATE POLICY "Infrastructure owners can delete businesses"
  ON businesses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

-- Drop existing business_equity policies
DROP POLICY IF EXISTS "Users can view their equity records" ON business_equity;
DROP POLICY IF EXISTS "Infrastructure owners can view all equity records" ON business_equity;
DROP POLICY IF EXISTS "Users can insert equity records" ON business_equity;
DROP POLICY IF EXISTS "Infrastructure owners can create equity records" ON business_equity;
DROP POLICY IF EXISTS "Users can update their equity records" ON business_equity;
DROP POLICY IF EXISTS "Infrastructure owners can update equity records" ON business_equity;
DROP POLICY IF EXISTS "Business founders can create equity records" ON business_equity;

-- CREATE business_equity policies
CREATE POLICY "Users can view their equity records"
  ON business_equity FOR SELECT
  TO authenticated
  USING (stakeholder_id = auth.uid());

CREATE POLICY "Infrastructure owners can view all equity records"
  ON business_equity FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

CREATE POLICY "Infrastructure owners can create equity records"
  ON business_equity FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );

CREATE POLICY "Business founders can create equity records"
  ON business_equity FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_equity existing
      WHERE existing.business_id = business_equity.business_id
      AND existing.stakeholder_id = auth.uid()
      AND existing.is_active = true
      AND existing.equity_type = 'founder'
    )
  );

CREATE POLICY "Infrastructure owners can update equity records"
  ON business_equity FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'infrastructure_owner'
    )
  );