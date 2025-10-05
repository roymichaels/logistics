# Debug: "אימות Telegram נכשל" Error

## What You're Seeing

Error message: "אימות Telegram נכשל - נסה שוב" (Telegram authentication failed - try again)

## Root Cause

The `ensureTwaSession()` function is calling `telegram-verify` edge function and getting an error response.

## Diagnostic Steps

### Step 1: Open Browser Console

1. Open Telegram Mini App
2. Open browser DevTools (method varies by platform)
3. Go to Console tab
4. Look for these log messages:

```
🔐 ensureTwaSession: Starting authentication check
📡 Calling telegram-verify: { url, hasInitData, initDataPreview }
📥 telegram-verify response: { status, statusText, ok }
```

### Step 2: Check What Error is Returned

Look for one of these patterns:

**Pattern A: 404 Not Found**
```
❌ ensureTwaSession: Backend verification failed
status: 404
error: "Function not found"
```
**Solution**: telegram-verify edge function not deployed

**Pattern B: 401/403 Unauthorized**
```
❌ ensureTwaSession: Backend verification failed
status: 401
error: "Invalid signature"
```
**Solution**: TELEGRAM_BOT_TOKEN not set or wrong

**Pattern C: 500 Server Error**
```
❌ ensureTwaSession: Backend verification failed
status: 500
error: [error message from edge function]
```
**Solution**: Check Supabase Edge Function logs

**Pattern D: Network Error**
```
❌ ensureTwaSession: Exception during authentication
TypeError: Failed to fetch
```
**Solution**: SUPABASE_URL not set or wrong

### Step 3: Verify Environment Variables

In console, run:

```javascript
console.log('SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Has initData:', !!window?.Telegram?.WebApp?.initData);
```

Expected output:
```
SUPABASE_URL: https://your-project.supabase.co
Has initData: true
```

If SUPABASE_URL is undefined → **Fix .env file**
If Has initData is false → **Not running in Telegram Mini App**

## Common Fixes

### Fix 1: Edge Function Not Deployed

```bash
# Deploy the telegram-verify function
supabase functions deploy telegram-verify
```

Or in Supabase Dashboard:
1. Go to Edge Functions
2. Check if `telegram-verify` exists
3. If not, deploy it from `/supabase/functions/telegram-verify/index.ts`

### Fix 2: Missing TELEGRAM_BOT_TOKEN

In Supabase Dashboard:
1. Go to Edge Functions → Configuration
2. Add secret: `TELEGRAM_BOT_TOKEN` = `your-bot-token`
3. Redeploy telegram-verify function

### Fix 3: Wrong initData Format

The edge function expects:
```json
{
  "type": "webapp",
  "initData": "query_id=...&user=...&auth_date=...&hash=..."
}
```

Check in console:
```javascript
console.log('initData:', window.Telegram?.WebApp?.initData);
```

Should be a long URL-encoded string with `hash=` at the end.

### Fix 4: Edge Function Error

Check Supabase Edge Function logs:
1. Go to Supabase Dashboard → Edge Functions
2. Click on `telegram-verify`
3. View Logs tab
4. Look for error messages

Common issues:
- Missing `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` secrets
- Database connection errors
- Invalid SQL queries

## Quick Test

Run this in console to test the edge function directly:

```javascript
(async () => {
  const initData = window.Telegram?.WebApp?.initData;
  if (!initData) {
    console.error('No initData - not in Telegram Mini App');
    return;
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-verify`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'webapp', initData })
    }
  );

  console.log('Status:', response.status);
  const result = await response.json();
  console.log('Result:', result);

  if (result.session) {
    console.log('✅ telegram-verify is working!');
    console.log('Tokens received:', {
      access_token: result.session.access_token.substring(0, 20) + '...',
      refresh_token: result.session.refresh_token.substring(0, 20) + '...'
    });
  } else {
    console.error('❌ No session tokens in response');
  }
})();
```

Expected output:
```
Status: 200
Result: { ok: true, valid: true, user: {...}, session: {...} }
✅ telegram-verify is working!
Tokens received: { access_token: "eyJ...", refresh_token: "..." }
```

## If Still Not Working

1. **Export console logs:**
   ```javascript
   copy(console.log.history || 'No history');
   ```

2. **Check Network tab:**
   - Look for the call to `/functions/v1/telegram-verify`
   - Check request body
   - Check response

3. **Check Edge Function logs in Supabase Dashboard**

4. **Verify bot token:**
   ```bash
   # Test your bot token
   curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe"
   ```
   Should return bot info

5. **Try fresh cache:**
   - Close Telegram Mini App completely
   - Clear browser cache
   - Reopen from Telegram

## After Fixing

Once you identify and fix the issue:

1. Rebuild frontend if needed:
   ```bash
   npm run build:web
   ```

2. Redeploy:
   ```bash
   # Deploy edge function if changed
   supabase functions deploy telegram-verify

   # Deploy frontend
   [your hosting platform deploy command]
   ```

3. Test again with fresh cache

## Most Likely Issue

Based on the error "אימות Telegram נכשל", the most likely causes are:

1. **telegram-verify edge function not deployed** (404)
2. **TELEGRAM_BOT_TOKEN not set in Supabase** (401)
3. **Wrong Supabase URL in .env** (network error)

Check these three first before diving deeper.
