# Authentication System Documentation

## Overview

This platform uses **wallet-based authentication** with no traditional username/password system. Users authenticate using cryptographic signatures from their Web3 wallets.

## Supported Wallets

### Ethereum
- **MetaMask** - Browser extension wallet
- **WalletConnect** - Mobile wallet connection
- **Coinbase Wallet** - Coinbase's wallet
- Any injected Ethereum provider

### Solana
- **Phantom** - Primary Solana wallet
- **Solflare** - Alternative Solana wallet
- **Sollet** - Web-based Solana wallet

### TON
- **TON Connect** - TON blockchain wallet integration

## Authentication Flow

### Initial Login

```
1. User clicks "Connect Wallet"
   ↓
2. Select wallet type (ETH/SOL/TON)
   ↓
3. Wallet popup appears
   ↓
4. User approves connection in wallet
   ↓
5. Application requests signature for auth message
   ↓
6. User signs message in wallet
   ↓
7. Signature verified client-side
   ↓
8. Session created and stored in LocalStorage
   ↓
9. User role loaded from IndexedDB
   ↓
10. Redirect to role-appropriate dashboard
```

### Authentication Message

The message signed by the wallet:

```
Sign this message to authenticate:

Wallet: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
Timestamp: 2024-01-01T12:00:00Z
Nonce: abc123def456

This signature will not trigger any blockchain transaction or cost any gas.
```

**Components**:
- **Wallet Address**: User's public key
- **Timestamp**: Prevents replay attacks
- **Nonce**: Random value for uniqueness
- **Disclaimer**: Clarifies no gas cost

### Signature Verification

```typescript
// Ethereum signature verification
function verifyEthereumSignature(
  message: string,
  signature: string,
  address: string
): boolean {
  const recovered = ethers.utils.verifyMessage(message, signature);
  return recovered.toLowerCase() === address.toLowerCase();
}

// Solana signature verification
function verifySolanaSignature(
  message: Uint8Array,
  signature: Uint8Array,
  publicKey: PublicKey
): boolean {
  return sign.detached.verify(message, signature, publicKey.toBytes());
}
```

## Session Management

### Session Creation

After successful authentication:

```typescript
interface Session {
  walletAddress: string;
  walletType: 'ethereum' | 'solana' | 'ton';
  signature: string;
  timestamp: number;
  expiresAt: number;
  role?: string;
}

// Store in LocalStorage
localStorage.setItem('auth_session', JSON.stringify(session));
```

### Session Persistence

Sessions persist across browser restarts:

```typescript
// On app load
const session = localStorage.getItem('auth_session');
if (session) {
  const parsed = JSON.parse(session);
  if (parsed.expiresAt > Date.now()) {
    // Session valid, restore user
    restoreSession(parsed);
  } else {
    // Session expired, clear it
    localStorage.removeItem('auth_session');
  }
}
```

### Session Expiration

Default session duration: **30 days**

```typescript
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

const expiresAt = Date.now() + SESSION_DURATION;
```

Users can manually logout or sessions expire automatically.

### Session Refresh

Sessions can be refreshed by re-signing:

```typescript
async function refreshSession() {
  const newMessage = generateAuthMessage();
  const signature = await wallet.signMessage(newMessage);
  updateSession({ signature, timestamp: Date.now() });
}
```

## Role Assignment

### Role Storage

User roles stored in IndexedDB:

```typescript
interface UserRole {
  walletAddress: string;
  roles: string[];
  businesses: {
    businessId: string;
    role: string;
  }[];
  currentRole: string;
  updatedAt: number;
}
```

### Role Loading

After authentication, role loaded from IndexedDB:

```typescript
async function loadUserRole(walletAddress: string): Promise<UserRole> {
  const db = await openDB('app-db');
  const role = await db.get('user_roles', walletAddress);
  return role || { roles: ['customer'], currentRole: 'customer' };
}
```

### Default Role

New users automatically assigned **customer** role:

```typescript
if (!existingRole) {
  await assignRole(walletAddress, 'customer');
}
```

### Role Switching

Users with multiple roles can switch:

```typescript
async function switchRole(newRole: string) {
  // Validate user has this role
  if (!user.roles.includes(newRole)) {
    throw new Error('Unauthorized');
  }

  // Update current role
  await updateUserRole(user.walletAddress, { currentRole: newRole });

  // Reload application with new role
  window.location.reload();
}
```

## Permission System

### Role-Based Permissions

Each role has specific permissions:

```typescript
const ROLE_PERMISSIONS = {
  infrastructure_owner: ['*'], // All permissions
  business_owner: [
    'business:read',
    'business:write',
    'business:delete',
    'orders:read',
    'orders:write',
    'inventory:read',
    'inventory:write',
    'drivers:read',
    'drivers:assign',
    'reports:read'
  ],
  manager: [
    'business:read',
    'orders:read',
    'orders:write',
    'inventory:read',
    'inventory:write',
    'drivers:read',
    'drivers:assign'
  ],
  warehouse: [
    'inventory:read',
    'inventory:write',
    'orders:read',
    'orders:pack'
  ],
  dispatcher: [
    'orders:read',
    'drivers:read',
    'drivers:assign'
  ],
  sales: [
    'orders:read',
    'orders:write',
    'customers:read'
  ],
  customer_service: [
    'orders:read',
    'orders:modify',
    'customers:read'
  ],
  driver: [
    'deliveries:read',
    'deliveries:update',
    'earnings:read'
  ],
  customer: [
    'catalog:read',
    'orders:create',
    'orders:read:own'
  ],
  user: [
    'catalog:read'
  ]
};
```

### Permission Checks

