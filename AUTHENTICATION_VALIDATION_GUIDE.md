# 🔐 Telegram WebApp Authentication & JWT Validation Guide

**Complete validation toolkit for the TWA authentication pipeline**

---

## 📋 Overview

This guide provides comprehensive tools and procedures to validate your Telegram WebApp authentication system, including JWT token structure, RLS policies, session persistence, and Edge Function integration.

## 🎯 Validation Phases

### Phase 0: Pre-Validation Checklist

Before running validation tests, ensure:

- [ ] Telegram WebApp opens successfully from Telegram
- [ ] Supabase project is accessible
- [ ] Environment variables are configured (`.env` file)
- [ ] All Edge Functions are deployed
- [ ] Database migrations are applied

### Phase 1: SQL Diagnostic Validation

**Location:** `supabase/scripts/validate_jwt_claims_and_rls.sql`

**Purpose:** Validate JWT claims structure and RLS policies directly in the database.

**How to Run:**

1. Open Supabase SQL Editor
2. Ensure you are authenticated (run query as authenticated user)
3. Copy and paste the entire script
4. Execute the script
5. Review output for any ❌ failures

**What It Checks:**

- ✅ JWT claims structure (user_id, telegram_id, role, business_id)
- ✅ User profile completeness
- ✅ Permission cache status
- ✅ RLS policy enforcement on key tables
- ✅ Business context isolation
- ✅ Role-based capabilities
- ✅ Authentication status summary

**Expected Output:**

```sql
=== VALIDATION SUMMARY ===
Status | JWT Token Present: ✅ PASS
Status | User ID in JWT: ✅ PASS
Status | User Exists in Database: ✅ PASS
Status | Role Assigned: ✅ PASS
Status | Can Access At Least One Table: ✅ PASS
```

---

### Phase 2: Browser-Based JWT Inspector

**Location:** `public/jwt-inspector.html`

**Purpose:** Real-time JWT claims inspection and validation in the browser.

**How to Access:**

1. Start your development server: `npm run dev`
2. Open the app in Telegram WebApp
3. Navigate to: `http://localhost:5173/jwt-inspector.html`
4. The tool will automatically load your current session

**Features:**

- 🎫 Authentication status (session active, expiry time)
- 📋 JWT claims viewer (telegram_id, role, business_id, scope_level)
- 🔑 Permissions display (can_see_financials, cross-business access)
- ✅ Validation checklist (all required claims present)
- 🔍 Raw JWT token inspector
- 🔄 Real-time refresh capability
- 📋 Copy claims to clipboard

**Actions Available:**

- **Refresh Data:** Re-fetch current session and claims
- **Print Report:** Generate printable validation report
- **Clear Session:** Log out and clear all session data

---

### Phase 3: Automated Test Suite

**Location:** `tests/authValidation.test.ts`

**Purpose:** Comprehensive automated testing of the entire authentication pipeline.

**How to Run:**

```bash
npm test tests/authValidation.test.ts
```

**What It Tests:**

1. **Telegram Environment Detection**
   - WebApp SDK availability
   - initData format validation
   - User data parsing

2. **Backend Verification (telegram-verify)**
   - Edge Function accessibility
   - initData signature verification
   - Session token generation

3. **JWT Token Structure**
   - Required claims presence
   - telegram_id in metadata
   - Role assignment

4. **Session Tracker Validation**
   - Session verification
   - Claims completeness
   - Propagation timing

5. **Permission Resolution**
   - Edge Function response
   - Permission caching
   - Role-based permissions

6. **RLS Policy Enforcement**
   - Table-level access control
   - Business context isolation
   - Role-based data filtering

7. **Session Persistence**
   - localStorage storage
   - Auto-refresh configuration
   - Cross-tab synchronization

---

### Phase 4: Session Persistence Tests

**Location:** `tests/sessionPersistence.test.ts`

**Purpose:** Validate session storage, persistence, and recovery mechanisms.

**How to Run:**

```bash
npm test tests/sessionPersistence.test.ts
```

**What It Tests:**

- ✅ Session stored in localStorage with correct key
- ✅ Session metadata completeness
- ✅ Token expiry handling
- ✅ Auto-refresh configuration
- ✅ Session recovery from localStorage
- ✅ Session tracker integration
- ✅ Cross-tab session sync (manual test)

**Key Validation Points:**

- **Storage Key:** `sb-twa-undergroundlab-auth-token`
- **Auto-Refresh:** Enabled (tokens refresh automatically)
- **Persist Session:** Enabled (session survives page reload)
- **Session Expiry:** Should have at least 5 minutes remaining

---

### Phase 5: RLS Policy Tests

**Location:** `tests/rlsPolicies.test.ts`

**Purpose:** Validate Row Level Security policies for all database tables.

