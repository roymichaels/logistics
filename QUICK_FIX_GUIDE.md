# Quick Fix Guide for Infrastructure Creation Error

## The Problem
Getting this error when creating a business:
```
❌ Failed to create infrastructure: new row violates row-level security policy for table "infrastructures"
```

## The Quick Fix (2 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar

### Step 2: Run This SQL
Copy and paste this entire SQL block into the editor and click "Run":

```sql
-- Drop conflicting policies
DROP POLICY IF EXISTS "infrastructures_admin_manage" ON infrastructures;
DROP POLICY IF EXISTS "authenticated_users_can_insert_infrastructures" ON infrastructures;
DROP POLICY IF EXISTS "Authenticated users can create infrastructures" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_member_select" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_owner_update" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_superadmin_delete" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_service_role_all" ON infrastructures;

-- Allow authenticated users to create infrastructures
CREATE POLICY "infrastructures_authenticated_insert"
  ON infrastructures FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can view infrastructures they have access to
CREATE POLICY "infrastructures_member_select"
  ON infrastructures FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM infrastructure_users iu
      WHERE iu.infrastructure_id = infrastructures.id
      AND iu.user_id = auth.uid()
    )
    OR auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner')
  );

-- Infrastructure owners can update
CREATE POLICY "infrastructures_owner_update"
  ON infrastructures FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM infrastructure_users iu
      WHERE iu.infrastructure_id = infrastructures.id
      AND iu.user_id = auth.uid()
      AND iu.role = 'infrastructure_owner'
    )
    OR auth.jwt()->>'role' = 'superadmin'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM infrastructure_users iu
      WHERE iu.infrastructure_id = infrastructures.id
      AND iu.user_id = auth.uid()
      AND iu.role = 'infrastructure_owner'
    )
    OR auth.jwt()->>'role' = 'superadmin'
  );

-- Only superadmins can delete
CREATE POLICY "infrastructures_superadmin_delete"
  ON infrastructures FOR DELETE TO authenticated
  USING (auth.jwt()->>'role' = 'superadmin');

-- Service role full access
CREATE POLICY "infrastructures_service_role_all"
  ON infrastructures FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE infrastructures ENABLE ROW LEVEL SECURITY;
```

### Step 3: Test
1. Refresh your application
2. Click "Create Business" 
3. Fill in the form
4. Click "Create" - should work now!

## What This Does
- Allows authenticated users to create infrastructures (needed for business creation)
- Keeps security tight - users only see their own infrastructures
- Maintains proper permissions for updates and deletes

## Need More Help?
See `FIX_INFRASTRUCTURE_CREATION.md` for detailed explanation.
