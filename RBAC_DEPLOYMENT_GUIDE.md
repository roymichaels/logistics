# RBAC System Deployment Guide

## Quick Start

This guide will help you deploy the comprehensive RBAC and security enhancements to your production system.

---

## Pre-Deployment Checklist

### 1. Backup Current Database
```bash
# Create a full database backup before making changes
supabase db dump -f backup_before_rbac_$(date +%Y%m%d).sql
```

### 2. Review Migration File
- Location: `supabase/migrations/20251101200000_comprehensive_rbac_security_fixes.sql`
- Review the changes it will make
- Verify it aligns with your requirements

### 3. Test in Staging
- Deploy to a staging environment first
- Test all user flows
- Verify RLS policies work correctly

---

## Deployment Steps

### Step 1: Apply Database Migration

```bash
# Navigate to project directory
cd /path/to/project

# Apply migration to database
supabase db push

# Verify migration applied successfully
supabase db migrations list
```

**Expected Output**:
```
✓ 20251101200000_comprehensive_rbac_security_fixes.sql applied
```

**Verify Tables Created**:
```sql
-- Check new tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'role_changes_audit',
  'user_onboarding_status'
);
-- Should return 2 rows
```

**Verify Functions Created**:
```sql
-- Check functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'promote_user_to_business_owner',
  'approve_driver_application',
  'validate_business_access',
  'user_has_permission'
);
-- Should return 4 rows
```

**Verify Triggers Created**:
```sql
-- Check trigger exists
SELECT tgname FROM pg_trigger
WHERE tgname = 'after_business_insert_promote';
-- Should return 1 row
```

---

### Step 2: Deploy Edge Functions

#### Deploy sync-user-claims
```bash
supabase functions deploy sync-user-claims
```

**Test the function**:
```bash
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/sync-user-claims' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"user_id": "test-user-id"}'
```

#### Deploy manage-user-role
```bash
supabase functions deploy manage-user-role
```

**Test the function**:
```bash
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/manage-user-role' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id": "test-user-id",
    "new_role": "business_owner",
    "reason": "Testing role change"
  }'
```

---

### Step 3: Verify RLS Policies

```sql
-- Check that all tables have RLS enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false;
-- Should return 0 rows (all tables have RLS)

-- Check policies exist on new tables
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'role_changes_audit',
  'user_onboarding_status',
  'driver_profiles',
  'driver_applications'
);
-- Should return multiple policy rows
```

---

### Step 4: Test User Flows

#### Test 1: Business Owner Creation Flow
```sql
-- 1. Create test user
INSERT INTO auth.users (id, email)
VALUES (gen_random_uuid(), 'test@example.com');

-- Get the user ID
SELECT id FROM auth.users WHERE email = 'test@example.com';

-- 2. Create business as that user
INSERT INTO businesses (
  name,
  name_hebrew,
  business_type,
  order_number_prefix,
  created_by
) VALUES (
  'Test Business',
  'עסק לבדיקה',
  'logistics',
  'TEST',
  'USER_ID_FROM_ABOVE'
);

-- 3. Verify user was promoted to business_owner
SELECT global_role FROM users WHERE id = 'USER_ID_FROM_ABOVE';
-- Should return: business_owner

-- 4. Verify user_business_roles record created
SELECT * FROM user_business_roles WHERE user_id = 'USER_ID_FROM_ABOVE';
-- Should have ownership_percentage = 100

-- 5. Verify role change was audited
SELECT * FROM role_changes_audit WHERE user_id = 'USER_ID_FROM_ABOVE';
-- Should show: user -> business_owner

-- 6. Clean up test data
DELETE FROM businesses WHERE name = 'Test Business';
DELETE FROM auth.users WHERE email = 'test@example.com';
```

