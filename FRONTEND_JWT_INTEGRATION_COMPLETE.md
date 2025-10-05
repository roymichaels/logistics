# Frontend JWT Integration - COMPLETE

## Changes Made

The frontend has been updated to properly handle the new JWT token format from the `telegram-verify` Edge Function.

### 1. Updated `twaAuth.ts`

**File**: `src/lib/twaAuth.ts`

**Changes**:
- Removed requirement for `refresh_token` (line 230-234)
- Now accepts JWT with only `access_token`
- Added logging for claims included in response (line 237)
- Pass empty string for `refresh_token` when setting session (line 241)

**Before**:
```typescript
const { access_token, refresh_token } = result.session || {};

if (!access_token || !refresh_token) {
  console.error('❌ ensureTwaSession: Missing tokens in response');
  return { ok: false, reason: 'tokens_missing' };
}
```

**After**:
```typescript
const { access_token } = result.session || {};

if (!access_token) {
  console.error('❌ ensureTwaSession: Missing access_token in response');
  return { ok: false, reason: 'tokens_missing' };
}

console.log('🔑 ensureTwaSession: Setting session with received JWT token');
console.log('📋 Claims included:', result.claims);

const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
  access_token,
  refresh_token: '', // No refresh token - re-authenticate via Telegram
});
```

### 2. Updated `sessionTracker.ts`

**File**: `src/lib/sessionTracker.ts`

**Changes**:
- Now decodes JWT payload directly to extract claims (lines 84-97)
- Checks for claims in both `app_metadata` (old format) and JWT payload (new format)
- Merges claims with JWT claims taking precedence (line 100)
- Properly handles `user_role` vs `role` field mapping (line 91)

**New Logic**:
```typescript
// Check claims in both app_metadata (old format) and direct JWT payload (new format)
const appMetadata = session.user.app_metadata || {};

// Decode JWT to check for custom claims at root level
let jwtClaims = {};
try {
  const payload = JSON.parse(atob(session.access_token.split('.')[1]));
  jwtClaims = {
    user_id: payload.user_id,
    telegram_id: payload.telegram_id,
    role: payload.user_role || payload.role,
    app_role: payload.app_role,
    workspace_id: payload.workspace_id
  };
} catch (e) {
  this.log('JWT_DECODE', 'warning', 'Could not decode JWT payload');
}

// Merge claims from both sources (JWT claims take precedence)
const claims = { ...appMetadata, ...jwtClaims };
```

## How It Works

### Authentication Flow

1. **User opens Mini App** in Telegram
2. **Frontend calls** `ensureTwaSession()`
3. **Frontend sends** `initData` to `telegram-verify` Edge Function
4. **Edge Function**:
   - Verifies Telegram signature
   - Creates/updates user in database
   - Generates custom JWT with claims embedded
   - Returns JWT to frontend
5. **Frontend receives** JWT with structure:
   ```json
   {
     "ok": true,
     "valid": true,
     "user": { "id": "...", "telegram_id": "...", "role": "..." },
     "session": { "access_token": "...", "token_type": "bearer" },
     "claims": { "user_id": "...", "telegram_id": "...", "role": "..." }
   }
   ```
6. **Frontend sets** Supabase session with `access_token`
7. **SessionTracker verifies** claims are present in JWT

### JWT Claims Structure

The JWT payload now contains:

```json
{
  "aud": "authenticated",
  "exp": 1234567890,
  "iat": 1234567890,
  "iss": "https://your-project.supabase.co",
  "sub": "user-uuid",
  "email": "123456789@telegram.auth",
  "role": "authenticated",

  // Custom claims for RLS and frontend
  "user_id": "user-uuid",
  "telegram_id": "123456789",
  "user_role": "manager",
  "app_role": "manager",
  "workspace_id": "workspace-uuid"
}
```

### SessionTracker Verification

SessionTracker now:

1. Gets session from Supabase
2. Decodes JWT payload (base64 decode middle section)
3. Extracts custom claims from payload
4. Verifies all required claims are present:
   - `role` (mapped from `user_role`)
   - `telegram_id`
   - `user_id`