**How to Run:**

```bash
npm test tests/rlsPolicies.test.ts
```

**What It Tests:**

1. **Users Table RLS**
   - Users can read own profile
   - Admin roles can see all users
   - Non-admin roles restricted

2. **Businesses Table RLS**
   - Infrastructure roles see all businesses
   - Business-scoped roles see assigned businesses only

3. **Orders Table RLS**
   - Role-based order access
   - Driver sees only assigned orders
   - Business_id isolation enforced

4. **Warehouses & Inventory RLS**
   - Warehouse role access
   - Business context enforcement

5. **Financial Data RLS**
   - can_see_financials claim respected
   - Financial data protected

6. **Cross-Business Access**
   - can_see_cross_business enforced
   - Business isolation verified

7. **Permission Cache RLS**
   - Users see own cache only
   - Admin can see all caches

8. **Audit Log RLS**
   - Admin-only access enforced

---

### Phase 6: Edge Function Integration Tests

**Location:** `tests/edgeFunctionIntegration.test.ts`

**Purpose:** Validate all Edge Functions accept JWT tokens and respect RLS.

**How to Run:**

```bash
npm test tests/edgeFunctionIntegration.test.ts
```

**Functions Tested:**

1. **telegram-verify**
   - Deployment status
   - initData verification
   - Session token generation
   - Invalid data rejection

2. **resolve-permissions**
   - JWT authentication
   - Permission resolution
   - Cache behavior (5-minute TTL)
   - Missing parameter handling

3. **allocate-stock**
   - Authentication requirement
   - RLS enforcement

4. **deliver-order**
   - Authentication requirement
   - Driver role validation

5. **role-editor**
   - Admin authorization
   - Role management access

6. **business-context-switch**
   - Business access validation
   - Context switching

**CORS Validation:**

All Edge Functions must include:

```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey'
};
```

---

## 🧪 Running All Validation Tests

### Full Test Suite

```bash
# Run all validation tests
npm test

# Run specific test suites
npm test tests/authValidation.test.ts
npm test tests/sessionPersistence.test.ts
npm test tests/rlsPolicies.test.ts
npm test tests/edgeFunctionIntegration.test.ts
```

### Expected Results

All tests should pass with ✅ green checkmarks. Any ❌ red failures indicate authentication pipeline issues that need to be addressed.

---

## 🔍 Manual Validation Procedures

### 1. Verify Telegram Login Flow

**Steps:**

1. Open app from Telegram (not browser)
2. App should auto-authenticate using `telegram.initData`
3. Check browser console for authentication logs:
   ```
   ✅ Telegram login verified
   ✅ JWT fetched
   ✅ Supabase client initialized
   ```
4. No re-authentication loops or errors

### 2. Check JWT Claims in Console

**Steps:**

1. Open browser DevTools console
2. Run: `window.__JWT_CLAIMS__`
3. Verify output contains:
   ```javascript
   {
     user_id: "uuid",
     telegram_id: "string",
     role: "infrastructure_owner|business_owner|driver|etc",
     business_id: "uuid|null",
     permissions: ["array", "of", "permissions"]
   }
   ```

### 3. Verify Session Persistence

**Steps:**

1. Authenticate in app
2. Refresh page (hard refresh: Cmd+Shift+R / Ctrl+Shift+R)
3. App should NOT show login screen
4. Session should restore automatically
5. Check localStorage for session:
   ```javascript
   localStorage.getItem('sb-twa-undergroundlab-auth-token')
   ```

### 4. Test RLS with SQL

**Steps:**

1. Open Supabase SQL Editor
2. Run test query:
   ```sql
   SELECT current_user, current_setting('request.jwt.claims', true);
   ```
3. Verify JWT claims are present
4. Test table access:
   ```sql
   SELECT COUNT(*) FROM orders;
   SELECT COUNT(*) FROM businesses;
   SELECT COUNT(*) FROM warehouses;
   ```
5. Access should match role permissions

### 5. Validate Edge Function Responses

**Steps:**

1. Open browser Network tab
2. Interact with app (create order, view dashboard, etc.)
3. Check Edge Function responses:
   - Status: 200 OK (for successful calls)
   - Headers: CORS headers present
   - Response: Valid JSON with expected data
4. No 401 Unauthorized or 403 Forbidden errors

---

## 🐛 Troubleshooting Common Issues

### Issue: "No JWT token found"

**Cause:** User not authenticated through Telegram WebApp.

**Solution:**
- Ensure app is opened FROM Telegram (not browser)
- Check `telegram.initData` is available
- Verify `TELEGRAM_BOT_TOKEN` is configured in Supabase

### Issue: "User not found in database"

**Cause:** telegram-verify function hasn't created user record.

