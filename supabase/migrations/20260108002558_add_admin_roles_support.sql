/*
  # הוספת תמיכה בתפקידי מנהלים

  שינויים:
  1. הוספת תפקידי admin, superadmin ו-infrastructure_owner לטבלת profiles
  2. הוספת מדיניות RLS שמאפשרת לאדמינים לגשת לכל הנתונים
  3. הוספת אינדקס לביצועים טובים יותר

  תפקידים חדשים:
    - superadmin: מנהל על עם גישה מלאה
    - admin: מנהל פלטפורמה עם גישה מלאה
    - infrastructure_owner: בעלי תשתיות עם גישה מלאה

  אבטחה:
    - מנהלים יכולים לצפות בכל הפרופילים
    - מנהלים יכולים לצפות בכל העסקים
    - מנהלים יכולים לצפות בכל ההזמנות
    - מנהלים יכולים לנהל משתמשים ותפקידים
*/

-- שלב 1: הסרת ה-CHECK constraint הקיים על role
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- שלב 2: הוספת CHECK constraint חדש שכולל את כל התפקידים
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'superadmin',
    'admin',
    'infrastructure_owner',
    'business_owner',
    'manager',
    'warehouse',
    'dispatcher',
    'sales',
    'customer_service',
    'driver',
    'customer',
    'guest'
  ));

-- שלב 3: הוספת מדיניות RLS למנהלים - Profiles
CREATE POLICY "מנהלים יכולים לצפות בכל הפרופילים"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

CREATE POLICY "מנהלים יכולים לעדכן כל פרופיל"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

CREATE POLICY "מנהלים יכולים ליצור פרופילים"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

-- שלב 4: הוספת מדיניות RLS למנהלים - Businesses
CREATE POLICY "מנהלים יכולים לצפות בכל העסקים"
  ON businesses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

CREATE POLICY "מנהלים יכולים לעדכן כל עסק"
  ON businesses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

CREATE POLICY "מנהלים יכולים ליצור עסקים"
  ON businesses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

CREATE POLICY "מנהלים יכולים למחוק עסקים"
  ON businesses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

-- שלב 5: הוספת מדיניות RLS למנהלים - User Business Roles
CREATE POLICY "מנהלים יכולים לצפות בכל התפקידים"
  ON user_business_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

CREATE POLICY "מנהלים יכולים לנהל כל התפקידים"
  ON user_business_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

CREATE POLICY "מנהלים יכולים לעדכן כל תפקיד"
  ON user_business_roles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

CREATE POLICY "מנהלים יכולים למחוק כל תפקיד"
  ON user_business_roles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'infrastructure_owner')
    )
  );

-- שלב 6: יצירת אינדקס לביצועים
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_admin_roles ON profiles(id) WHERE role IN ('superadmin', 'admin', 'infrastructure_owner');