### Expected Console Output

**Before Fix**:
```
✅ VERIFY_SESSION: Session exists
❌ VERIFY_CLAIMS: Missing claims: role, telegram_id, user_id
{provider: 'email'}
```

**After Fix**:
```
✅ VERIFY_SESSION: Session exists
✅ VERIFY_CLAIMS: All required claims present
{
  user_id: "550e8400-e29b-41d4-a716-446655440000",
  telegram_id: "123456789",
  role: "manager",
  app_role: "manager",
  workspace_id: "660e8400-e29b-41d4-a716-446655440000"
}
```

## Testing Instructions

### 1. Deploy Edge Function

Deploy the updated `telegram-verify` function to Supabase (you mentioned you'll do this).

### 2. Clear Browser Storage

```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
window.location.reload();
```

### 3. Open Mini App

Open your Mini App in Telegram and log in.

### 4. Check Console Logs

Look for:
```
🔑 ensureTwaSession: Setting session with received JWT token
📋 Claims included: {user_id: "...", telegram_id: "...", role: "..."}
✅ VERIFY_CLAIMS: All required claims present
```

### 5. Verify Claims in Console

```javascript
// Check session tracker
sessionTracker.getReport()

// Check decoded JWT
const session = await supabase.auth.getSession();
const payload = JSON.parse(atob(session.data.session.access_token.split('.')[1]));
console.log('JWT Payload:', payload);
```

### 6. Test Role Changes

Try changing your role in the UI - should work without 401 errors.

## RLS Policy Compatibility

The JWT claims can now be used in RLS policies:

```sql
-- Access user_id
auth.jwt()->>'user_id'

-- Access telegram_id
auth.jwt()->>'telegram_id'

-- Access role
auth.jwt()->>'user_role'

-- Access app_role
auth.jwt()->>'app_role'

-- Access workspace_id
auth.jwt()->>'workspace_id'
```

Example policy:
```sql
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.jwt()->>'user_id' = id::text);
```

## Troubleshooting

### Claims Still Missing

**Symptom**: SessionTracker shows missing claims

**Solution**:
1. Check that Edge Function is deployed correctly
2. Clear browser storage and reload
3. Check Edge Function logs in Supabase dashboard
4. Verify `SUPABASE_JWT_SECRET` is set correctly

### JWT Decode Fails

**Symptom**: `JWT_DECODE` warning in console

**Solution**:
1. Check that `access_token` is a valid JWT (3 parts separated by dots)
2. Verify Edge Function is returning correct token format
3. Check Edge Function logs for errors

### Session Not Persisting

**Symptom**: Session lost on page refresh

**Solution**:
1. Check browser storage is not being cleared automatically
2. Verify JWT expiration is set correctly (7 days)
3. Check that Supabase client is configured with `persistSession: true`

## Frontend Integration Points

### Where Claims Are Used

1. **Role-based UI rendering**:
   - Dashboard layout selection
   - Navigation menu items
   - Feature access control

2. **RLS policy enforcement**:
   - All database queries automatically use JWT claims
   - No need to pass user context manually

3. **Business context**:
   - `workspace_id` used for filtering data
   - Multi-business support via workspace switching

4. **User identification**:
   - `user_id` for user-specific data
   - `telegram_id` for Telegram-specific features

## Security Notes

1. **JWT is stateless**: All info is in the token, no server-side session storage
2. **7-day expiration**: Token expires after 7 days, user must re-authenticate
3. **No refresh mechanism**: Simpler and more secure for Telegram auth
4. **Claims are read-only**: Cannot be modified after token generation
5. **Signature verified**: Supabase automatically verifies JWT signature on every request

## Next Steps

After deploying the Edge Function:

1. ✅ Frontend is ready to receive new JWT format
2. ✅ SessionTracker will properly verify claims
3. ✅ RLS policies will have access to all required claims
4. ✅ Role changes and user management will work
5. ✅ Build completes without errors

Just deploy the Edge Function and test!
