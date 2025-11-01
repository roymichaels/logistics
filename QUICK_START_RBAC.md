# RBAC System - Quick Start Guide

**🚀 Get your comprehensive RBAC system up and running in 10 minutes**

---

## TL;DR

```bash
# 1. Apply database migration
supabase db push

# 2. Deploy edge functions
supabase functions deploy sync-user-claims
supabase functions deploy manage-user-role

# 3. Verify
npm run build:web

# 4. Test the flows
# - Create a business → User becomes business_owner ✅
# - Submit driver application → Admin approves → User becomes driver ✅
```

---

## Step-by-Step (10 minutes)

### Step 1: Apply Migration (2 minutes)

```bash
cd /path/to/your/project

# Apply the comprehensive RBAC migration
supabase db push
```

**Expected Output**:
```
✓ Migrations applied successfully
✓ 20251101200000_comprehensive_rbac_security_fixes.sql
```

### Step 2: Deploy Edge Functions (3 minutes)

```bash
# Deploy JWT sync function
supabase functions deploy sync-user-claims

# Deploy role management function
supabase functions deploy manage-user-role
```

**Expected Output**:
```
✓ Functions deployed successfully
```

### Step 3: Verify Build (2 minutes)

```bash
npm run build:web
```

**Expected Output**:
```
✓ built in ~13s
```

### Step 4: Test User Flows (3 minutes)

#### Test Business Owner Flow:
1. Open your app in browser
2. Sign up with a new account
3. Select "Create Business" pathway
4. Fill in business details
5. Submit
6. **✅ Verify**: You're now a business_owner with full dashboard access

#### Test Driver Flow:
1. Sign up with another account
2. Select "Become a Driver" pathway
3. Fill in driver application
4. Submit
5. Log in as admin
6. Approve the driver application
7. **✅ Verify**: Driver can now view marketplace orders

---

## What Just Happened?

### 🎯 Automatic Role Transitions
- Creating a business **automatically** promotes you to `business_owner`
- Approving a driver **automatically** promotes them to `driver`
- JWT claims sync **automatically** on role changes

### 🔒 Complete Security
- RLS policies enforce data isolation
- Business data completely protected
- Driver data scoped to individual
- Cross-business access blocked

### 📊 Full Audit Trail
- Every role change logged
- Who changed what and when
- Complete accountability

---

## Verify Everything Works

### 1. Check Database Tables

```sql
-- Verify new tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('role_changes_audit', 'user_onboarding_status');
-- Should return 2 rows ✅
```

### 2. Check Functions

```sql
-- Verify functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'promote_user_to_business_owner',
  'approve_driver_application'
);
-- Should return 2 rows ✅
```

### 3. Check RLS

```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('role_changes_audit', 'driver_profiles')
AND rowsecurity = true;
-- Should return 2 rows ✅
```

### 4. Test Edge Function

```bash
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/sync-user-claims' \
  -H 'Authorization: Bearer YOUR_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"user_id": "test-id"}'
```

**Expected**: Function responds (even if with error due to invalid ID)

---

## Common Issues & Quick Fixes

### Issue: Migration fails

**Fix**:
```bash
# Check what migrations are already applied
supabase db migrations list

# If migration already applied, you're good!
```

### Issue: Edge function not found

**Fix**:
```bash
# List deployed functions
supabase functions list

# Redeploy if missing
supabase functions deploy sync-user-claims
```

### Issue: User not promoted after business creation

**Fix**:
```sql
-- Check if trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'after_business_insert_promote';

-- If missing, re-run migration
```

### Issue: JWT claims not updating

**Fix**:
```bash
# Manually call sync function
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/sync-user-claims' \
  -H 'Authorization: Bearer YOUR_SERVICE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"user_id": "USER_ID_HERE"}'
```

---

## Next Steps

### 🎉 You're Done!
Your RBAC system is now live with:
- ✅ Automatic role promotions
- ✅ Complete security
- ✅ Full audit trails
- ✅ Seamless user experience

### 📚 Learn More
- **Full Documentation**: See `COMPREHENSIVE_RBAC_SYSTEM.md`
- **Deployment Guide**: See `RBAC_DEPLOYMENT_GUIDE.md`
- **Implementation Details**: See `IMPLEMENTATION_SUMMARY.md`

### 🔍 Monitor System
```sql
-- View recent role changes
SELECT * FROM role_changes_audit
ORDER BY created_at DESC LIMIT 10;

-- View onboarding completions
SELECT * FROM user_onboarding_status
WHERE is_complete = true
ORDER BY completed_at DESC LIMIT 10;
```

### 🛡️ Security Checklist
- [ ] RLS enabled on all tables
- [ ] Edge functions secured with service key
- [ ] Audit logs being written
- [ ] Cross-business access blocked
- [ ] Driver data properly scoped

---

## Support

**Issues?** Check:
1. `RBAC_DEPLOYMENT_GUIDE.md` - Detailed troubleshooting
2. `COMPREHENSIVE_RBAC_SYSTEM.md` - Complete system docs
3. Supabase logs - `supabase functions logs`
4. Database logs - Check PostgreSQL logs

**Questions?** Review:
- Migration file: `20251101200000_comprehensive_rbac_security_fixes.sql`
- Edge functions: `supabase/functions/sync-user-claims` and `manage-user-role`
- Test suite: `tests/rbacFlows.test.ts`

---

## Success Indicators

You know it's working when:
- ✅ Creating business promotes user to owner (check `role_changes_audit`)
- ✅ Approving driver promotes user to driver (check `driver_profiles`)
- ✅ JWT claims include role and business_id (check auth.users)
- ✅ RLS blocks unauthorized queries (test with different users)
- ✅ Audit logs show all changes (check `role_changes_audit`)

---

**Time to Deploy**: ~10 minutes
**Difficulty**: Easy
**Risk Level**: Low (full rollback available)

**Ready?** Let's go! 🚀

```bash
# One command to rule them all
supabase db push && \
supabase functions deploy sync-user-claims && \
supabase functions deploy manage-user-role && \
echo "✅ RBAC System deployed successfully!"
```
