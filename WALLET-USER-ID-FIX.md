# Wallet User ID Fix - Business Creation and Retrieval

## Problem Summary

When wallet users (Ethereum, Solana, TON) connected and created businesses, the business would be created successfully but then immediately fail to be retrieved. The error showed "No business ownerships found for user" even though the business was just created.

## Root Cause

The authentication system was creating Supabase user profiles with UUIDs (e.g., `cf3715f0-84b5-4056-8d15-de1f19d770ad`) but then using the wallet address as the user ID in the auth context. This caused:

1. **Business Creation**: Used the correct Supabase UUID → ✅ Success
2. **Business Retrieval**: Used the wallet address instead of UUID → ❌ Failed (no matches)

The mismatch occurred in `AuthContext.tsx` line 354 where it set:
```typescript
id: user.walletAddress,  // Wrong! Should be supabaseUserId
```

## Solution Implemented

### 1. Updated SxtShimProvider in AuthContext.tsx

**Changed user state management to include supabaseUserId:**
- Added `supabaseUserId` to the user state interface
- Updated all state setters to preserve `supabaseUserId`
- Added comprehensive logging to track user ID resolution

**Fixed user.id to use Supabase UUID:**
```typescript
const userId = user?.supabaseUserId || user?.walletAddress;
```

This ensures the Supabase UUID is always used as the primary user ID, with wallet address only as a fallback for legacy support.

### 2. Enhanced Wallet Connection Functions

Updated login functions to properly capture and store `supabaseUserId`:
- `loginWithEthereum()`
- `loginWithSolana()`
- `loginWithTon()`

All now extract `supabaseUserId` from the wallet connection response and store it in the user state.

### 3. Added Validation in BusinessService

Added UUID validation in both `createBusiness()` and `getOwnedBusinesses()`:
```typescript
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(userId)) {
  logger.error('Invalid user ID format - wallet address cannot be used');
  // ... handle error
}
```

This catches any cases where a wallet address is mistakenly used instead of a UUID and provides clear error messages.

### 4. Enhanced Logging

Added detailed logging throughout the authentication and business management flow:
- User ID at auth context creation
- Wallet connection events with supabaseUserId
- Business creation with user ID validation
- Business retrieval with user ID tracking

## Data Flow (After Fix)

### Wallet Connection
1. User connects wallet (e.g., Ethereum)
2. `connectEthereumWallet()` calls `createSupabaseAnonSession()`
3. Supabase creates/retrieves a profile with UUID
4. UUID is returned as `supabaseUserId`
5. SxtAuthProvider stores `{ walletAddress, walletType, supabaseUserId }`

### Business Creation
1. User clicks "Create Business"
2. `createBusiness()` gets userId from auth context
3. userId = `user.supabaseUserId` (UUID) ✅
4. RPC function `create_business_for_user()` creates business with UUID owner_id
5. Business successfully created

### Business Retrieval
1. System calls `getOwnedBusinesses()`
2. userId = `user.supabaseUserId` (UUID) ✅
3. RPC function `get_user_businesses()` queries with UUID
4. Businesses found and returned ✅

## Files Modified

1. `src/context/AuthContext.tsx`
   - Updated SxtShimProvider user state to include supabaseUserId
   - Fixed ctx.user.id to use supabaseUserId instead of walletAddress
   - Added comprehensive logging
   - Updated all login functions to capture supabaseUserId

2. `src/services/business.ts`
   - Added UUID validation in `getOwnedBusinesses()`
   - Added UUID validation in `createBusiness()`
   - Enhanced error logging with detailed context

## Testing Checklist

To verify the fix works:

1. ✅ Clear localStorage and refresh
2. ✅ Connect wallet (Ethereum/Solana/TON)
3. ✅ Check logs for "Creating auth context" - should show supabaseUserId
4. ✅ Create a business
5. ✅ Check logs for "Using user ID for business creation" - should be UUID
6. ✅ Verify business appears in owned businesses list
7. ✅ Refresh page
8. ✅ Verify business still appears (session persistence)
9. ✅ Disconnect and reconnect wallet
10. ✅ Verify same UUID is used (wallet mapping)

## Key Principles

1. **Supabase UUID is the source of truth** for user identity
2. **Wallet address is metadata** stored on the profile
3. **All database operations** must use the UUID
4. **Wallet mapping** ensures consistent UUID across sessions
5. **Logging is critical** for debugging auth flows

## Backward Compatibility

The fix maintains backward compatibility:
- Falls back to wallet address if no supabaseUserId is available
- Wallet mapping ensures existing users get their correct UUID
- No database schema changes required
- Existing profiles continue to work

## Prevention

To prevent this issue from recurring:
1. UUID validation added to catch wallet address usage
2. Clear logging shows which ID is being used
3. Type system updated to track supabaseUserId explicitly
4. Code comments explain the critical distinction

## Success Metrics

After this fix:
- ✅ Wallet users can create businesses
- ✅ Created businesses appear immediately
- ✅ Businesses persist across page reloads
- ✅ Same UUID used for all operations
- ✅ No duplicate profiles created
- ✅ Clear error messages if misconfigured
