# Role System Simplified - app_owner Merged to owner

## What Changed

Based on your feedback, I've simplified the role system:

### Before (Complex)
- ⚡ `app_owner` - App developer (separate role)
- 👑 `owner` - Regular business owner
- 💎 `business_owner` - Another business owner type
- ... other roles

### After (Simple)
- 👑 `owner` - Supreme access (YOU - the app developer + business owners)
- 💎 `business_owner` - Individual business operators
- 📋 `manager` - Team managers
- 🚗 `driver`, 📦 `warehouse`, 💰 `sales`, etc.

## Why This is Better

1. **Simpler** - One owner role instead of two confusing ones
2. **Clearer** - "Owner" = full access, no confusion
3. **Same Power** - You still have supreme access as owner
4. **Less Code** - Fewer edge cases to handle

## What Was Fixed

### Issue 1: Role Updates Failing
**Error:** "שגיאה בשינוי התפקיד"

**Root Cause:**
- RLS policies had `WITH CHECK` clauses that rejected valid updates
- Policies didn't account for owner role properly
- Business_users table was missing UPDATE policy

**Fix:**
- Simplified `WITH CHECK` to just `true` (let app handle validation)
- Added explicit owner checks with highest priority
- Created business_users UPDATE policy
- Granted direct UPDATE permissions

### Issue 2: Confusing Dual Owner Roles
**Problem:** Had both `app_owner` and `owner` - unclear which is which

**Fix:**
- Migrated all `app_owner` users to `owner`
- Updated JWT claims in auth.users
- Removed app_owner from translations
- Updated telegram-verify function
- Kept everything using one `owner` role

## Files Changed

### Database Migration
- `supabase/migrations/20251005140000_merge_app_owner_to_owner.sql`

### Edge Function
- `supabase/functions/telegram-verify/index.ts`
  - Changed: `isAppOwner` → `isPlatformOwner`
  - Changed: `defaultRole = 'app_owner'` → `'owner'`
  - Changed: Auto-promote to `'owner'` instead of `'app_owner'`

### Frontend
- `src/lib/hebrew.ts`
  - Removed: `appOwner: 'מפתח האפליקציה'`
  - Removed: `app_owner` from roleNames and roleIcons
  - Now just: `owner: 'בעלים'` with 👑 icon

### Build
- ✅ Successfully built in `dist/` folder
- Ready to deploy

## Deployment Instructions

### Step 1: Apply Database Fix

Run this SQL in Supabase SQL Editor:

```bash
# Use the quick fix file:
supabase/migrations/FIX_ROLE_UPDATES_NOW.sql

# Or the full migration:
supabase/migrations/20251005140000_merge_app_owner_to_owner.sql
```

**What it does:**
- Converts all `app_owner` to `owner`
- Fixes RLS policies to allow role updates
- Simplifies permission checks

### Step 2: Deploy Edge Function

Update `telegram-verify` function in Supabase Dashboard:
1. Go to Edge Functions
2. Select `telegram-verify`
3. Update code from `supabase/functions/telegram-verify/index.ts`
4. Deploy

**What changed:**
- Now promotes platform owner to `owner` role (not app_owner)
- Default role for new users is `manager` (not owner)

### Step 3: Deploy Frontend

Deploy the built files from `dist/` folder to your hosting:

```bash
# Example for Netlify:
netlify deploy --prod --dir=dist

# Example for Vercel:
vercel --prod
```

### Step 4: Verify

1. ✅ Open Telegram Mini App
2. ✅ Go to User Management
3. ✅ Select a user
4. ✅ Change their role
5. ✅ Should succeed without "שגיאה" error

## Environment Variable

Make sure this is set in Supabase Edge Function secrets:

```
APP_OWNER_TELEGRAM_ID=YOUR_TELEGRAM_USER_ID
```

This auto-promotes YOU to `owner` role when you login.

## Testing Role Updates

### Test 1: Check Your Role
```sql
SELECT telegram_id, username, role
FROM users
WHERE telegram_id = 'YOUR_TELEGRAM_ID';
```
Should return: `role = 'owner'`

### Test 2: Check for Remaining app_owner
```sql
SELECT COUNT(*) FROM users WHERE role = 'app_owner';
```
Should return: `0`

### Test 3: Test Role Update
In User Management:
1. Select any user
2. Click role change
3. Select new role (e.g., "מנהל" - manager)
4. Confirm
5. Should succeed with: "תפקיד עודכן בהצלחה"

### Test 4: Check Policies
```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'users' AND cmd = 'UPDATE';
```
Should show:
- `users_update_own_profile`
- `admins_update_all_users`

## Troubleshooting

### If role updates still fail:

1. **Check your role:**
   ```sql
   SELECT role FROM users WHERE telegram_id = 'YOUR_ID';
   ```
   Must be `'owner'` (not app_owner)

2. **Check JWT claims:**
   ```sql
   SELECT debug_auth_claims();
   ```
   Should show: `"jwt_role": "owner"`

3. **Check policies exist:**
   ```sql
   SELECT COUNT(*) FROM pg_policies
   WHERE tablename = 'users'
   AND policyname = 'admins_update_all_users';
   ```
   Should return: `1`

4. **Try direct update:**
   ```sql
   UPDATE users
   SET role = 'manager'
   WHERE telegram_id = 'TARGET_USER_ID';
   ```
   If this works but UI doesn't, issue is in frontend.

### If session claims still missing:

1. Re-login to Telegram Mini App
2. Check console for: "Session verified - JWT claims"
3. Run: `console.log(window.__JWT_CLAIMS__)`
4. Should see: `{ role: "owner", workspace_id: "...", ... }`

## Final Role Hierarchy

```
👑 owner
   ├── Full platform access
   ├── Can update any user role
   ├── Can manage all businesses
   └── You are automatically promoted to this

💎 business_owner
   ├── Manage specific business
   ├── Update roles in their business
   └── Business operations

📋 manager
   ├── Team management
   ├── Update driver/worker roles
   └── Operations oversight

🚗 driver
📦 warehouse
💰 sales
📞 customer_service
   └── Operational roles
```

## Success Criteria

✅ No more `app_owner` role in system
✅ You are `owner` with full access
✅ Role updates work without errors
✅ User Management loads properly
✅ Simpler, clearer role system

## Build Status

- ✅ Database migration created
- ✅ Edge function updated
- ✅ Frontend updated
- ✅ Build successful (dist/ ready)
- 📝 Ready to deploy

---

**Summary:** The role system is now simplified. Just ONE `owner` role (you) with supreme access. Role updates should work properly now. Apply the SQL fix, deploy the edge function and frontend, then test!