**Solution:**
- Run telegram-verify Edge Function manually
- Check Supabase Auth users
- Verify `users` table has entry with matching `telegram_id`

### Issue: "RLS rejection: permission denied"

**Cause:** JWT claims missing or RLS policies too restrictive.

**Solution:**
- Run SQL diagnostic script to check claims
- Verify user has proper role assigned
- Check RLS policies for the affected table
- Confirm `business_id` in JWT matches table data

### Issue: "Session expires too quickly"

**Cause:** Token refresh not working or expiry too short.

**Solution:**
- Verify `autoRefreshToken: true` in Supabase client config
- Check token expiry time (should be ~1 hour)
- Monitor browser console for refresh attempts
- Check `onAuthStateChange` listener is active

### Issue: "Permission cache not updating"

**Cause:** Cache TTL (5 minutes) hasn't expired.

**Solution:**
- Wait 5 minutes for cache to expire
- Or manually clear cache:
  ```sql
  DELETE FROM user_permissions_cache WHERE user_id = auth.uid();
  ```
- Call `resolve-permissions` Edge Function to repopulate

---

## 📊 Expected JWT Claims Structure by Role

### Infrastructure Owner

```json
{
  "user_id": "auth.uid",
  "telegram_id": "telegram_user_id",
  "role": "infrastructure_owner",
  "business_id": null,
  "permissions": ["manage_infrastructure", "view_all_businesses", "manage_users"],
  "can_see_financials": true,
  "can_see_cross_business": true,
  "scope_level": "infrastructure"
}
```

### Business Owner

```json
{
  "user_id": "auth.uid",
  "telegram_id": "telegram_user_id",
  "role": "business_owner",
  "business_id": "specific_business_uuid",
  "permissions": ["manage_business", "view_orders", "manage_inventory"],
  "can_see_financials": true,
  "can_see_cross_business": false,
  "scope_level": "business"
}
```

### Driver

```json
{
  "user_id": "auth.uid",
  "telegram_id": "telegram_user_id",
  "role": "driver",
  "business_id": "assigned_business_uuid",
  "permissions": ["view_assigned_orders", "update_delivery_status"],
  "can_see_financials": false,
  "can_see_cross_business": false,
  "scope_level": "business"
}
```

---

## ✅ Validation Checklist

Use this checklist to confirm all authentication components are working:

- [ ] **Telegram Login** - App opens from Telegram without errors
- [ ] **JWT Generation** - telegram-verify creates valid tokens
- [ ] **JWT Claims** - All required claims present (user_id, telegram_id, role)
- [ ] **Session Storage** - Tokens stored in localStorage
- [ ] **Session Persistence** - Session survives page reload
- [ ] **Token Refresh** - Tokens auto-refresh before expiry
- [ ] **Permission Resolution** - resolve-permissions returns correct permissions
- [ ] **Permission Cache** - Permissions cached for 5 minutes
- [ ] **RLS Users** - User can read own profile
- [ ] **RLS Businesses** - Business access matches role
- [ ] **RLS Orders** - Order access matches role and business_id
- [ ] **RLS Financials** - Financial data respects can_see_financials
- [ ] **Edge Functions** - All functions deployed and accessible
- [ ] **CORS Headers** - All Edge Functions include proper CORS
- [ ] **Error Handling** - Functions return user-friendly errors
- [ ] **Session Tracker** - sessionTracker.isReady() returns true
- [ ] **Build Success** - `npm run build` completes without errors

---

## 🔧 Utility Commands

### Clear Session (Force Re-Authentication)

```javascript
// Browser console
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Print Session Report

```javascript
// Browser console
window.sessionTracker.getReport();
// or
window.printSessionReport();
```

### View JWT Claims

```javascript
// Browser console
window.__JWT_CLAIMS__
window.__SUPABASE_SESSION__
```

### Check Session Status

```javascript
// Browser console
await window.sessionTracker.verifySession();
```

---

## 📞 Support

If validation fails after following all troubleshooting steps:

1. Review browser console for error messages
2. Check Supabase logs for Edge Function errors
3. Run SQL diagnostic script for detailed RLS analysis
4. Use JWT inspector tool for real-time claims inspection
5. Verify all environment variables are configured correctly

---

## 🎉 Success Criteria

Your authentication pipeline is fully validated when:

- ✅ All automated tests pass (Phases 1-6)
- ✅ SQL diagnostic script shows all ✅ PASS
- ✅ JWT inspector shows valid session and claims
- ✅ Session persists across page reloads
- ✅ RLS policies enforce proper data isolation
- ✅ Edge Functions respond correctly with JWT auth
- ✅ `npm run build` completes successfully
- ✅ No authentication loops or errors in console

**Result:** Your Telegram WebApp authentication pipeline is production-ready! 🚀
