# Fix for Infrastructure Creation RLS Issue

## Problem
Users are getting a 403 Forbidden error when trying to create businesses because the RLS policy on the `infrastructures` table is preventing INSERT operations:

```
POST https://loxoontsctworiabrcbc.supabase.co/rest/v1/infrastructures?select=* 403 (Forbidden)
❌ Failed to create infrastructure: new row violates row-level security policy for table "infrastructures"
```

## Root Cause
The current RLS policies on the `infrastructures` table are too restrictive:
- The `infrastructures_admin_manage` policy only allows `service_role` or `superadmin` to manage infrastructures
- There is no explicit INSERT policy for authenticated users
- Multiple conflicting policies from different migrations are causing confusion

## Solution
Apply the migration in `supabase/migrations/20251102000000_fix_infrastructure_insert_policy.sql` which:

1. Drops all conflicting policies
2. Creates separate, explicit policies for each operation (INSERT, SELECT, UPDATE, DELETE)
3. Allows authenticated users to INSERT new infrastructures
4. Maintains proper access control for other operations

## How to Fix

### Option 1: Apply via Supabase SQL Editor (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the SQL from `supabase/migrations/20251102000000_fix_infrastructure_insert_policy.sql`
4. Click "Run" to execute

### Option 2: Apply via Supabase CLI
```bash
cd /path/to/project
supabase db push
```

### Option 3: Manual SQL Execution
Copy this SQL and run it in your Supabase SQL Editor:

```sql
-- Fix Infrastructure Insert Policy for Business Creation

-- Drop conflicting policies
DROP POLICY IF EXISTS "infrastructures_admin_manage" ON infrastructures;
DROP POLICY IF EXISTS "authenticated_users_can_insert_infrastructures" ON infrastructures;
DROP POLICY IF EXISTS "Authenticated users can create infrastructures" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_member_select" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_owner_update" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_superadmin_delete" ON infrastructures;
DROP POLICY IF EXISTS "infrastructures_service_role_all" ON infrastructures;

-- 1. INSERT policy - Allow authenticated users to create infrastructures
CREATE POLICY "infrastructures_authenticated_insert"
  ON infrastructures
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. SELECT policy - Users can view infrastructures they have access to
CREATE POLICY "infrastructures_member_select"
  ON infrastructures
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM infrastructure_users iu
      WHERE iu.infrastructure_id = infrastructures.id
      AND iu.user_id = auth.uid()
    )
    OR auth.jwt()->>'role' IN ('superadmin', 'infrastructure_owner')
  );

-- 3. UPDATE policy - Infrastructure owners can update
CREATE POLICY "infrastructures_owner_update"
  ON infrastructures
  FOR UPDATE
  TO authenticated
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

-- 4. DELETE policy - Only superadmins
CREATE POLICY "infrastructures_superadmin_delete"
  ON infrastructures
  FOR DELETE
  TO authenticated
  USING (auth.jwt()->>'role' = 'superadmin');

-- 5. Service role has full access (for edge functions)
CREATE POLICY "infrastructures_service_role_all"
  ON infrastructures
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE infrastructures ENABLE ROW LEVEL SECURITY;
```

## After Applying the Fix
1. Refresh your application
2. Try creating a new business again
3. The infrastructure should be created successfully
4. The business creation should proceed without errors

## Security Notes
- Authenticated users can now create infrastructures (required for business onboarding flow)
- Users can only view infrastructures they have explicit access to
- Only infrastructure owners can update their infrastructures
- Only superadmins can delete infrastructures
- Service role maintains full access for system operations

## Testing
After applying the fix, test the business creation flow:
1. Click "Create Business" in the header
2. Fill in business details
3. Complete the wizard
4. Verify the business is created successfully
