# Business Creation Fix - Testing Checklist

## Pre-Deployment Tests

### 1. Database Migration Testing

```sql
-- Run migration on test database
\i supabase/migrations/20251102040000_fix_business_creation_complete_flow.sql

-- Verify triggers created
SELECT
  tgname as trigger_name,
  tgenabled as enabled,
  tgtype as type
FROM pg_trigger
WHERE tgrelid = 'businesses'::regclass
  AND tgname LIKE '%business%';

-- Expected output:
-- trigger_create_business_owner_role | O | AFTER INSERT
-- trigger_create_business_context     | O | AFTER INSERT

-- Verify helper function exists
SELECT proname, pronargs
FROM pg_proc
WHERE proname IN ('create_business_owner_role', 'create_business_context', 'create_business_with_owner');

-- Check backfill results
SELECT COUNT(*) as businesses_with_owner_role
FROM businesses b
JOIN user_business_roles ubr ON b.id = ubr.business_id AND b.created_by = ubr.user_id;

SELECT COUNT(*) as businesses_with_context
FROM businesses b
JOIN user_business_contexts ubc ON b.created_by = ubc.user_id;
```

### 2. Edge Function Testing

```bash
# Test sync-user-claims with valid data
curl -X POST 'http://localhost:54321/functions/v1/sync-user-claims' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "VALID_USER_ID",
    "business_id": "VALID_BUSINESS_ID"
  }'

# Expected: {"success": true, "claims": {...}}

# Test with invalid user_id
curl -X POST 'http://localhost:54321/functions/v1/sync-user-claims' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "00000000-0000-0000-0000-000000000000"
  }'

# Expected: {"success": false, "error": "User not found"}

# Test with missing user_id
curl -X POST 'http://localhost:54321/functions/v1/sync-user-claims' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: {"success": false, "error": "user_id is required"}
```

### 3. Frontend Testing

#### Test Business Creation Flow
1. Navigate to business onboarding
2. Fill in business details:
   - Business Name (English): "Test Business"
   - Business Name (Hebrew): "עסק בדיקה"
   - Order Prefix: "TST"
3. Choose color scheme
4. Click "Create Business"
5. Wait for completion

**Expected Results:**
- Progress indicator shows "Creating business..."
- No errors displayed
- Success message: "העסק נוצר בהצלחה!"
- Redirect to dashboard
- User can access new business immediately

**Browser Console Checks:**
```javascript
// Should see these logs:
// ✅ createBusiness: Created business: <business_id>
// 🔄 Syncing JWT claims (attempt 1/4)...
// ✅ JWT claims synced successfully
// 🔄 Refreshing user session...
// ✅ Session refreshed successfully
```

#### Test Error Scenarios

**Test Network Failure:**
1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Try to create business
4. Expected: Retry attempts visible in console
5. Expected: User-friendly error message in Hebrew

**Test Validation Errors:**
1. Try to create business with:
   - Empty business name → "חובה להזין שם עסק באנגלית"
   - Short order prefix (1 char) → "הקידומת חייבת להיות בין 2-4 תווים"
   - Invalid characters in prefix → "הקידומת יכולה להכיל רק אותיות אנגליות גדולות ומספרים"

## Post-Deployment Verification

### 4. Database Record Verification

```sql
-- After creating test business, verify all records exist

-- 1. Check business was created
SELECT id, name, name_hebrew, created_by, infrastructure_id
FROM businesses
WHERE id = 'NEW_BUSINESS_ID';

-- 2. Check user_business_roles was auto-created
SELECT
  ubr.user_id,
  ubr.business_id,
  ubr.ownership_percentage,
  ubr.is_primary,
  r.role_key
FROM user_business_roles ubr
LEFT JOIN roles r ON ubr.role_id = r.id
WHERE ubr.business_id = 'NEW_BUSINESS_ID';

-- Expected: 1 row with ownership_percentage = 100, is_primary = true, role_key = 'business_owner'

-- 3. Check user_business_contexts was auto-created
SELECT
  user_id,
  business_id,
  infrastructure_id,
  updated_at
FROM user_business_contexts
WHERE business_id = 'NEW_BUSINESS_ID';

-- Expected: 1 row with matching business_id and infrastructure_id

-- 4. Check JWT claims in auth.users
SELECT
  id,
  email,
  raw_app_metadata->'role' as role,
  raw_app_metadata->'business_id' as business_id,
  raw_app_metadata->'primary_business_id' as primary_business_id,
  raw_app_metadata->'ownership_percentage' as ownership
FROM auth.users
WHERE id = 'CREATOR_USER_ID';

-- Expected: business_id and ownership_percentage should be set

-- 5. Check audit log
SELECT *
FROM system_audit_log
WHERE actor_id = 'CREATOR_USER_ID'
  AND action = 'jwt_claims_synced'
ORDER BY created_at DESC
LIMIT 1;

-- Expected: Recent entry with claims in metadata
```

### 5. Performance Testing

