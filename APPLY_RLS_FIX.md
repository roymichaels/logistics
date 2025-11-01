# How to Apply the RLS Fix

## Quick Start

The RLS policy fix has been implemented. Here's how to apply it to your Supabase database:

## Option 1: Automatic Deployment (Recommended)

The migration file is already in place:
```
supabase/migrations/20251101030000_fix_users_rls_for_authenticated_inserts.sql
```

It will be automatically applied when you:
1. Push to your Git repository (if using CI/CD)
2. Run Supabase migrations manually

## Option 2: Manual Application via Supabase CLI

```bash
# Make sure you're in the project directory
cd /path/to/project

# Login to Supabase (if not already logged in)
npx supabase login

# Link to your project (if not already linked)
npx supabase link --project-ref YOUR_PROJECT_REF

# Apply the migration
npx supabase db push
```

## Option 3: Apply via Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/20251101030000_fix_users_rls_for_authenticated_inserts.sql`
4. Paste into the SQL Editor
5. Click **Run**

## Verification

After applying the migration, verify it worked:

### Check Policies
```sql
-- Run this in Supabase SQL Editor
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;
```

You should see these 4 policies:
1. `users_insert_own` - INSERT policy
2. `users_select_own` - SELECT policy
3. `users_service_role_all` - Service role bypass
4. `users_update_own` - UPDATE policy

### Test Authentication

1. Open your app in Telegram Mini App
2. Check browser console for these messages:
   ```
   ✅ UserHomepage: Authentication verified, session ready
   📥 UserHomepage: Loading user profile...
   ✅ UserHomepage: Profile loaded successfully
   ```

3. If you see this error, the migration was not applied:
   ```
   ❌ getProfile: Database error: new row violates row-level security policy
   ```

## Troubleshooting

### Migration Already Applied Error

If you see "already applied", that's fine - the migration was applied.

### Permission Denied

Make sure you're using an admin account or service role key.

### Old Policies Still Present

If old policies weren't dropped, manually drop them:

```sql
-- Run in Supabase SQL Editor
DROP POLICY IF EXISTS "Users can read own data by any identifier" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated and service_role to insert users" ON public.users;
-- ... (see migration file for complete list)
```

Then re-run the migration.

## Rollback (Emergency)

If you need to rollback:

```sql
-- Restore basic policies (RUN THIS ONLY IF NEEDED)
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_service_role_all" ON public.users;

-- Create basic SELECT policy
CREATE POLICY "users_basic_select"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Create service role bypass
CREATE POLICY "users_service_all"
  ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

## Next Steps

After applying the fix:
1. Test Telegram authentication thoroughly
2. Test Web3 wallet authentication (if using)
3. Monitor error logs for any RLS violations
4. Update team documentation if needed

## Support

If issues persist after applying the migration:
1. Check Supabase logs for RLS violations
2. Verify JWT claims are present in auth tokens
3. Review `RLS_FIX_SUMMARY.md` for detailed explanation
4. Check that edge functions (telegram-verify, web3-verify) are working

## Important Notes

- ⚠️ This migration changes RLS policies - test in staging first if available
- ✅ The migration is idempotent - safe to run multiple times
- 🔒 Security is improved - policies are simpler and more secure
- 📝 No data migration needed - only policy changes
