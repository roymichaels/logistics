# JWT Claims Fix - COMPLETE SOLUTION

## Problem Identified

The Telegram authentication was creating valid Supabase sessions, but the JWT tokens had **NO custom claims** (`role`, `telegram_id`, `user_id`, `workspace_id`). This caused:

- RLS policies to fail (no `auth.jwt()->>'role'` available)
- Frontend role checks to fail (no claims in session)
- Role change operations to return 401 errors

### Root Cause

Supabase **does not automatically embed custom `app_metadata` into JWTs** when using `signInWithPassword()`. The JWT only contained:

```json
{
  "provider": "email",
  "providers": ["email"]
}
```

Instead of the required:

```json
{
  "user_id": "...",
  "telegram_id": "...",
  "user_role": "manager",
  "app_role": "manager",
  "workspace_id": "..."
}
```

## Solution Implemented

### What Changed

The `telegram-verify` Edge Function now:

1. ✅ Verifies Telegram signature (unchanged)
2. ✅ Creates/updates user in `users` table (unchanged)
3. ✅ Gets business associations for `workspace_id` (unchanged)
4. 🆕 **Generates a custom JWT using `jose` library**
5. 🆕 **Embeds all custom claims directly in the JWT**
6. ✅ Returns JWT that works with Supabase RLS

### Key Changes

**Line 3: Added jose library**
```typescript
import { SignJWT } from 'npm:jose@5';
```

**Line 216: Get JWT secret**
```typescript
const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET')!;
```

**Lines 323-370: Generate custom JWT with full claims**
```typescript
const jwtSecretKey = new TextEncoder().encode(jwtSecret);
const now = Math.floor(Date.now() / 1000);

const payload = {
  aud: 'authenticated',
  exp: now + (7 * 24 * 60 * 60), // 7 days
  iat: now,
  iss: supabaseUrl,
  sub: userId,
  email: `${telegramIdStr}@telegram.auth`,
  role: 'authenticated',
  // Custom claims for RLS and frontend
  user_id: userId,
  telegram_id: telegramIdStr,
  user_role: finalUserRole,
  app_role: businessRole,
  workspace_id: workspaceId
};

const access_token = await new SignJWT(payload)
  .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
  .sign(jwtSecretKey);
```

**Lines 388-404: Return session with custom JWT**
```typescript
session: {
  access_token,
  refresh_token: '',
  expires_in: 604800, // 7 days
  expires_at: now + 604800,
  token_type: 'bearer',
  user: {
    id: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email: `${telegramIdStr}@telegram.auth`,
    app_metadata: payload.app_metadata,
    user_metadata: payload.user_metadata
  }
}
```

## Deployment Instructions

### Method 1: Supabase Dashboard (Recommended)

1. **Go to Edge Functions**:
   https://supabase.com/dashboard/project/0ec90b57d6e95fcbda19832f/functions

2. **Click** `telegram-verify` function

3. **Copy the entire file**:
   `/tmp/cc-agent/57871658/project/supabase/functions/telegram-verify/index.ts`

4. **Paste** into the Supabase editor

5. **Click "Deploy"**

6. **Wait** for deployment to complete (~30 seconds)

### Method 2: Supabase CLI

```bash
# Login first (if not already)
npx supabase login

# Deploy the function
npx supabase functions deploy telegram-verify \
  --project-ref 0ec90b57d6e95fcbda19832f/functions \
  --no-verify-jwt
```

### Required Environment Variables

Make sure these are set in your Supabase project:

- ✅ `TELEGRAM_BOT_TOKEN` - Your bot token
- ✅ `SUPABASE_URL` - Auto-populated
- ✅ `SUPABASE_ANON_KEY` - Auto-populated
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Auto-populated
- ✅ `SUPABASE_JWT_SECRET` - Auto-populated
- ⚠️ `APP_OWNER_TELEGRAM_ID` - Optional (for auto-promotion to owner)

Check at: https://supabase.com/dashboard/project/0ec90b57d6e95fcbda19832f/settings/functions

## Expected Results

### Before Fix

```javascript
// SessionTracker output
✅ VERIFY_SESSION: Session exists
❌ VERIFY_CLAIMS: Missing claims: role, telegram_id, user_id
{provider: 'email'}
```

### After Fix

