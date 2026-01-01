# Role Switching Fix

## Problem
When switching roles via the dev console, users were being logged out or seeing incorrect role behavior after page reload.

## Root Cause
The role switching flow had a critical bug:

1. **RolesPanel** calls `localSessionManager.assignRoleToWallet(wallet, newRole)`
2. This updated the **role map** in localStorage (`wallet-role-map` key)
3. But it **did NOT update the current session object** (`local-wallet-session` key)
4. After `window.location.reload()`:
   - `authService.initialize()` runs
   - It calls `localSessionManager.getSession()`
   - The session object still had the **old role**
   - Auth state was restored with wrong role

## The Fix

### 1. Updated `localSessionManager.assignRoleToWallet()` (src/lib/localSessionManager.ts:70-86)

```typescript
assignRoleToWallet(walletAddress: string, role: string): void {
  try {
    // Update role map
    const roleMap = this.getAllRoleAssignments();
    roleMap[walletAddress.toLowerCase()] = role;
    localStorage.setItem(ROLE_MAP_KEY, JSON.stringify(roleMap));
    logger.info(`[ROLES] Assigned role "${role}" to wallet ${walletAddress}`);

    // NEW: Also update the current session object with the new role
    const session = this.getSession();
    if (session && session.wallet.toLowerCase() === walletAddress.toLowerCase()) {
      session.role = role;
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      logger.info(`[ROLES] Updated current session role to "${role}"`);
    }
  } catch (error) {
    logger.error('[ROLES] Failed to assign role', error);
  }
}
```

### 2. Improved `handleRoleSwitch()` (src/components/dev/panels/RolesPanel.tsx:29-49)

```typescript
const handleRoleSwitch = (newRole: string) => {
  if (!currentSession) {
    alert('Please connect your wallet first at /auth/login');
    return;
  }

  setSwitchingRole(true);

  // Update both role map AND current session
  localSessionManager.assignRoleToWallet(currentSession.wallet, newRole);
  localStorage.setItem(ROLE_OVERRIDE_KEY, newRole);

  // Emit event for UnifiedAppFrame to listen
  window.dispatchEvent(new CustomEvent('dev-role-changed'));

  const entryPoint = getEntryPointForRole(newRole as any);

  // Navigate and reload with proper timing
  setTimeout(() => {
    navigate(entryPoint);
    setSwitchingRole(false);
    window.location.reload();
  }, 150);
};
```

## How It Works Now

1. User selects new role in dev console
2. `assignRoleToWallet` updates:
   - The wallet→role map
   - **The current session object with new role**
3. Dev console emits `dev-role-changed` event
4. Navigate to appropriate entry point
5. Page reloads
6. `authService.initialize()` loads session with **correct role**
7. User sees correct dashboard for new role

## Testing

To verify the fix works:

1. Open dev console (Roles tab)
2. Switch from "customer" to "manager"
3. Page should reload and show Business Dashboard
4. Check localStorage: `local-wallet-session` should have `"role": "manager"`
5. User should NOT be logged out
6. Switch to "driver" - should show Driver Dashboard
7. Session should persist across all role changes

## Related Files

- `src/lib/localSessionManager.ts` - Session management
- `src/components/dev/panels/RolesPanel.tsx` - Dev console role switcher
- `src/lib/authService.ts` - Auth initialization (reads session on startup)
- `src/context/AuthContext.tsx` - Auth context provider
- `src/routing/UnifiedRouter.tsx` - Entry point routing by role

## Notes

- The fix ensures both the role map AND current session are always in sync
- No changes needed to `authService.initialize()` - it correctly reads the updated session
- The 150ms delay ensures DOM updates complete before reload
- The `dev-role-changed` event allows UI to update before reload (optional)
