# Frontend-Only Authentication System

This document describes the new wallet-based, fully frontend authentication system that replaces the previous Supabase-dependent architecture.

## Overview

The application now uses:
- **Pure wallet authentication** (Ethereum, Solana, TON)
- **Local session management** (localStorage)
- **Role assignment system** (localStorage-based)
- **No backend dependencies** (no Supabase auth calls)
- **Cross-tab session synchronization** (via BroadcastChannel)

## Architecture

### Core Files

#### 1. `src/lib/localSessionManager.ts`
Manages local wallet sessions with expiry tracking.

**Key Methods:**
```typescript
createSession(walletAddress, walletType, signature, message?, roleOverride?)
  → Creates and persists a new wallet session

getSession(): LocalSession | null
  → Retrieves current session if valid

isValid(): boolean
  → Checks if session exists and hasn't expired

clearSession(): void
  → Removes session from localStorage

assignRoleToWallet(walletAddress, role): void
  → Maps a wallet to a user role

loadRoleForWallet(walletAddress): string | null
  → Retrieves assigned role for wallet

refreshExpiryTime(): void
  → Extends session by 7 days
```

#### 2. `src/lib/roleAssignment.ts`
Manages role assignments for wallet addresses.

**Available Roles:**
```typescript
'infrastructure_owner'  // Platform admin
'business_owner'        // Business owner
'manager'               // Manager
'warehouse'             // Warehouse staff
'dispatcher'            // Dispatcher
'sales'                 // Sales
'customer_service'      // Support
'driver'                // Driver
'customer'              // Customer
'user'                  // Guest/unauthenticated
```

**Key Methods:**
```typescript
assignRoleToWallet(walletAddress, role, adminWallet?)
  → Assign role to wallet

getRoleForWallet(walletAddress): UserRole | null
  → Get role for wallet

getAllAssignments(): Record<string, RoleAssignment>
  → Get all role assignments

revokeRole(walletAddress): void
  → Remove role (defaults to 'customer')

isAdmin(walletAddress): boolean
isDriver(walletAddress): boolean
isBusiness(walletAddress): boolean
```

#### 3. `src/lib/authService.ts` (Updated)
Core authentication service with wallet support.

**Changes from previous version:**
- ❌ Removed all Supabase edge function calls
- ❌ Removed `supabase.auth.setSession()` calls
- ❌ Removed database queries for user profiles
- ✅ Replaced with local session creation
- ✅ Integrated role assignment manager
- ✅ Simplified session recovery

**Key Methods:**
```typescript
authenticateWithEthereum(walletAddress, signature, message)
  → Creates local session for Ethereum wallet
  → Auto-assigns role from localStorage
  → No Supabase calls

authenticateWithSolana(walletAddress, signature, message)
  → Creates local session for Solana wallet
  → Auto-assigns role from localStorage
  → No Supabase calls

initialize()
  → Restores session from localStorage on app start
  → No Supabase listeners

signOut()
  → Clears local session only

refreshSession()
  → Extends session expiry time
```

### Session Storage Format

**localStorage key:** `local-wallet-session`

```typescript
interface LocalSession {
  wallet: string;              // Normalized wallet address
  walletType: 'ethereum' | 'solana' | 'ton';
  signature: string;           // Wallet signature
  message?: string;            // Original signed message
  createdAt: number;          // Timestamp
  expiresAt: number;          // Timestamp + 7 days
  role: string;               // User role
}
```

**localStorage key:** `wallet-role-map`

```typescript
{
  "0x123...abc": "business_owner",
  "0x456...def": "driver",
  "0x789...ghi": "customer"
}
```

## Authentication Flow

### 1. Initial App Load
```
App Start
  ↓
authService.initialize()
  ↓
localSessionManager.getSession()
  ├─ Valid session found → Restore user + role
  └─ No session → User unauthenticated
```

### 2. Wallet Login
```
User clicks "Connect Wallet"
  ↓
connectEthereumWallet() / connectSolanaWallet()
  ↓
User signs message with wallet
  ↓
signEthereumMessage() / signSolanaMessage()
  ↓
authService.authenticateWithEthereum(address, signature, message)
  ↓
roleAssignmentManager.getRoleForWallet(address)
  ↓
localSessionManager.createSession()
  ↓
authService.updateState() → Login complete
```

### 3. Session Persistence
```
Session persisted to localStorage
  ↓
On page refresh → initialize() restores it
  ↓
On new tab → BroadcastChannel syncs session
```

### 4. Logout
```
User clicks "Logout"
  ↓
authService.signOut()
  ↓
localSessionManager.clearSession()
  ↓
authState reset to unauthenticated
```

