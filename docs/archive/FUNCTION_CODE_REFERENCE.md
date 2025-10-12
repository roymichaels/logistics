# Edge Function Code Reference

This file contains the exact code to copy-paste when deploying via Supabase Dashboard.

---

## 1. telegram-verify (CRITICAL - Deploy This First!)

**Path**: `supabase/functions/telegram-verify/index.ts`

Copy the entire contents of this file. Key features:
- ✅ HMAC signature verification
- ✅ User creation with auth.admin.createUser
- ✅ Password update for existing users to prevent credential mismatch
- ✅ Retry logic (3 attempts with exponential backoff)
- ✅ Session token generation
- ✅ User table upsert with role field
- ✅ Proper CORS headers

**File location**: `supabase/functions/telegram-verify/index.ts` (216 lines)

---

## 2. telegram-webhook

**Path**: `supabase/functions/telegram-webhook/index.ts`

**Dependencies**: Requires `_shared/cors.ts`

### Main file: telegram-webhook/index.ts
Copy from: `supabase/functions/telegram-webhook/index.ts`

### Shared dependency: _shared/cors.ts
```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};
```

---

## 3. Other Functions (Nice to Have)

### bootstrap
**Path**: `supabase/functions/bootstrap/index.ts`
Purpose: App initialization and preferences

### set-role
**Path**: `supabase/functions/set-role/index.ts`
Purpose: User role management

### promote-manager
**Path**: `supabase/functions/promote-manager/index.ts`
Purpose: Promote users to manager role

### user-mode
**Path**: `supabase/functions/user-mode/index.ts`
Purpose: User mode preferences

### superadmin-auth
**Path**: `supabase/functions/superadmin-auth/index.ts`
Purpose: Superadmin authentication

### app-config
**Path**: `supabase/functions/app-config/index.ts`
Purpose: Application configuration

### seed-demo
**Path**: `supabase/functions/seed-demo/index.ts`
Purpose: Demo data seeding (optional)

---

## Environment Variables Required

All functions require these secrets to be set in Supabase Dashboard:
- Settings → Edge Functions → Secrets

### Critical Secrets:
```
TELEGRAM_BOT_TOKEN          - Your bot token from @BotFather
SUPABASE_URL               - https://ncuyyjvvzeaqqjganbzz.supabase.co
SUPABASE_SERVICE_ROLE_KEY  - Service role key for admin operations
```

### Optional Secrets:
```
TELEGRAM_WEBHOOK_SECRET    - Webhook verification token
WEBAPP_URL                 - Your deployed app URL
```

---

## Dashboard Deployment Steps

### For telegram-verify:

1. Go to: https://supabase.com/dashboard/project/ncuyyjvvzeaqqjganbzz/functions
2. Click "New Function" (or edit if exists)
3. Name: `telegram-verify`
4. Open local file: `supabase/functions/telegram-verify/index.ts`
5. Copy entire contents (all 216 lines)
6. Paste into dashboard editor
7. Click "Deploy"
8. Wait for green "Deployed" status

### For telegram-webhook:

1. Same process as above
2. Name: `telegram-webhook`
3. Copy from: `supabase/functions/telegram-webhook/index.ts`
4. If it references `_shared/cors.ts`, you may need to:
   - Either inline the CORS headers
   - Or create a separate `_shared/cors.ts` function (if dashboard supports it)

---

## Verification Commands

After deploying, verify with:

```bash
# Test telegram-verify endpoint
curl -X POST https://ncuyyjvvzeaqqjganbzz.supabase.co/functions/v1/telegram-verify \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Expected: 500 error about missing initData (means function is running!)

# Test telegram-webhook endpoint
curl -X POST https://ncuyyjvvzeaqqjganbzz.supabase.co/functions/v1/telegram-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Expected: Should return "OK" or handle gracefully
```

---

## Quick Checklist

- [ ] All secrets set in Dashboard → Settings → Edge Functions → Secrets
- [ ] `telegram-verify` deployed and shows "Deployed" status
- [ ] Test curl command returns 500 (not 404)
- [ ] Logs show function execution attempts
- [ ] Frontend points to correct URL: `https://ncuyyjvvzeaqqjganbzz.supabase.co/functions/v1/telegram-verify`

---

## File Sizes Reference

```
telegram-verify/index.ts    - 216 lines, ~7.5 KB
telegram-webhook/index.ts   - 107 lines, ~2.6 KB
_shared/cors.ts            - 6 lines, ~180 bytes
```

All functions use TypeScript and Deno runtime (default for Supabase Edge Functions).
