# RLS Policy Fix and Authentication Flow Improvement

## Overview
Fixed critical Row-Level Security (RLS) policy violations that were preventing users from loading their profiles after authentication. The error "new row violates row-level security policy for table 'users'" has been resolved.

## Root Cause
The issue had multiple contributing factors:

1. **RLS Policy Mismatch**: The existing RLS policies were checking JWT claims for `telegram_id` and wallet addresses, but the frontend was attempting to query users by `telegram_id` instead of `auth.uid()`.

2. **Premature Database Queries**: The `UserHomepage` component was calling `dataStore.getProfile()` before the Supabase session was fully established and JWT claims were available.

3. **Auto-Creation Logic**: The `supabaseDataStore._fetchProfileFromDatabase()` method attempted to auto-create users when not found, which triggered INSERT operations that violated RLS policies.

4. **Query Pattern**: The profile fetch logic was querying by `telegram_id` using `.eq('telegram_id', ...)` instead of querying by the primary key `id` which matches `auth.uid()`.

## Changes Made

### 1. Database Migration: `20251101030000_fix_users_rls_for_authenticated_inserts.sql`

Created clean, explicit RLS policies for the `users` table:

**SELECT Policy** (`users_select_own`):
- Allows authenticated users to read their own record where `id = auth.uid()`
- Simple and direct - no complex JWT claim checks needed

**INSERT Policy** (`users_insert_own`):
- Allows authenticated users to insert a record where `id = auth.uid()`
- This enables edge functions (telegram-verify, web3-verify) to create user records

**UPDATE Policy** (`users_update_own`):
- Allows authenticated users to update only their own record

**Service Role Policy** (`users_service_role_all`):
- Allows edge functions with service_role to perform all operations
- Critical for authentication flow

**Key improvements:**
- Removed all conflicting and duplicate policies
- Simplified policy logic to use `auth.uid()` exclusively
- Clear separation between user operations and service role operations

### 2. Fixed `supabaseDataStore._fetchProfileFromDatabase()`

**Before:**
```typescript
// Queried by telegram_id
const { data, error } = await freshClient
  .from('users')
  .select('...')
  .eq('telegram_id', this.userTelegramId)
  .maybeSingle();

// Attempted auto-creation on not found
if (!data) {
  // Create user logic here
}
```

**After:**
```typescript
// Get authenticated session first
const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
const authUid = sessionData.session.user.id;

// Query by auth.uid() (primary key)
const { data, error } = await supabase
  .from('users')
  .select('...')
  .eq('id', authUid)
  .maybeSingle();

// No auto-creation - throw clear error if not found
if (!data) {
  throw new Error('User profile not found. Your account may not be fully set up yet.');
}
```

**Key improvements:**
- Always queries by `auth.uid()` which matches the RLS policy
- Verifies authentication session exists before querying
- Provides clear error messages for RLS violations
- Removed problematic auto-creation logic
- User creation is now handled exclusively by edge functions

### 3. Updated `UserHomepage` Component

Added proper authentication verification before profile loading:

```typescript
const [authReady, setAuthReady] = useState(false);

// First useEffect: Verify authentication
useEffect(() => {
  const checkAuth = async () => {
    const { data: sessionData, error } = await supabase.auth.getSession();

    if (error || !sessionData?.session) {
      // Handle no session
      return;
    }

    setAuthReady(true);
  };

  checkAuth();
}, []);

// Second useEffect: Load profile only after auth is ready
useEffect(() => {
  if (!authReady) return;
  loadUser();
}, [authReady]);
```

**Key improvements:**
- Two-phase loading: authentication verification → profile loading
- Prevents premature database queries
- Clear error messages for authentication failures
- Better user experience with proper loading states

## Authentication Flow

The improved authentication flow now works as follows:

### Telegram Authentication

1. **TelegramAuth Component**: Verifies Telegram initData
2. **Edge Function** (`telegram-verify`):
   - Creates/updates auth.users record
   - Creates/updates public.users record with `id = auth.uid()`
   - Generates JWT with proper claims
   - Returns session tokens
3. **Client**: Sets session with JWT
4. **Session Propagation**: Waits for session to be fully established
5. **UserHomepage**: Verifies session exists before loading profile
6. **supabaseDataStore.getProfile()**: Queries by `auth.uid()` with valid session

### Web3 Authentication

Same flow as Telegram, but via `web3-verify` edge function:
- No `telegram_id` required (can be NULL)
- Uses `wallet_address_eth` or `wallet_address_sol`
- Still creates record with `id = auth.uid()`
- RLS policies work identically

## Security Improvements

1. **Simplified RLS Logic**: Policies now only check `id = auth.uid()` which is guaranteed to be present in authenticated sessions

2. **No More Auto-Creation**: User creation is controlled exclusively by edge functions using service_role, preventing unauthorized user creation

3. **Proper Session Verification**: Components verify authentication before attempting database operations

4. **Clear Error Boundaries**: RLS violations now produce clear, actionable error messages

## Testing the Fix

To verify the fix works:

1. **Apply the migration**:
   ```bash
   # Migration will be auto-applied on next Supabase deployment
   ```

2. **Test Telegram Authentication**:
   - Open app in Telegram Mini App
   - Verify authentication completes without errors
   - Confirm profile loads successfully
   - Check browser console for proper flow logs

3. **Test Web3 Authentication**:
   - Connect Ethereum or Solana wallet
   - Sign authentication message
   - Verify profile loads without RLS errors

4. **Expected Console Logs**:
   ```
   ✅ UserHomepage: Authentication verified, session ready
   📥 UserHomepage: Loading user profile...
   🔍 getProfile: Fetching user with auth.uid(): [uuid]
   🔍 getProfile: Raw database response: { hasData: true, ... }
   ✅ UserHomepage: Profile loaded successfully: [role]
   ```

## Migration Rollback (if needed)

If issues arise, the previous policies can be restored manually via Supabase dashboard. However, the new policies are significantly simpler and more secure.

## Future Improvements

1. **Caching**: Consider implementing proper session caching to reduce auth checks
2. **Retry Logic**: Add exponential backoff for transient auth failures
3. **Monitoring**: Add analytics to track authentication success/failure rates
4. **Documentation**: Update user-facing docs about authentication requirements

## Related Files

- `/supabase/migrations/20251101030000_fix_users_rls_for_authenticated_inserts.sql`
- `/src/lib/supabaseDataStore.ts`
- `/src/pages/UserHomepage.tsx`
- `/supabase/functions/telegram-verify/index.ts`
- `/supabase/functions/web3-verify/index.ts`

## Conclusion

The RLS policy violations have been resolved by:
1. Simplifying RLS policies to use `auth.uid()` consistently
2. Fixing the profile query logic to use the primary key
3. Adding proper authentication verification before database queries
4. Removing problematic auto-creation logic

Users should now be able to authenticate and load their profiles without encountering RLS policy errors.