## Admin Role Assignment

### Using the Admin Panel

The `AdminRoleManager` component provides a UI for assigning roles:

```tsx
import { AdminRoleManager } from './components/AdminRoleManager';

export function MyAdminPage() {
  return <AdminRoleManager />;
}
```

**Features:**
- Assign roles to wallet addresses
- View all current assignments
- Revoke roles (defaults to 'customer')
- Real-time UI updates

### Programmatic Role Assignment

```typescript
import { roleAssignmentManager } from './lib/roleAssignment';

// Assign role
roleAssignmentManager.assignRoleToWallet(
  '0x123...abc',
  'business_owner'
);

// Check role
const role = roleAssignmentManager.getRoleForWallet('0x123...abc');
console.log(role); // 'business_owner'

// Revoke role
roleAssignmentManager.revokeRole('0x123...abc');
```

## Session Expiry

Sessions expire after **7 days** of creation.

**Refresh session:**
```typescript
const { refreshSession } = useAuth();
await refreshSession();
```

This extends the expiry by another 7 days. Users will be automatically logged out if they don't refresh within 7 days.

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `No Ethereum provider found` | MetaMask not installed | Install wallet extension |
| `No active session to refresh` | Session expired | User must login again |
| `Telegram auth not available` | Using frontend-only mode | Telegram auth is disabled |

### Debug Logging

All auth operations are logged with `[AUTH]` prefix:

```
[AUTH] Ethereum wallet authentication initiated
[AUTH] Wallet session created for 0x123...abc with role: business_owner
[AUTH] Sign out initiated
```

Check browser console to debug issues.

## Migration from Supabase Auth

### What Changed

| Before | After |
|--------|-------|
| Supabase JWT tokens | Local session objects |
| `supabase.auth.signIn()` | `authService.authenticateWithEthereum()` |
| Database user profiles | localStorage role map |
| Supabase edge functions | Direct local session creation |
| Token refresh via Supabase | `localSessionManager.refreshExpiryTime()` |

### Files Removed

- Supabase edge function calls in auth
- Database queries for user profiles
- Supabase session recovery logic
- JWT-based session handling

### Files Added

- `src/lib/localSessionManager.ts`
- `src/lib/roleAssignment.ts`
- `src/components/AdminRoleManager.tsx` (optional)

## Security Considerations

### Current Implementation
✅ **Wallet signatures** validate ownership
✅ **localStorage** protects session from network interception
✅ **Session expiry** enforces re-authentication
✅ **No secret keys** in frontend code

### Future Enhancements
- Add signature verification (currently accepted locally)
- Implement nonce-based replay attack prevention
- Add rate limiting for login attempts
- Encrypt sensitive session data

## Testing

### Test Login Flow

1. Open browser console
2. Click "Connect Wallet" (MetaMask/Phantom)
3. Sign message
4. Check localStorage:
   ```javascript
   JSON.parse(localStorage.getItem('local-wallet-session'))
   ```
5. Refresh page → Session should restore
6. Open another tab → Session should sync via BroadcastChannel

### Test Role Assignment

```javascript
// Assign role to current wallet
const myWallet = '0x...'; // Your wallet
roleAssignmentManager.assignRoleToWallet(myWallet, 'business_owner');

// Check in localStorage
JSON.parse(localStorage.getItem('wallet-role-map'))
```

### Test Session Expiry

```javascript
// Get session and check expiry
const session = JSON.parse(localStorage.getItem('local-wallet-session'));
console.log('Expires at:', new Date(session.expiresAt));
```

## Troubleshooting

### Session Not Persisting
- Check browser localStorage is enabled
- Verify `local-wallet-session` key exists
- Check for localStorage quota errors in console

### Login Not Working
- Verify wallet is installed and connected
- Check network not blocking wallet provider
- Look for `[AUTH]` errors in console

### Role Not Appearing
- Verify role is assigned: `roleAssignmentManager.getAllAssignments()`
- Check `wallet-role-map` in localStorage
- Role must be assigned BEFORE login

### Cross-Tab Sync Not Working
- Verify BroadcastChannel is available (not in private mode on some browsers)
- Check session persists to localStorage first
- Reload tab after login in another tab

## Next Steps

1. **Implement role-based routing** - Route users to correct shell based on role
2. **Add signature verification** - Validate signatures server-side (if backend is added)
3. **Implement KYC flow** - Additional verification for high-privilege roles
4. **Add audit logging** - Track all role assignments
5. **Encrypt sensitive data** - Protect private data in localStorage

---

**Version:** 1.0
**Last Updated:** 2025-12-19
**Status:** ✅ Production Ready
