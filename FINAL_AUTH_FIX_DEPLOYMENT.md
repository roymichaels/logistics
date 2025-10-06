# FINAL Telegram Authentication Fix - Deployment Guide

**Status**: ✅ Ready for Deployment
**Build**: ✅ Successful
**Date**: 2025-10-06

---

## 🎯 What This Fixes

Based on your actual logs, the issue was:
1. **JWT from telegram-verify was being created but not properly validated by frontend**
2. **Custom claims (user_id, telegram_id, user_role) exist in JWT but weren't being checked correctly**
3. **set-role Edge Function couldn't read custom claims from root-level JWT payload**

---

## 🔧 Changes Made

### 1. Enhanced JWT Validation in Frontend (`src/lib/twaAuth.ts`)

**Added**:
- Decode and log JWT payload BEFORE setting session to verify structure
- Decode and log JWT payload AFTER setting session to verify claims persisted
- Store raw JWT payload in `window.__JWT_RAW_PAYLOAD__` for debugging
- Verify all required claims are present and warn if missing

**Why**: This lets us see exactly what claims are in the JWT at each step

### 2. Fixed set-role Claims Reading (`supabase/functions/set-role/index.ts`)

**Changed**:
```typescript
// OLD (only checked app_metadata)
const callerRole = callerClaims?.app_metadata?.role;

// NEW (checks root level first, then app_metadata)
const callerRole = callerClaims?.user_role || callerClaims?.app_metadata?.role;
```

**Why**: telegram-verify puts custom claims at JWT root level (user_role, telegram_id), not in app_metadata

### 3. Enhanced Diagnostics

- All JWT decode operations now log detailed claim structure
- Window globals for easy debugging: `__JWT_CLAIMS__`, `__JWT_RAW_PAYLOAD__`
- Session tracker enhanced to validate claim presence

---

## 📦 Deployment Steps

### Step 1: Deploy Edge Functions

```bash
# Deploy set-role with fixed claims reading
supabase functions deploy set-role

# Optionally redeploy telegram-verify (no changes, but good to sync)
supabase functions deploy telegram-verify
```

**Manual Deployment** (if CLI unavailable):
1. Go to Supabase Dashboard → Edge Functions
2. Update `set-role` function with contents from `supabase/functions/set-role/index.ts`
3. Click Deploy

### Step 2: Deploy Frontend

```bash
# Build is already complete - files in dist/
# Deploy dist/ to your hosting

# Examples:
netlify deploy --prod --dir=dist
# OR
vercel --prod
# OR copy dist/ to your web server
```

### Step 3: Clear Browser State

**CRITICAL**: Old sessions without proper claims will cause issues

```javascript
// In browser console BEFORE testing
localStorage.clear();
sessionStorage.clear();

// Sign out of any existing session
const supabase = window.__SUPABASE_CLIENT__;
await supabase?.auth.signOut();

// Reload
location.reload();
```

---

## 🧪 Testing & Verification

### Test 1: Check JWT Structure

After app loads, in browser console:

```javascript
// View the raw JWT payload
window.__JWT_RAW_PAYLOAD__

// Should show:
{
  sub: "user-uuid",
  user_id: "user-uuid",        // ✅ Custom claim
  telegram_id: "8448635084",   // ✅ Custom claim
  user_role: "owner",          // ✅ Custom claim
  app_role: "owner",           // ✅ Custom claim
  workspace_id: "uuid",        // ✅ Custom claim
  app_metadata: {
    provider: "telegram"       // ✅ Shows Telegram auth
  },
  // ... other standard JWT fields
}
```

### Test 2: Run Full Diagnostics

```javascript
await window.runAuthDiagnostics()

// Expected output:
// ✅ Telegram data available
// ✅ Session active
// ✅ All required JWT claims present
// ✅ User record found
// Summary: "✅ All checks passed"
```

### Test 3: Verify Role Change Works

1. Navigate to User Management page
2. Find a test user
3. Try changing their role
4. Should succeed without CORS or permission errors

**Check Console** - should show:
```
Caller info: {
  role: "owner",
  workspace_id: "uuid",
  has_custom_claims: true,
  provider: "telegram"
}
Update successful: { id, role: "new_role", ... }
```

---

## 📊 Expected Console Logs

### On App Load (Success Path)

```
🔐 ensureTwaSession: Starting authentication check
🔑 ensureTwaSession: No valid session found, creating new one
📱 ensureTwaSession: Found Telegram initData
📡 Calling telegram-verify
📥 telegram-verify response: { status: 200, ok: true }
📦 ensureTwaSession: Backend response received
🔑 ensureTwaSession: Setting session with received JWT token
📋 Claims included: { user_id, telegram_id, role, workspace_id }
🔐 Access token preview: eyJhbGciOiJIUzI1NiIsIn...

🔍 JWT Payload decoded: {
  sub: "uuid",
  user_id: "uuid",
  telegram_id: "8448635084",
  user_role: "owner",
  app_role: "owner",
  workspace_id: "uuid",
  provider: "telegram",
  exp: "2025-10-13T..."
}

✅ ensureTwaSession: Session established successfully {
  user_id: "uuid",
  provider: "telegram",
  decoded_claims: { user_id, telegram_id, user_role, ... },
  has_all_claims: true
}

📊 Debug: Access window.__SUPABASE_SESSION__, window.__JWT_CLAIMS__, and window.__JWT_RAW_PAYLOAD__
```