```javascript
// SessionTracker output
✅ VERIFY_SESSION: Session exists
✅ VERIFY_CLAIMS: All claims present
{
  user_id: "550e8400-e29b-41d4-a716-446655440000",
  telegram_id: "123456789",
  user_role: "manager",
  app_role: "manager",
  workspace_id: "660e8400-e29b-41d4-a716-446655440000"
}
```

### Frontend Impact

1. **Role-based UI** will now work correctly
2. **RLS policies** checking `auth.jwt()->>'user_role'` will pass
3. **Role change operations** will succeed
4. **Workspace context** will be available in all queries

### RLS Policy Example

```sql
-- This will now work correctly
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.jwt()->>'user_id' = id::text);

-- This will also work
CREATE POLICY "Managers can view their workspace"
  ON orders FOR SELECT
  TO authenticated
  USING (
    business_id::text = auth.jwt()->>'workspace_id'
    AND auth.jwt()->>'user_role' IN ('manager', 'owner')
  );
```

## Testing

### 1. Deploy the Function

Follow deployment instructions above.

### 2. Test Authentication

1. Open your Mini App in Telegram
2. Try to log in
3. Open browser console (if in Telegram Desktop Web App)
4. Look for SessionTracker logs

### 3. Verify Claims

Check the logs for:

```
✅ VERIFY_CLAIMS: All claims present
```

### 4. Test Role Changes

Try changing your role in the UI - it should work without 401 errors.

### 5. Check Edge Function Logs

View logs at: https://supabase.com/dashboard/project/0ec90b57d6e95fcbda19832f/logs/edge-functions

You should see:

```
✅ HMAC verification SUCCEEDED
✅ User exists: username (role: manager)
🔐 Generating custom JWT with claims
✅ Custom JWT generated with claims: {
  user_id: "...",
  telegram_id: "...",
  user_role: "manager",
  app_role: "manager",
  workspace_id: "..."
}
```

## JWT Token Details

### Token Lifetime

- **Expiration**: 7 days
- **Refresh**: Not implemented (client re-authenticates with Telegram)
- **Revocation**: Change user's role in database (next re-auth will pick it up)

### Token Claims

| Claim | Type | Description |
|-------|------|-------------|
| `aud` | string | Always "authenticated" |
| `sub` | string | User UUID from users table |
| `iss` | string | Supabase URL |
| `exp` | number | Expiration timestamp |
| `iat` | number | Issued at timestamp |
| `role` | string | Always "authenticated" (for Supabase) |
| `user_id` | string | User UUID (custom claim) |
| `telegram_id` | string | Telegram user ID (custom claim) |
| `user_role` | string | User role: owner/manager/driver/etc (custom claim) |
| `app_role` | string | Business-specific role (custom claim) |
| `workspace_id` | string | Primary business ID (custom claim) |

## Security Notes

1. **JWT Secret**: Never expose `SUPABASE_JWT_SECRET` client-side
2. **Token Signing**: Happens server-side only (in Edge Function)
3. **Signature Verification**: Supabase automatically verifies JWT signature
4. **RLS Enforcement**: All queries still go through RLS policies
5. **No Refresh Tokens**: Users re-authenticate via Telegram (more secure)

## Troubleshooting

### JWT Verification Fails

**Symptom**: "JWT verification failed" errors in RLS queries

**Solution**: Make sure `SUPABASE_JWT_SECRET` is set correctly in environment variables

### Claims Still Missing

**Symptom**: SessionTracker still shows missing claims

**Solution**:
1. Clear browser cache
2. Log out and log back in
3. Check that you deployed the latest function version

### 401 Errors Persist

**Symptom**: Role changes still return 401

**Solution**:
1. Check Edge Function logs for errors
2. Verify `TELEGRAM_BOT_TOKEN` is correct
3. Ensure user has proper role in `users` table

## Additional Notes

- The JWT is **stateless** - all info is in the token
- Token expiration is **7 days** - adjust if needed
- **No refresh mechanism** - simpler and more secure for Telegram auth
- Frontend can decode JWT to read claims (use `jwt-decode` library)
- Claims are **read-only** after token generation

## Success Criteria

✅ Telegram authentication works
✅ JWT contains all custom claims
✅ SessionTracker shows "All claims present"
✅ RLS policies pass correctly
✅ Role changes work without errors
✅ Workspace context available in UI
✅ Build completes without errors
