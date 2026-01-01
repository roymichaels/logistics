# Dev Console Cleanup - Quick Login Removal

## Summary
Removed non-functional quick login feature from the dev console RolesPanel and replaced it with a proper role switcher that respects wallet-based authentication.

## Problem
The quick login feature created fake wallet sessions with hardcoded addresses like `0xSUPERADMIN`, `0xOWNER1`, etc. This didn't work because:
- The app uses real wallet authentication (Ethereum, Solana, TON)
- Users must sign messages with their actual wallets
- Fake sessions bypassed the proper authentication flow
- Created confusion about how authentication actually works

## Solution
Replaced quick login with a clean role switcher that:
- Requires an active wallet session to function
- Uses the existing `dev-console:role-override` mechanism
- Shows clear warnings about requiring wallet authentication
- Provides a dropdown selector for all available roles
- Displays current session information (wallet address, wallet type)
- Groups roles by category (Platform, Infrastructure, Business, Delivery, Store)

## Changes Made

### File Modified
- `src/components/dev/panels/RolesPanel.tsx`

### What Was Removed
1. `TEST_USERS` array with 10 fake users
2. `quickLogin()` function that created fake sessions
3. All quick login buttons and UI

### What Was Added
1. **Warning Banner** - Explains that wallet authentication is required
2. **Enhanced Session Display** - Shows wallet address, type, and override status
3. **Role Switcher Dropdown** - Clean select menu with all 13 roles grouped by category
4. **Shell Mapping Reference** - Shows which role maps to which shell
5. **Clear Role Override Button** - Removes the dev override without logging out
6. **Better Error Handling** - Alerts user if they try to switch roles without a wallet session

## Available Roles
The role switcher now includes all 13 roles:

### Platform
- Superadmin
- Admin

### Infrastructure
- Infrastructure Owner
- Accountant

### Business
- Business Owner
- Manager
- Warehouse
- Dispatcher
- Sales
- Customer Service

### Delivery
- Driver

### Store
- Customer
- Guest User

## How to Use (Dev Workflow)

1. **Connect Wallet First**
   - Navigate to `/auth/login`
   - Connect Ethereum, Solana, or TON wallet
   - Sign authentication message

2. **Switch Roles (Dev Only)**
   - Open dev console (how it's accessed depends on your setup)
   - Go to "Roles" panel
   - Select desired role from dropdown
   - App will navigate to role's entry point and reload

3. **Clear Override**
   - Click "Clear Role Override" to return to original wallet role
   - Or click "Logout & Clear Session" to fully log out

## Technical Details

### Role Override Key
```javascript
const ROLE_OVERRIDE_KEY = 'dev-console:role-override';
```

This localStorage key is used throughout the app to allow dev-mode role switching.

### Role to Shell Mapping
- Admin/Superadmin → AdminShell
- Infrastructure Owner/Accountant → InfrastructureShell
- Business Roles → BusinessShell
- Driver → DriverShell
- Customer/User → StoreShell

### Role to Entry Point Mapping
Uses `getEntryPointForRole()` from `src/routing/UnifiedRouter.tsx`:
- superadmin/admin → `/admin/platform-dashboard`
- infrastructure_owner/accountant → `/infrastructure/dashboard`
- business_owner/manager → `/business/dashboard`
- warehouse → `/business/inventory`
- dispatcher → `/business/dispatch`
- sales/customer_service → `/business/orders`
- driver → `/driver/deliveries`
- customer/user → `/store/catalog`

## Benefits

1. **Respects Authentication** - No fake sessions that bypass wallet auth
2. **Cleaner UI** - Dropdown instead of 10 buttons
3. **Better UX** - Clear warnings and disabled states
4. **More Informative** - Shows shell mappings and entry points
5. **Proper State** - Distinguishes between role override and actual session role
6. **Maintainable** - Single source of truth for available roles

## Future Improvements

Consider these enhancements:
1. Add business context selector (for multi-business roles)
2. Show which pages are available for current role
3. Add quick links to key pages for each role
4. Persist role preference across sessions (with expiry)
5. Add role permission matrix viewer

## Related Files

Files that use `dev-console:role-override`:
- `src/lib/userService.ts`
- `src/components/dev/EnhancedDevPanel.tsx`
- `src/foundation/data/LocalDataStore.ts`
- `src/layouts/UnifiedAppFrame.tsx`
- `src/context/SxtAuthProvider.tsx`
- `src/context/AppServicesContext.tsx`

## Testing

To test the new role switcher:
1. Connect wallet via `/auth/login`
2. Open dev console
3. Navigate to Roles panel
4. Select different roles and verify navigation
5. Check that role override shows "(overridden)" indicator
6. Clear override and verify return to original role
7. Try switching without wallet - should show error

---

**Date:** 2026-01-01
**Version:** Post-cleanup
**Build Status:** ✅ Passing
