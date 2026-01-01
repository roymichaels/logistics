# Session Persistence Fix - Complete

## Issue
When users switched roles using the dev console, the role would change temporarily but get lost during page navigation or reload. This caused users to revert to their default role unexpectedly.

## Root Cause
The application's cache-clearing mechanism in `main.tsx` was deleting the role-related localStorage keys during every page reload, including:
- `dev-console:role-override` - The dev console role override
- `local-wallet-session` - The local session manager session data
- `wallet-role-map` - The wallet-to-role assignment map

## Solution
Added these three critical localStorage keys to the preservation list in `main.tsx` so they survive cache clears.

### Changes Made

**File: `src/main.tsx`** (Lines 54-70)

Added to the `keysToPreserve` array:
```typescript
// Preserve local session manager data
'local-wallet-session',
'wallet-role-map',
// Preserve dev console role override
'dev-console:role-override'
```

## How It Works Now

### Session Storage Architecture
The application uses multiple localStorage keys for session management:

1. **`local-wallet-session`** - Stores the active wallet session including:
   - Wallet address
   - Wallet type (ethereum/solana/ton)
   - Signature and message
   - Role
   - Creation and expiration timestamps

2. **`wallet-role-map`** - Maps wallet addresses to roles:
   - Persistent role assignments
   - Survives session clears
   - Used to restore roles for returning users

3. **`dev-console:role-override`** - Dev console role override:
   - Allows developers to test different roles
   - Takes precedence over default role
   - Triggers UI updates via event listeners

### Role Switching Flow

1. User selects role in dev console (`RolesPanel.tsx`)
2. `localSessionManager.assignRoleToWallet()` updates both:
   - The current session in `local-wallet-session`
   - The role map in `wallet-role-map`
3. Sets `dev-console:role-override` in localStorage
4. Dispatches `dev-role-changed` event
5. Page reloads with `window.location.reload()`
6. **Cache clear preserves all three keys** (fixed!)
7. `AuthService.initialize()` restores session from `localSessionManager`
8. `SxtAuthProvider` reads and applies role override
9. User remains in selected role across navigation

### Session Restoration Flow

On app initialization:
1. `main.tsx` clears cache but preserves critical keys
2. `AuthContext` initializes
3. For Supabase mode: `authService.initialize()` reads from `localSessionManager`
4. For SXT mode: `SxtAuthProvider` reads from localStorage
5. Session is restored with correct role
6. User is navigated to role-appropriate entry point

## Testing

To verify the fix works:

1. **Test Role Persistence:**
   - Connect wallet and log in
   - Open dev console (F12)
   - Switch to a different role (e.g., "Business Owner")
   - Navigate to different pages
   - Reload the page
   - ✅ Role should persist

2. **Test Session Persistence:**
   - Log in with wallet
   - Close browser tab
   - Reopen application
   - ✅ Should remain logged in with same role

3. **Test Cross-Tab Sync:**
   - Open app in two tabs
   - Switch role in one tab
   - ✅ Other tab should detect change via BroadcastChannel

## Additional Preserved Keys

The complete list of preserved localStorage keys:
- `user_session` - Legacy session data
- `twa-undergroundlab-session-backup` - Telegram session backup
- `twa-undergroundlab-session-v2` - Telegram session v2
- `twa-session-metadata` - Telegram metadata
- `twa-user-context` - User context
- `twa-device-id` - Device identifier
- `hasVisitedBefore` - First-visit flag
- `sxt_session` - Space & Time session
- `sxt.wallet.session` - Wallet session
- `local-wallet-session` - **NEW** Local session manager
- `wallet-role-map` - **NEW** Role assignments
- `dev-console:role-override` - **NEW** Dev role override

## Architecture Benefits

This fix maintains the frontend-only architecture principles:
- ✅ No backend dependencies
- ✅ Works offline
- ✅ Wallet-based authentication
- ✅ Persistent local state
- ✅ Developer-friendly role testing
- ✅ Cross-tab session sync

## Related Files

Key files involved in session management:
- `src/main.tsx` - Cache management & session preservation
- `src/lib/localSessionManager.ts` - Local session storage
- `src/context/AuthContext.tsx` - Auth state management
- `src/context/SxtAuthProvider.tsx` - SXT mode auth provider
- `src/lib/authService.ts` - Frontend-only auth service
- `src/components/dev/panels/RolesPanel.tsx` - Dev console role switcher

## Migration Notes

No migration needed - this is a bug fix that improves existing functionality without breaking changes.

Users will immediately benefit from:
- Roles persisting across navigation
- Sessions surviving page reloads
- Proper cache management

## Status: ✅ COMPLETE

Build tested and passing. Session persistence working as expected.