#### Test 2: Driver Application Flow
```sql
-- 1. Create test user
INSERT INTO auth.users (id, email)
VALUES (gen_random_uuid(), 'driver@example.com');

-- Get user ID
SELECT id FROM auth.users WHERE email = 'driver@example.com';

-- 2. Create driver application
INSERT INTO driver_applications (
  user_id,
  application_data,
  status
) VALUES (
  'USER_ID_FROM_ABOVE',
  '{"vehicle_type": "car", "license_number": "12345"}',
  'pending'
);

-- Get application ID
SELECT id FROM driver_applications WHERE user_id = 'USER_ID_FROM_ABOVE';

-- 3. Approve application
SELECT approve_driver_application(
  'APPLICATION_ID_FROM_ABOVE',
  'ADMIN_USER_ID',
  'Approved for testing'
);

-- 4. Verify user role changed to driver
SELECT global_role FROM users WHERE id = 'USER_ID_FROM_ABOVE';
-- Should return: driver

-- 5. Verify driver profile is active
SELECT is_active, verification_status
FROM driver_profiles
WHERE user_id = 'USER_ID_FROM_ABOVE';
-- Should return: is_active=true, verification_status=verified

-- 6. Clean up
DELETE FROM driver_applications WHERE user_id = 'USER_ID_FROM_ABOVE';
DELETE FROM auth.users WHERE email = 'driver@example.com';
```

---

### Step 5: Verify JWT Claims Sync

```sql
-- Check that app_metadata is being set correctly
SELECT
  id,
  email,
  raw_app_meta_data->>'role' as role,
  raw_app_meta_data->>'business_id' as business_id
FROM auth.users
WHERE email IN ('test@example.com', 'driver@example.com');
-- Should show role and business_id in app_metadata
```

---

### Step 6: Monitor Audit Logs

```sql
-- Check recent role changes
SELECT
  user_id,
  old_role,
  new_role,
  change_reason,
  created_at
FROM role_changes_audit
ORDER BY created_at DESC
LIMIT 10;

-- Check system audit log for role-related events
SELECT
  actor_id,
  action,
  entity_table,
  metadata,
  created_at
FROM system_audit_log
WHERE action LIKE '%role%'
ORDER BY created_at DESC
LIMIT 10;

-- Check onboarding completions
SELECT
  user_id,
  onboarding_type,
  is_complete,
  completed_at
FROM user_onboarding_status
WHERE is_complete = true
ORDER BY completed_at DESC
LIMIT 10;
```

---

## Post-Deployment Verification

### 1. Functional Tests

**Business Owner Flow**:
- [ ] New user can sign up
- [ ] User can create a business
- [ ] User is automatically promoted to business_owner
- [ ] User sees business dashboard
- [ ] User has full business permissions

**Driver Flow**:
- [ ] User can submit driver application
- [ ] Application appears in admin panel
- [ ] Admin can approve application
- [ ] User is promoted to driver role
- [ ] Driver can view marketplace orders

**Data Isolation**:
- [ ] Business owner A cannot access business B data
- [ ] Driver cannot see business internal data
- [ ] Manager cannot view other businesses
- [ ] RLS blocks unauthorized queries

### 2. Security Verification

```sql
-- Test RLS is working
-- Create test user with minimal permissions
INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'limited@example.com');

-- Try to access data from other businesses (should fail or return empty)
-- Set session to this user and run queries

-- Verify cross-business access is blocked
SELECT * FROM orders WHERE business_id != 'CURRENT_USER_BUSINESS_ID';
-- Should return 0 rows due to RLS
```

### 3. Performance Check

```sql
-- Check index usage on new tables
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN (
  'role_changes_audit',
  'user_onboarding_status',
  'driver_profiles',
  'driver_applications'
);
-- Should show multiple indexes

-- Check query performance
EXPLAIN ANALYZE
SELECT * FROM role_changes_audit WHERE user_id = 'some-uuid';
-- Should use index scan, not sequential scan
```

---

## Rollback Plan

If you encounter issues, you can rollback the migration:

### Step 1: Restore Database Backup
```bash
# Restore from backup created earlier
psql DATABASE_URL < backup_before_rbac_YYYYMMDD.sql
```

### Step 2: Remove Edge Functions
```bash
supabase functions delete sync-user-claims
supabase functions delete manage-user-role
```

### Step 3: Revert Code Changes
```bash
git revert HEAD  # If changes were committed
# Or manually restore files from backup
```

---

## Monitoring and Alerts

### Set Up Monitoring

