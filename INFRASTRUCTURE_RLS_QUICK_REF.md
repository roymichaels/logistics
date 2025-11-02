# Infrastructure RLS Fix - Quick Reference

## What Was Fixed

**Problem:** Users got 403 error when creating infrastructures due to RLS policy violations

**Solution:** Consolidated conflicting policies into 5 clean policies

## Current Policy Set

```sql
-- 1. INSERT: Authenticated users can create
infra_insert (authenticated, INSERT)

-- 2. SELECT: Users with business access can view
infra_select (authenticated, SELECT)

-- 3. UPDATE: Owners/admins can modify
infra_update (authenticated, UPDATE)

-- 4. DELETE: Only superadmins can delete
infra_delete (authenticated, DELETE)

-- 5. SERVICE: Backend has full access
infra_service (service_role, ALL)
```

## Migration Applied

**File:** `supabase/migrations/20251102020000_consolidate_infrastructure_policies.sql`

**Status:** ✅ Successfully deployed

## How to Test

### Test Infrastructure Creation
```bash
# Via Supabase Client
curl -X POST https://your-project.supabase.co/rest/v1/infrastructures \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Infrastructure", "description": "Testing RLS"}'
```

Expected: HTTP 201 Created ✓

### Test Business Creation
```typescript
// 1. Create infrastructure
const { data: infra } = await supabase
  .from('infrastructures')
  .insert({ name: 'My Infrastructure' })
  .select()
  .single();

// 2. Create business
const { data: business } = await supabase
  .from('businesses')
  .insert({
    name: 'My Business',
    infrastructure_id: infra.id
  })
  .select()
  .single();
```

Expected: Both succeed ✓

## Verification Commands

### Check Policy Count
```sql
SELECT COUNT(*) FROM pg_policies WHERE tablename = 'infrastructures';
-- Expected: 5
```

### List Active Policies
```sql
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'infrastructures'
ORDER BY policyname;
```

### View Policy Definitions
```sql
SELECT p.polname,
       pg_get_expr(p.polqual, p.polrelid) as using_clause
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
WHERE c.relname = 'infrastructures';
```

## Key Points

1. **Authenticated users CAN create infrastructures** (breaks circular dependency)
2. **Users can view infrastructures for businesses they're in**
3. **No references to non-existent tables** (fixed `infrastructure_users` issue)
4. **Service role has full access** (edge functions work)
5. **Security maintained** (proper authorization checks)

## Troubleshooting

### If INSERT still fails:
```sql
-- Check if user is authenticated
SELECT auth.uid(), auth.role();
-- Should return your user ID and 'authenticated'
```

### If SELECT returns empty:
```sql
-- Check business membership
SELECT * FROM user_business_roles WHERE user_id = auth.uid();
-- Or check global role
SELECT global_role FROM users WHERE id = auth.uid();
```

### If policies are missing:
```bash
# Re-apply migration
psql -f supabase/migrations/20251102020000_consolidate_infrastructure_policies.sql
```

## Files Changed

- ✅ Created: `supabase/migrations/20251102020000_consolidate_infrastructure_policies.sql`
- ✅ Created: `INFRASTRUCTURE_RLS_FIX_COMPLETE.md` (detailed docs)
- ✅ Created: `INFRASTRUCTURE_RLS_QUICK_REF.md` (this file)

## Status

- [x] Root cause identified
- [x] Migration created and tested
- [x] Policies consolidated (5 total)
- [x] Build verified (✓)
- [x] Documentation complete

**Ready for use** ✅

---

For detailed analysis, see: `INFRASTRUCTURE_RLS_FIX_COMPLETE.md`