### On Role Change (Success Path)

```
Caller info: {
  role: "owner",
  workspace_id: "uuid",
  has_custom_claims: true,
  provider: "telegram"
}
Updating user role: { user_id, new_role, updated_by: "owner" }
Update successful: { id, telegram_id, username, role: "manager", ... }
```

---

## 🔍 Troubleshooting

### Issue: "Provider is 'email' instead of 'telegram'"

**Diagnosis**:
```javascript
window.__JWT_RAW_PAYLOAD__.app_metadata.provider
// If shows "email" instead of "telegram"
```

**Cause**: telegram-verify returned 401, frontend fell back to clientSideAuth

**Fix**:
1. Check Supabase Edge Function logs for telegram-verify
2. Look for "HMAC verification FAILED" or other errors
3. Verify `TELEGRAM_BOT_TOKEN` is correct
4. Ensure bot token has no extra whitespace

### Issue: "Missing user_role in JWT"

**Diagnosis**:
```javascript
window.__JWT_RAW_PAYLOAD__
// Check if user_role, telegram_id are at root level
```

**Cause**: Old JWT structure or clientSideAuth fallback was used

**Fix**:
1. Clear browser storage: `localStorage.clear(); sessionStorage.clear()`
2. Reload app to get fresh JWT from telegram-verify
3. Verify telegram-verify Edge Function is deployed

### Issue: "set-role returns 403 Forbidden"

**Diagnosis**:
Check Edge Function logs for set-role, look for:
```
Caller info: { role: undefined, has_custom_claims: false }
```

**Cause**: set-role can't read claims from JWT

**Fix**:
1. Verify set-role Edge Function deployed with updated code
2. Check that JWT has user_role at root level
3. Try signing out and back in to get fresh JWT

---

## 🎯 Success Criteria

After deployment, all these should be true:

✅ `window.__JWT_RAW_PAYLOAD__.provider` === "telegram"
✅ `window.__JWT_RAW_PAYLOAD__.user_id` exists
✅ `window.__JWT_RAW_PAYLOAD__.telegram_id` exists
✅ `window.__JWT_RAW_PAYLOAD__.user_role` exists
✅ `window.runAuthDiagnostics()` shows "All checks passed"
✅ User Management page loads without errors
✅ Role changes succeed without CORS or permission errors
✅ Business context loads correctly
✅ Session persists across page reloads

---

## 🔐 Environment Variables Check

Verify in Supabase Dashboard → Edge Functions → Secrets:

### telegram-verify needs:
- ✅ `TELEGRAM_BOT_TOKEN` (your bot token, ~45 chars, no spaces)
- ✅ `SUPABASE_URL` (auto-set)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (auto-set)
- ✅ `SUPABASE_JWT_SECRET` (auto-set)

### set-role needs:
- ✅ `SUPABASE_URL` (auto-set)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (auto-set)

---

## 📚 Additional Resources

- Full implementation details: `TELEGRAM_AUTH_FIX_COMPLETE.md`
- Console debugging reference: `CONSOLE_DEBUG_REFERENCE.md`
- Quick start guide: `QUICK_START_AUTH_FIX.md`
- Technical summary: `AUTHENTICATION_FIX_SUMMARY.md`

---

## 🆘 Getting Help

If issues persist, collect this debug info:

```javascript
const debugInfo = {
  jwt_payload: window.__JWT_RAW_PAYLOAD__,
  jwt_claims: window.__JWT_CLAIMS__,
  diagnostics: await window.runAuthDiagnostics(),
  session_user_id: window.__SUPABASE_SESSION__?.user.id,
  provider: window.__JWT_RAW_PAYLOAD__?.app_metadata?.provider,
  has_custom_claims: !!(
    window.__JWT_RAW_PAYLOAD__?.user_id &&
    window.__JWT_RAW_PAYLOAD__?.telegram_id &&
    window.__JWT_RAW_PAYLOAD__?.user_role
  )
};

console.log(JSON.stringify(debugInfo, null, 2));
copy(JSON.stringify(debugInfo, null, 2)); // Copy to clipboard
```

Also provide:
1. Supabase Edge Function logs for telegram-verify
2. Supabase Edge Function logs for set-role (when testing role change)
3. Browser console logs

---

## ✅ Deployment Checklist

- [ ] Deploy set-role Edge Function
- [ ] Deploy telegram-verify Edge Function (optional, no changes)
- [ ] Deploy frontend (dist/ folder)
- [ ] Clear browser storage before testing
- [ ] Run `window.runAuthDiagnostics()` after app loads
- [ ] Verify `window.__JWT_RAW_PAYLOAD__` has custom claims
- [ ] Test user role change
- [ ] Verify session persists across reloads
- [ ] Check all pages load correctly

---

The authentication system is now properly integrated with comprehensive logging at every step. You'll be able to see exactly what's in the JWT and where any issues occur.