1. **Role Change Alerts**
```sql
-- Create a view for unusual role changes
CREATE VIEW suspicious_role_changes AS
SELECT *
FROM role_changes_audit
WHERE
  (old_role = 'user' AND new_role IN ('infrastructure_owner', 'superadmin'))
  OR (change_reason IS NULL)
  OR (created_at > now() - interval '1 hour' AND changed_by IS NULL);
```

2. **Permission Check Failures**
```sql
-- Monitor failed permission checks
SELECT COUNT(*) as failed_checks
FROM permission_check_failures
WHERE created_at > now() - interval '1 day';
```

3. **Audit Log Growth**
```sql
-- Check audit log size and growth rate
SELECT
  COUNT(*) as total_entries,
  MIN(created_at) as oldest_entry,
  MAX(created_at) as newest_entry
FROM role_changes_audit;
```

### Configure Alerts

Set up alerts for:
- Unexpected role promotions
- High volume of permission failures
- Cross-business access attempts
- Service role usage spikes
- Failed driver approvals

---

## Troubleshooting

### Issue: Business owner not promoted after business creation

**Diagnostic**:
```sql
-- Check if trigger exists and is enabled
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'after_business_insert_promote';

-- Check recent business creations
SELECT id, name, created_by, created_at
FROM businesses
ORDER BY created_at DESC
LIMIT 5;

-- Check if role_changes_audit has entries
SELECT * FROM role_changes_audit
WHERE business_id = 'BUSINESS_ID_HERE';
```

**Solution**:
```sql
-- Manually promote user if needed
SELECT promote_user_to_business_owner(
  'USER_ID',
  'BUSINESS_ID',
  'ADMIN_ID' -- or USER_ID if self-promotion
);
```

### Issue: JWT claims not updating

**Diagnostic**:
```bash
# Check edge function logs
supabase functions logs sync-user-claims --tail 50

# Check auth.users metadata
SELECT id, email, raw_app_meta_data
FROM auth.users
WHERE id = 'USER_ID';
```

**Solution**:
```bash
# Manually invoke sync function
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/sync-user-claims' \
  -H 'Authorization: Bearer YOUR_SERVICE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"user_id": "USER_ID_HERE"}'
```

### Issue: RLS blocking legitimate queries

**Diagnostic**:
```sql
-- Check user's JWT claims
SELECT auth.jwt();

-- Check what policies are defined
SELECT * FROM pg_policies WHERE tablename = 'TABLENAME';

-- Test with service_role to see if data exists
-- (This bypasses RLS)
```

**Solution**:
- Ensure user has correct role in JWT
- Verify business_id is set in JWT claims
- Call sync-user-claims to refresh JWT
- Check if RLS policy logic is correct

---

## Success Criteria

Your deployment is successful when:

- ✅ All migrations applied without errors
- ✅ Edge functions deployed and responding
- ✅ Business creation promotes users to owner
- ✅ Driver approval promotes users to driver
- ✅ JWT claims sync automatically
- ✅ RLS blocks unauthorized access
- ✅ Audit logs capture all role changes
- ✅ Build passes without errors
- ✅ No performance degradation
- ✅ All tests pass

---

## Next Steps

After successful deployment:

1. **Update Documentation**
   - Share COMPREHENSIVE_RBAC_SYSTEM.md with team
   - Document any custom modifications
   - Update API documentation

2. **Train Team**
   - Explain new role system to administrators
   - Train support team on troubleshooting
   - Update user onboarding guides

3. **Monitor System**
   - Set up regular audit log reviews
   - Monitor performance metrics
   - Track role change patterns

4. **Plan Phase 2 Enhancements**
   - Multi-factor authentication
   - Advanced permission inheritance
   - Blockchain-based verification
   - AI-powered anomaly detection

---

## Support

If you encounter issues:

1. Check troubleshooting section above
2. Review audit logs for clues
3. Test with service_role to isolate RLS issues
4. Check edge function logs
5. Verify migration was applied completely

For additional help, consult:
- COMPREHENSIVE_RBAC_SYSTEM.md
- Supabase documentation
- PostgreSQL RLS guides

---

**Deployment Date**: _________________

**Deployed By**: _________________

**Rollback Plan Verified**: ☐ Yes ☐ No

**Success Criteria Met**: ☐ Yes ☐ No

**Notes**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