```typescript
function hasPermission(user: User, permission: string): boolean {
  const rolePermissions = ROLE_PERMISSIONS[user.currentRole];

  // Check wildcard (infrastructure_owner)
  if (rolePermissions.includes('*')) return true;

  // Check exact permission
  if (rolePermissions.includes(permission)) return true;

  // Check wildcard patterns (e.g., 'orders:*')
  const [resource, action] = permission.split(':');
  if (rolePermissions.includes(`${resource}:*`)) return true;

  return false;
}
```

### Permission Guards

**React Component Guard**
```tsx
import { PermissionGuard } from '@components/guards';

<PermissionGuard requiredPermission="orders:write">
  <CreateOrderButton />
</PermissionGuard>
```

**Hook Usage**
```typescript
import { usePermissions } from '@hooks';

function MyComponent() {
  const { hasPermission } = usePermissions();

  if (!hasPermission('orders:write')) {
    return <div>Access denied</div>;
  }

  return <CreateOrderForm />;
}
```

**Route Guard**
```tsx
import { ProtectedRoute } from '@routing';

<ProtectedRoute requiredPermission="business:read">
  <BusinessDashboard />
</ProtectedRoute>
```

## Security Considerations

### Client-Side Security

**No Server Validation**
- All validation happens client-side
- Wallet signatures provide cryptographic proof
- No server can be compromised

**Signature Security**
- Signatures are non-replayable (timestamp + nonce)
- Signatures don't cost gas
- Signatures can't execute transactions

**Session Security**
- Sessions stored in LocalStorage (XSS risk mitigated by CSP)
- Sessions expire automatically
- Manual logout clears all data

### Wallet Security

**User Responsibility**
- Users must secure their wallet
- Lost wallet = lost access
- Private keys never stored by app

**Best Practices**
- Never share private keys
- Use hardware wallets for high-value operations
- Enable wallet security features

### XSS Protection

```typescript
// Content Security Policy
const CSP = {
  'default-src': "'self'",
  'script-src': "'self' 'unsafe-inline'",
  'style-src': "'self' 'unsafe-inline'",
  'connect-src': "'self' https://*.ethereum.org"
};
```

### Data Encryption

Sensitive data encrypted in IndexedDB:

```typescript
import { encrypt, decrypt } from '@lib/crypto';

// Encrypt before storing
const encrypted = encrypt(sensitiveData, userWallet);
await db.put('sensitive_data', encrypted);

// Decrypt when reading
const data = await db.get('sensitive_data');
const decrypted = decrypt(data, userWallet);
```

## Multi-Wallet Support

Users can connect multiple wallets:

```typescript
interface UserWallets {
  primary: string;
  wallets: {
    type: 'ethereum' | 'solana' | 'ton';
    address: string;
    addedAt: number;
  }[];
}
```

## Logout Flow

```typescript
async function logout() {
  // 1. Clear LocalStorage session
  localStorage.removeItem('auth_session');

  // 2. Clear any cached data
  await clearCache();

  // 3. Disconnect wallet
  await wallet.disconnect();

  // 4. Redirect to login
  navigate('/login');
}
```

## Error Handling

### Common Auth Errors

**Wallet Not Connected**
```typescript
if (!wallet.connected) {
  throw new Error('Please connect your wallet first');
}
```

**Signature Rejected**
```typescript
try {
  const signature = await wallet.signMessage(message);
} catch (error) {
  if (error.code === 4001) {
    // User rejected signature
    showError('Signature rejected. Please try again.');
  }
}
```

**Session Expired**
```typescript
if (session.expiresAt < Date.now()) {
  clearSession();
  navigate('/login');
  showError('Your session has expired. Please login again.');
}
```

**Invalid Role**
```typescript
if (!VALID_ROLES.includes(requestedRole)) {
  throw new Error('Invalid role');
}
```

## Testing Authentication

### Unit Tests

```typescript
describe('Authentication', () => {
  it('creates session after signature', async () => {
    const signature = await signMessage(message);
    const session = createSession(walletAddress, signature);
    expect(session.walletAddress).toBe(walletAddress);
  });

  it('verifies valid signature', () => {
    const isValid = verifySignature(message, signature, address);
    expect(isValid).toBe(true);
  });

  it('rejects expired session', () => {
    const expiredSession = { ...session, expiresAt: Date.now() - 1000 };
    expect(isSessionValid(expiredSession)).toBe(false);
  });
});
```

### Integration Tests

```typescript
describe('Login Flow', () => {
  it('completes full login flow', async () => {
    // Connect wallet
    await connectWallet('ethereum');

    // Sign message
    const signature = await signAuthMessage();

    // Verify creates session
    const session = getSession();
    expect(session).toBeDefined();

    // Loads user role
    const role = getCurrentRole();
    expect(role).toBeDefined();
  });
});
```

## Monitoring and Analytics

Track authentication metrics:

```typescript
// Login success rate
trackEvent('auth:login_success', { walletType });

// Login failures
trackEvent('auth:login_failed', { reason, walletType });

// Session duration
trackMetric('auth:session_duration', sessionDuration);

// Role switching
trackEvent('auth:role_switched', { from, to });
```

## Future Enhancements

### Planned Features

1. **Multi-Signature Support**
   - Require multiple signatures for sensitive actions
   - Team-based authentication

2. **Hardware Wallet Integration**
   - Ledger support
   - Trezor support

3. **Social Recovery**
   - Recovery through trusted contacts
   - Backup wallet linking

4. **Biometric Authentication**
   - Fingerprint for session unlock
   - Face ID on mobile

5. **Session Management**
   - View active sessions
   - Revoke sessions remotely
   - Device tracking
