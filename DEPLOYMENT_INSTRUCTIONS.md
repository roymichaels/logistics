# Business Creation Role Assignment Fix - Deployment Instructions

## Overview

This deployment fixes critical issues with business creation where users' roles were not being updated from 'user' to 'business_owner', and database errors were occurring during the process.

## ✅ Implementation Status

All code changes have been implemented and the build is passing successfully.

### Files Modified:
1. ✅ Database Migration: `supabase/migrations/20251102050000_fix_business_memberships_and_role_assignment.sql`
2. ✅ Edge Function: `supabase/functions/create-business/index.ts`
3. ✅ Edge Function: `supabase/functions/switch-context/index.ts`
4. ✅ Edge Function: `supabase/functions/sync-user-claims/index.ts`
5. ✅ Frontend Service: `src/services/business.ts`
6. ✅ Frontend Component: `src/components/CreateBusinessModal.tsx`
7. ✅ Build Status: PASSING

## Deployment Steps

### Step 1: Database Migration

**Apply the migration to create the business_memberships view and triggers:**

```bash
# Using Supabase CLI
supabase db push

# Or using direct SQL
psql -d YOUR_DATABASE_URL -f supabase/migrations/20251102050000_fix_business_memberships_and_role_assignment.sql
```

**Verify migration success:**

```sql
-- Check if view exists
SELECT COUNT(*) as view_exists
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'business_memberships';
-- Should return 1

-- Check if trigger exists
SELECT COUNT(*) as trigger_exists
FROM pg_trigger
WHERE tgname = 'trigger_sync_business_role_to_jwt';
-- Should return 1

-- Test the view
SELECT * FROM business_memberships LIMIT 1;
-- Should return rows without errors

-- Check custom_roles table
SELECT COUNT(*) as table_exists
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'custom_roles';
-- Should return 1
```

### Step 2: Deploy Edge Functions

**Deploy all three updated Edge Functions:**

```bash
# Deploy create-business function
supabase functions deploy create-business

# Deploy switch-context function
supabase functions deploy switch-context

# Deploy sync-user-claims function
supabase functions deploy sync-user-claims
```

**Verify Edge Functions are deployed:**

```bash
# List deployed functions
supabase functions list

# Test create-business function
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/create-business' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Test Business",
    "name_hebrew": "עסק בדיקה"
  }'
# Should return success response with owner_role_assigned: true
```

### Step 3: Deploy Frontend

**Build and deploy the frontend code:**

```bash
# Build the project
npm run build:web

# Deploy to your hosting platform
# (commands depend on your hosting provider)
# Examples:
# Netlify: netlify deploy --prod
# Vercel: vercel --prod
# AWS S3: aws s3 sync dist/ s3://your-bucket/
```

### Step 4: Verification

**After deployment, verify the complete flow:**

#### Test 1: Business Creation
1. Login to the application
2. Create a new business
3. Verify:
   - Business is created successfully
   - No errors in browser console
   - No CORS errors
   - Success message appears

#### Test 2: Role Assignment
Check the database to verify role was assigned:

```sql
-- Replace USER_ID and BUSINESS_ID with actual values
SELECT
  u.id as user_id,
  u.global_role,
  ubr.role_id,
  r.role_key,
  bm.display_role_key
FROM users u
LEFT JOIN user_business_roles ubr ON ubr.user_id = u.id
LEFT JOIN roles r ON r.id = ubr.role_id
LEFT JOIN business_memberships bm ON bm.user_id = u.id
WHERE u.id = 'USER_ID';

-- Expected results:
-- global_role: business_owner
-- role_key: business_owner
-- display_role_key: business_owner
```

#### Test 3: JWT Claims
Check if JWT includes business_role:

```sql
SELECT raw_app_metadata
FROM auth.users
WHERE id = 'USER_ID';

-- Expected in app_metadata:
-- {
--   "role": "business_owner",
--   "business_id": "...",
--   "business_role": "business_owner",
--   "infrastructure_id": "..."
-- }
```

#### Test 4: Context Switching
1. Switch to the newly created business
2. Verify no errors occur
3. Check that permissions work correctly
4. Verify business owner features are accessible

## What This Fixes

### Before:
- ❌ Business created but user role stayed as 'user'
- ❌ Database errors: "column roles_1.name does not exist"
- ❌ JWT claims missing business_role
- ❌ Frontend using direct DB insertion bypassing proper flow
- ❌ No session refresh after business creation

### After:
- ✅ User's global_role automatically updated to 'business_owner'
- ✅ business_memberships view resolves roles correctly
- ✅ JWT claims include business_role from business_memberships
- ✅ Frontend uses Edge Function for proper flow
- ✅ Session refreshes automatically with new claims
- ✅ Triggers ensure all related records are created

