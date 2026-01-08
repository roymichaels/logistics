/*
  # הוספת מדיניות RLS למנהלים לכל הטבלאות

  שינויים:
  1. הוספת מדיניות גישה למנהלים לטבלת מוצרים
  2. הוספת מדיניות גישה למנהלים לטבלת מלאי
  3. הוספת מדיניות גישה למנהלים לטבלת הזמנות
  4. הוספת מדיניות גישה למנהלים לטבלת נהגים
  5. הוספת מדיניות גישה למנהלים לטבלת אזורים
  6. הוספת מדיניות גישה למנהלים לטבלת הודעות

  אבטחה:
    - מנהלים מקבלים גישה מלאה לכל הטבלאות
    - כל מדיניות בודקת שהמשתמש הוא admin/superadmin/infrastructure_owner
*/

-- Products
CREATE POLICY "מנהלים יכולים לצפות בכל המוצרים"
  ON products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

CREATE POLICY "מנהלים יכולים לעדכן כל מוצר"
  ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

CREATE POLICY "מנהלים יכולים ליצור מוצרים"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

CREATE POLICY "מנהלים יכולים למחוק מוצרים"
  ON products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

-- Inventory
CREATE POLICY "מנהלים יכולים לצפות בכל המלאי"
  ON inventory FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

CREATE POLICY "מנהלים יכולים לעדכן כל המלאי"
  ON inventory FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

CREATE POLICY "מנהלים יכולים ליצור פריטי מלאי"
  ON inventory FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

CREATE POLICY "מנהלים יכולים למחוק פריטי מלאי"
  ON inventory FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

-- Orders
CREATE POLICY "מנהלים יכולים לצפות בכל ההזמנות"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

CREATE POLICY "מנהלים יכולים לעדכן כל הזמנה"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

CREATE POLICY "מנהלים יכולים ליצור הזמנות"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

CREATE POLICY "מנהלים יכולים למחוק הזמנות"
  ON orders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

-- Order Items
CREATE POLICY "מנהלים יכולים לצפות בכל פריטי ההזמנות"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

CREATE POLICY "מנהלים יכולים לעדכן פריטי הזמנות"
  ON order_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

CREATE POLICY "מנהלים יכולים ליצור פריטי הזמנות"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

CREATE POLICY "מנהלים יכולים למחוק פריטי הזמנות"
  ON order_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

-- Driver Profiles
CREATE POLICY "מנהלים יכולים לצפות בכל פרופילי הנהגים"
  ON driver_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

CREATE POLICY "מנהלים יכולים לעדכן פרופילי נהגים"
  ON driver_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

CREATE POLICY "מנהלים יכולים ליצור פרופילי נהגים"
  ON driver_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

-- Driver Applications
CREATE POLICY "מנהלים יכולים לצפות בכל בקשות הנהגים"
  ON driver_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

CREATE POLICY "מנהלים יכולים לעדכן בקשות נהגים"
  ON driver_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

-- Zones
CREATE POLICY "מנהלים יכולים לצפות בכל האזורים"
  ON zones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

CREATE POLICY "מנהלים יכולים לעדכן אזורים"
  ON zones FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

CREATE POLICY "מנהלים יכולים ליצור אזורים"
  ON zones FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

CREATE POLICY "מנהלים יכולים למחוק אזורים"
  ON zones FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );