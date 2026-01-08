/*
  # הוספת מדיניות RLS למנהלים לטבלאות נוספות

  שינויים:
  1. הוספת מדיניות גישה למנהלים לטבלת audit_logs (אם קיימת)
  2. הוספת מדיניות גישה למנהלים לטבלת feature_flags (אם קיימת)
  3. הוספת מדיניות גישה למנהלים לטבלת messages/conversations
  4. הוספת מדיניות גישה למנהלים לטבלת assignments

  אבטחה:
    - מנהלים מקבלים גישה מלאה לכל הטבלאות
*/

-- Audit Logs (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
    EXECUTE 'CREATE POLICY "מנהלים יכולים לצפות בכל יומני הביקורת"
      ON audit_logs FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN (''superadmin'', ''admin'', ''infrastructure_owner'')
        )
      )';
  END IF;
END $$;

-- Feature Flags (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'feature_flags') THEN
    EXECUTE 'CREATE POLICY "מנהלים יכולים לצפות בכל דגלי התכונות"
      ON feature_flags FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN (''superadmin'', ''admin'', ''infrastructure_owner'')
        )
      )';

    EXECUTE 'CREATE POLICY "מנהלים יכולים לעדכן דגלי תכונות"
      ON feature_flags FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN (''superadmin'', ''admin'', ''infrastructure_owner'')
        )
      )';

    EXECUTE 'CREATE POLICY "מנהלים יכולים ליצור דגלי תכונות"
      ON feature_flags FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN (''superadmin'', ''admin'', ''infrastructure_owner'')
        )
      )';

    EXECUTE 'CREATE POLICY "מנהלים יכולים למחוק דגלי תכונות"
      ON feature_flags FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN (''superadmin'', ''admin'', ''infrastructure_owner'')
        )
      )';
  END IF;
END $$;

-- Assignments (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assignments') THEN
    EXECUTE 'CREATE POLICY "מנהלים יכולים לצפות בכל השיבוצים"
      ON assignments FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN (''superadmin'', ''admin'', ''infrastructure_owner'')
        )
      )';

    EXECUTE 'CREATE POLICY "מנהלים יכולים לעדכן שיבוצים"
      ON assignments FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN (''superadmin'', ''admin'', ''infrastructure_owner'')
        )
      )';

    EXECUTE 'CREATE POLICY "מנהלים יכולים ליצור שיבוצים"
      ON assignments FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN (''superadmin'', ''admin'', ''infrastructure_owner'')
        )
      )';

    EXECUTE 'CREATE POLICY "מנהלים יכולים למחוק שיבוצים"
      ON assignments FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN (''superadmin'', ''admin'', ''infrastructure_owner'')
        )
      )';
  END IF;
END $$;

-- Conversations (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations') THEN
    EXECUTE 'CREATE POLICY "מנהלים יכולים לצפות בכל השיחות"
      ON conversations FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN (''superadmin'', ''admin'', ''infrastructure_owner'')
        )
      )';
  END IF;
END $$;

-- Messages (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    EXECUTE 'CREATE POLICY "מנהלים יכולים לצפות בכל ההודעות"
      ON messages FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN (''superadmin'', ''admin'', ''infrastructure_owner'')
        )
      )';
  END IF;
END $$;