```javascript
// Measure business creation time
console.time('business-creation');
await dataStore.createBusiness({
  name: 'Performance Test',
  name_hebrew: 'בדיקת ביצועים',
  business_type: 'logistics',
  order_number_prefix: 'PERF',
  default_currency: 'ILS',
  primary_color: '#1a1a2e',
  secondary_color: '#16213e'
});
console.timeEnd('business-creation');

// Expected: < 5 seconds total
// Typical: 1-2 seconds
```

### 6. Retry Logic Testing

Simulate sync failure to test retry:
```sql
-- Temporarily break sync by removing business_owner role
DELETE FROM roles WHERE role_key = 'business_owner';

-- Try creating business (should retry 3 times)
-- Check console logs for:
// 🔄 Syncing JWT claims (attempt 1/4)...
// ❌ JWT claims sync failed
// ⏳ Retrying in 1000ms...
// 🔄 Syncing JWT claims (attempt 2/4)...
// ... etc

-- Restore role
INSERT INTO roles (role_key, role_name, description)
VALUES ('business_owner', 'Business Owner', 'Owner of a business with full permissions');
```

### 7. Trigger Testing

```sql
-- Test trigger fires correctly
BEGIN;

-- Insert test business
INSERT INTO businesses (
  infrastructure_id,
  name,
  name_hebrew,
  default_currency,
  settings,
  active,
  created_by
) VALUES (
  '73c82fd4-c0c5-406c-ae94-96d4094c8eae',
  'Trigger Test Business',
  'עסק בדיקת טריגר',
  'ILS',
  '{"order_number_prefix": "TRG"}',
  true,
  'YOUR_USER_ID'
) RETURNING id;

-- Check user_business_roles was created
SELECT COUNT(*) FROM user_business_roles WHERE business_id = (
  SELECT id FROM businesses WHERE name = 'Trigger Test Business'
);
-- Expected: 1

-- Check user_business_contexts was created
SELECT COUNT(*) FROM user_business_contexts WHERE user_id = 'YOUR_USER_ID';
-- Expected: >= 1

ROLLBACK;
```

## Load Testing

### 8. Concurrent Business Creation

```javascript
// Test multiple users creating businesses simultaneously
const promises = [];
for (let i = 0; i < 5; i++) {
  promises.push(
    dataStore.createBusiness({
      name: `Load Test Business ${i}`,
      name_hebrew: `עסק בדיקת עומס ${i}`,
      business_type: 'logistics',
      order_number_prefix: `LT${i}`,
      default_currency: 'ILS',
      primary_color: '#1a1a2e',
      secondary_color: '#16213e'
    })
  );
}

await Promise.all(promises);

// Expected: All succeed without race conditions
// Check: Each business has unique records, no duplicates
```

## Monitoring Checklist

### 9. Production Monitoring (First 24 Hours)

- [ ] Check Supabase logs for Edge Function errors
- [ ] Monitor business creation success rate
- [ ] Check JWT sync retry rate (should be < 10%)
- [ ] Verify trigger execution (check NOTICE logs)
- [ ] Monitor database performance (trigger overhead)
- [ ] Check audit log for sync events
- [ ] Verify no 500 errors in business creation flow

### 10. Long-term Health Checks

```sql
-- Weekly checks

-- 1. Businesses without owner roles (should be 0)
SELECT COUNT(*) as orphaned_businesses
FROM businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM user_business_roles ubr
  WHERE ubr.business_id = b.id
    AND ubr.user_id = b.created_by
);

-- 2. Users without business contexts (acceptable if they have no businesses)
SELECT COUNT(*) as users_without_context
FROM auth.users u
WHERE EXISTS (
  SELECT 1 FROM businesses b WHERE b.created_by = u.id
)
AND NOT EXISTS (
  SELECT 1 FROM user_business_contexts ubc WHERE ubc.user_id = u.id
);

-- 3. JWT claims sync failures (check audit log)
SELECT
  DATE(created_at) as date,
  COUNT(*) as sync_attempts,
  COUNT(*) FILTER (WHERE metadata->>'error' IS NOT NULL) as failures
FROM system_audit_log
WHERE action = 'jwt_claims_synced'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## Rollback Verification

### 11. If Rollback Needed

```sql
-- Disable triggers
ALTER TABLE businesses DISABLE TRIGGER trigger_create_business_owner_role;
ALTER TABLE businesses DISABLE TRIGGER trigger_create_business_context;

-- Verify disabled
SELECT tgname, tgenabled FROM pg_trigger
WHERE tgrelid = 'businesses'::regclass;
-- Expected: tgenabled = 'D' (disabled)

-- Test business creation still works (without automatic records)
-- Manually verify in database
```

## Sign-Off Checklist

- [ ] All pre-deployment tests pass
- [ ] Database migration applied successfully
- [ ] Edge Function deployed and tested
- [ ] Frontend code deployed
- [ ] Manual business creation test successful
- [ ] Database records created correctly
- [ ] JWT claims synced properly
- [ ] Error handling works as expected
- [ ] Retry logic tested
- [ ] Performance acceptable (< 5s total)
- [ ] Monitoring dashboards updated
- [ ] Documentation reviewed
- [ ] Rollback plan tested

---

**Test Status**: Ready for Production Testing
**Last Updated**: November 2, 2025
**Tested By**: [Your Name]
**Test Environment**: [Staging/Production]