## Rollback Instructions

If you need to rollback:

### 1. Rollback Database Migration

```sql
-- Drop the trigger
DROP TRIGGER IF EXISTS trigger_sync_business_role_to_jwt ON user_business_roles;
DROP FUNCTION IF EXISTS sync_business_role_to_jwt();

-- Drop the view
DROP VIEW IF EXISTS business_memberships;

-- Drop helper functions
DROP FUNCTION IF EXISTS get_user_business_role(uuid, uuid);
DROP FUNCTION IF EXISTS get_user_permissions(uuid, uuid);

-- Optionally drop custom_roles table if no data
-- DROP TABLE IF EXISTS custom_roles CASCADE;
```

### 2. Rollback Edge Functions

Re-deploy previous versions from git history:

```bash
# Checkout previous version
git checkout PREVIOUS_COMMIT -- supabase/functions/create-business/
git checkout PREVIOUS_COMMIT -- supabase/functions/switch-context/
git checkout PREVIOUS_COMMIT -- supabase/functions/sync-user-claims/

# Deploy old versions
supabase functions deploy create-business
supabase functions deploy switch-context
supabase functions deploy sync-user-claims
```

### 3. Rollback Frontend

```bash
# Checkout previous version
git checkout PREVIOUS_COMMIT -- src/services/business.ts
git checkout PREVIOUS_COMMIT -- src/components/CreateBusinessModal.tsx

# Rebuild and redeploy
npm run build:web
# Deploy to hosting
```

## Monitoring

After deployment, monitor:

### Metrics to Watch:
- Business creation success rate (should be near 100%)
- Edge Function error rates (should be low)
- Role assignment success rate (check database)
- Session refresh failures (check logs)

### Where to Look:
1. **Supabase Dashboard** → Functions → Logs
2. **Browser Console** → Check for errors during business creation
3. **Database Logs** → Check for trigger execution
4. **Application Logs** → Monitor user reports

### Expected Metrics:
- Business creation time: 1-2 seconds
- JWT sync: Automatic (happens in Edge Function)
- Session refresh: ~300-500ms
- Zero "roles_1.name does not exist" errors

## Common Issues and Solutions

### Issue 1: View Not Found Error
**Symptom:** "relation 'business_memberships' does not exist"

**Solution:**
```sql
-- Manually create the view
-- Copy and paste the CREATE VIEW statement from the migration file
```

### Issue 2: Trigger Not Firing
**Symptom:** User role not updating after business creation

**Solution:**
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'trigger_sync_business_role_to_jwt';

-- If missing, recreate it:
-- Copy and paste the CREATE TRIGGER statement from the migration file
```

### Issue 3: JWT Not Updating
**Symptom:** Business role not appearing in JWT claims

**Solution:**
1. Check Edge Function logs for errors
2. Manually call sync-user-claims:
```bash
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/sync-user-claims' \
  -H 'Authorization: Bearer USER_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"user_id": "USER_ID", "business_id": "BUSINESS_ID"}'
```
3. Have user logout and login again

### Issue 4: Session Refresh Fails
**Symptom:** Warning in console about session refresh

**Solution:**
- This is non-fatal
- User can manually refresh page
- Check Supabase service status
- Verify environment variables are correct

## Testing Checklist

Before considering deployment complete:

- [ ] Migration applied successfully
- [ ] All three Edge Functions deployed
- [ ] Frontend built and deployed
- [ ] Test business creation works
- [ ] Verify user role updates in database
- [ ] Check JWT claims include business_role
- [ ] Test context switching to new business
- [ ] Verify no CORS errors
- [ ] Check no database query errors
- [ ] Monitor for 24 hours

## Documentation Updated

- [x] BUSINESS_CREATION_ROLE_FIX_COMPLETE.md - Complete implementation details
- [x] DEPLOYMENT_INSTRUCTIONS.md - This file
- [x] Migration file includes inline documentation
- [x] Edge Functions have inline comments

## Support

If issues occur:

1. Check Supabase Dashboard → Functions → Logs
2. Check browser console for errors
3. Run verification SQL queries above
4. Review BUSINESS_CREATION_ROLE_FIX_COMPLETE.md for detailed troubleshooting
5. Check git history for exact changes made

## Success Criteria

Deployment is successful when:

✅ Business creation completes in 1-2 seconds
✅ User's global_role becomes 'business_owner'
✅ JWT claims include business_role
✅ No CORS errors in console
✅ No database query errors
✅ Context switching works
✅ Business owner features accessible immediately
✅ No user reports of issues

---

**Deployment Date:** _To be filled when deployed_
**Deployed By:** _To be filled when deployed_
**Environment:** _Production / Staging_
**Status:** ✅ Ready for Deployment
