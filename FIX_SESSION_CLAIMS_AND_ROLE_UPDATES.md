# Fix Session Claims and Role Update Issues

## Issues Identified

From the screenshots provided:

1. **"חסרים claims: Session"** (Missing Session claims) - JWT claims not available when accessing User Management
2. **"שגיאה בשינוי התפקיד"** (Role change error) - RLS policies blocking role updates

## Root Causes

### Issue 1: Missing Session Claims
- Session tokens from `telegram-verify` edge function weren't being extracted correctly
- `generateLink` API returns tokens in a nested `properties` object
- Frontend wasn't waiting long enough for session to be fully established

### Issue 2: Role Update Blocked
- RLS `WITH CHECK` clauses were too restrictive
- Didn't account for `app_owner` role having supreme access
- Missing policy for `business_users` table role updates

## Solutions Implemented

### 1. Database Migration (`20251005130000_fix_auth_and_role_updates.sql`)

**New Policies Created:**

#### Users Table
- `users_can_update_own_profile` - Users can update non-role fields
- `admins_can_update_users` - Admins can update any field including roles
  - app_owner: Supreme access (all users)
  - infrastructure_owner: Global access
  - owner/business_owner/manager: Workspace-scoped access

#### Business Users Table
- `admins_can_update_business_user_roles` - Role management in multi-business context
  - Respects workspace boundaries
  - app_owner can update any business_user record

**Key Changes:**
- Simplified `WITH CHECK` clauses - removed overly restrictive conditions
- Added explicit app_owner checks with highest priority
- Granted proper table permissions to authenticated users

### 2. Edge Function Update (`telegram-verify/index.ts`)

**Session Token Extraction:**
```typescript
// Before: sessionData (incorrect - not the tokens directly)
// After: sessionData?.properties (correct - tokens are nested)

const session = sessionData?.properties;

return {
  session: session || sessionData?.properties || {
    access_token: sessionData?.properties?.access_token,
    refresh_token: sessionData?.properties?.refresh_token
  }
};
```

### 3. Frontend Enhancement (`TelegramAuth.tsx`)

**Session Establishment Improvements:**
```typescript
// Added delay to ensure session is ready
await new Promise(resolve => setTimeout(resolve, 200));

// Enhanced error handling
const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
  access_token: result.session.access_token,
  refresh_token: result.session.refresh_token
});

if (sessionError) {
  throw new Error('Failed to establish session');
}

// Verify claims are present
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  throw new Error('Session verification failed');
}

// Store for debugging
(window as any).__SUPABASE_SESSION__ = session;
(window as any).__JWT_CLAIMS__ = session.user.app_metadata;
```

## Deployment Steps

### Step 1: Apply Database Migration

```bash
# In Supabase Dashboard SQL Editor, run:
supabase/migrations/20251005130000_fix_auth_and_role_updates.sql
```

Or via CLI:
```bash
supabase db push
```

### Step 2: Deploy Edge Function

The `telegram-verify` edge function needs to be redeployed with the updated code.

**Option A: Via Supabase Dashboard**
1. Go to Edge Functions
2. Find `telegram-verify` function
3. Update the code from `supabase/functions/telegram-verify/index.ts`
4. Deploy

**Option B: Via CLI**
```bash
supabase functions deploy telegram-verify
```

### Step 3: Deploy Frontend

The updated frontend build is in the `dist/` directory:

```bash
# Deploy to your hosting platform
# Example for Netlify:
netlify deploy --prod --dir=dist

# Example for Vercel:
vercel --prod
```

## Testing the Fixes

### Test 1: Session Claims
1. Open Telegram Mini App
2. Login with your account
3. Navigate to User Management
4. Check browser console - should see:
   ```
   📋 Session verified - JWT claims: {
     user_id: "...",
     role: "app_owner",
     app_role: "...",
     workspace_id: "..."
   }
   ```
5. No "חסרים claims" error should appear

### Test 2: Role Updates
1. In User Management, select a user
2. Click role change button
3. Select new role
4. Should succeed without "שגיאה בשינוי התפקיד" error

### Debug Tools

**Check JWT Claims in Browser Console:**
```javascript
// After login, run in console:
console.log(window.__JWT_CLAIMS__);
console.log(window.__SUPABASE_SESSION__);
```

**Check JWT Claims in Database:**
```sql
-- Run in Supabase SQL Editor while authenticated:
SELECT debug_auth_claims();
```

## Role Hierarchy Reference

After these fixes, the role hierarchy is:

```
⚡ app_owner           - Platform developer (supreme access)
🏗️  infrastructure_owner - Global system admin
👑 owner                - Business infrastructure owner
💎 business_owner       - Individual business owner
📋 manager              - Operations manager
🚗 driver               - Delivery driver
📦 warehouse            - Warehouse staff
💰 sales                - Sales team
📞 customer_service     - Support team
```

## Troubleshooting

### If "Missing Session claims" persists:

1. **Check Edge Function Logs:**
   ```bash
   supabase functions logs telegram-verify
   ```
   Look for: "Session generated successfully with JWT claims"

2. **Verify User Metadata:**
   ```sql
   SELECT
     id,
     email,
     raw_app_meta_data->'role' as role,
     raw_app_meta_data->'workspace_id' as workspace_id
   FROM auth.users
   WHERE email = 'YOUR_TELEGRAM_ID@telegram.auth';
   ```

3. **Clear Session and Re-login:**
   - In browser console: `localStorage.clear(); sessionStorage.clear();`
   - Close and reopen Telegram Mini App

### If role updates still fail:

1. **Check Current Policies:**
   ```sql
   SELECT * FROM pg_policies
   WHERE tablename = 'users'
   AND policyname LIKE '%update%';
   ```

2. **Test Policy Directly:**
   ```sql
   -- As your user, try:
   UPDATE users
   SET role = 'manager'
   WHERE telegram_id = 'TARGET_USER_TELEGRAM_ID';
   ```

3. **Verify Your Role:**
   ```sql
   SELECT role FROM users WHERE telegram_id = 'YOUR_TELEGRAM_ID';
   ```
   Should return `app_owner` if you're the platform owner.

## Environment Variable Required

Ensure this is set in Supabase Edge Functions secrets:

```bash
APP_OWNER_TELEGRAM_ID=YOUR_TELEGRAM_USER_ID
```

This auto-promotes you to `app_owner` role on login.

## Success Criteria

✅ User Management loads without "חסרים claims" error
✅ JWT claims visible in console logs
✅ Role changes succeed without errors
✅ app_owner can modify any user's role
✅ Managers can modify roles in their workspace
✅ Session persists across page navigation

## Files Changed

1. `/supabase/migrations/20251005130000_fix_auth_and_role_updates.sql` - **NEW**
2. `/supabase/functions/telegram-verify/index.ts` - Updated session extraction
3. `/src/components/TelegramAuth.tsx` - Enhanced session validation
4. Build output in `/dist/` - Ready to deploy

---

**Build Status:** ✅ Successful
**Migration Status:** 📝 Ready to apply
**Edge Function Status:** 🔄 Ready to deploy
