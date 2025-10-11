# Telegram Authentication Recovery Guide

This guide consolidates every actionable note about resolving the Telegram Mini App `401 Invalid signature` failure. Follow it whenever Telegram authentication stops working.

## When to Use This Guide

Run through this checklist whenever you see one of the following in the Mini App or logs:

- `אימות Telegram נכשל: 401: {"valid":false,"error":"Invalid signature"}`
- The Mini App reports "Invalid signature" or stays on the loader after launch.
- `telegram-verify` edge function returns `valid: false`.

## Summary

1. Confirm you are using the bot that opens the Mini App and fetch its token from **@BotFather**.
2. Set the token as the `TELEGRAM_BOT_TOKEN` secret in Supabase (Dashboard or CLI).
3. Redeploy the `telegram-verify` edge function.
4. Re-open the Mini App and verify with one of the diagnostics below.

## Step-by-Step Fix

### 1. Identify the Bot

1. Launch the Mini App from Telegram and note the bot username from the header.
2. If you have multiple bots, ensure you know which one triggers the Mini App button.

### 2. Fetch the Token

```text
Telegram → @BotFather → /mybots → <your bot> → API Token
```

Tokens are ~45 characters and follow the format `<digits>:<mixed characters>`.

### 3. Validate the Token

```bash
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getMe"
```

`{"ok": true, ...}` confirms the token is valid. Fetch it again if you receive an error.

### 4. Update Supabase Secrets

**Dashboard**

1. Navigate to **Edge Functions → Configuration**.
2. Delete outdated variations (`BOT_TOKEN`, `TELEGRAM_TOKEN`, etc.).
3. Add `TELEGRAM_BOT_TOKEN` with the value from BotFather (no quotes or spaces).

**CLI**

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=your_token_here
supabase secrets list
```

### 5. Redeploy `telegram-verify`

```bash
supabase functions deploy telegram-verify
```

Or press **Deploy** inside the Supabase dashboard. Wait for a success confirmation.

### 6. Re-open the Mini App

Close the Mini App fully, then launch it again from Telegram so that it requests fresh init data.

## Diagnostics

Use at least one diagnostic after the redeploy to confirm the fix.

### Automated Script

```bash
./verify-deployment.sh
```

The script reports whether the edge function is reachable and returns actionable follow-up steps.

### Browser Console Snippet

Run inside the Mini App console (Telegram Desktop or remote debugging):

```javascript
(async () => {
  const WebApp = window.Telegram?.WebApp;
  if (!WebApp?.initData) {
    console.error('❌ Not running inside Telegram.');
    return;
  }

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-verify`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'webapp', initData: WebApp.initData })
  });

  console.log('Status:', response.status);
  console.log('Result:', await response.json());
})();
```

`Status: 200` confirms the session is issued. `401` points to an incorrect bot token; `404` means the function was not deployed.

### Visual Diagnostic Page

1. Deploy the app, then open `/telegram-diagnostic.html` from the Mini App.
2. Select **בדוק אימות** to view connection results, Telegram state, and localized recommendations.

## Additional Checks

- Ensure the Mini App URL in **@BotFather → Bot Settings → Mini Apps** exactly matches your deployed origin (HTTPS, no query params).
- Confirm the project uses the latest build (cache-busting is already included; users may still need to reopen the app).
- If the Mini App works in a regular browser but fails in Telegram, the issue is configuration (bot token or BotFather URL).

## End-to-End Flow Reference

Use this ASCII sequence when you need a quick refresher on the happy-path handshake between Telegram, Supabase, and the client. It captures the production flow after the HMAC and session fixes.

```
┌──────────────────────────────────────────────────────────────────────┐
│                    1. TELEGRAM INITIALIZATION                        │
├──────────────────────────────────────────────────────────────────────┤
│  User opens the Mini App                                             │
│  Telegram WebApp SDK loads initData                                  │
│  `TelegramService` stores initData/initDataUnsafe                     │
└──────────────────┬───────────────────────────────────────────────────┘
                   │ 100–500 ms guard delay
                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    2. FRONTEND AUTHENTICATION                        │
├──────────────────────────────────────────────────────────────────────┤
│  `TelegramAuth` component validates Telegram availability            │
│  Sends `initData` to `telegram-verify` edge function                 │
└──────────────────┬───────────────────────────────────────────────────┘
                   │ HTTPS POST
                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    3. BACKEND VERIFICATION                           │
├──────────────────────────────────────────────────────────────────────┤
│  `telegram-verify` validates signature and assembles claims          │
│  Creates/updates Supabase auth user and session                      │
│  Returns `{ access_token, refresh_token, claims }`                   │
└──────────────────┬───────────────────────────────────────────────────┘
                   │ JSON response
                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    4. SESSION ESTABLISHMENT                          │
├──────────────────────────────────────────────────────────────────────┤
│  Frontend calls `supabase.auth.setSession()`                         │
│  Session tracker confirms JWT claims and readiness                   │
│  Application renders protected views                                 │
└──────────────────────────────────────────────────────────────────────┘
```

## Signature Verification Checklist

The Mini App uses the Telegram **Web App** algorithm. Double-check the highlighted block before redeploying the edge function:

```ts
const secretKey = createHmac('sha256', 'WebAppData')
  .update(botToken)
  .digest();
```

- Never fall back to `createHash('sha256')`; that is for Login Widgets and will cause persistent 401 responses.
- When rotating the bot token, redeploy `telegram-verify` immediately so the HMAC uses the latest secret.
- Review the Supabase logs after deployment—you should see a `SIGNATURE_OK` entry for successful verifications.

## Fallback Decision Tree

`ensureTwaSession()` only invokes the lightweight fallback when the backend explicitly allows it. Use this rubric when triaging incidents:

- **Backend success (200):** set the session using backend tokens and skip fallback entirely.
- **Backend 401 with `will_use_fallback: true`:** continue with `clientSideAuth()` so users can keep working while the token is repaired.
- **Backend 401 without the flag:** treat as a hard failure—surface an error instead of issuing a claim-less session.
- **Network errors/timeouts:** retry once, then fall back so field teams are not blocked.

The fallback path still requires Telegram context but omits HMAC guarantees, so schedule a follow-up redeploy even if users can sign in.

## Deployment Pointers for `telegram-verify`

- `supabase functions deploy telegram-verify` is the canonical command for shipping fixes.
- If you must use the dashboard, paste the verified source from the repository and redeploy—secrets are preserved automatically.
- Always re-run `./verify-deployment.sh` and the console snippet above to validate the fresh build.

## Expanded Diagnostics & Console Utilities

- `window.runAuthDiagnostics()` prints a full health report (Telegram context, Supabase session, JWT claim presence, and recommended remediation steps).
- `window.sessionTracker?.getReport()` verifies that claim propagation completed before rendering role-dependent views.
- `window.debugTelegramAuth?.()` (see `src/lib/authDiagnostics.ts`) dumps the last verification result plus the fallback state, which is invaluable when Telegram misroutes traffic.

### Regression Tests

Run these smoke tests after every deployment or bot-token rotation:

1. Launch the Mini App from a clean Telegram client. Confirm `telegram-verify` returns HTTP 200 and the session indicator turns green.
2. Execute `await sessionTracker.waitForSession(5000)` in the console—the promise should resolve with a populated claim set.
3. From the User Management page, trigger `window.runAuthDiagnostics()` and ensure there are no ❌ markers.
4. Optional: run `npm run test -- TelegramAuth` to execute the component tests that assert fallback toggling, logging, and Supabase session integration.

## After the Fix

- Watch for console logs prefixed with `TELEGRAM WEBAPP DEBUG` to verify init data is present.
- Keep `verify-deployment.sh` handy for future regression checks.
- If you rotate bot tokens, repeat the steps above immediately after rotation.

## Superseded References

This document replaces the following ad-hoc guides:

- `START_HERE.md`
- `QUICK_FIX_CHECKLIST.md`
- `README_TELEGRAM_401_FIX.md`
- `TELEGRAM_AUTH_FIX_NOW.md`
- `TELEGRAM_401_COMPLETE_SOLUTION.md`
- `TELEGRAM_AUTH_FIX_COMPLETE.md`
- `TELEGRAM_AUTH_FIXES_COMPLETE.md`
- `TELEGRAM_AUTH_VERIFIED.md`
- `TELEGRAM_DEBUG_CHECKLIST.md`
- `AUTHENTICATION_FALLBACK_FIXED.md`
- `AUTHENTICATION_FIX_SUMMARY.md`
- `AUTHENTICATION_FLOW.md`
- `CRITICAL_FIX_TELEGRAM_SIGNATURE.md`
- `DEBUG_AUTH_ERROR.md`
- `FIX_401_SIGNATURE_ERROR.md`
- `TELEGRAM_API_VERSION_FIX.md`
- `TELEGRAM_SIGNATURE_FIX.md`
- `TELEGRAM_VERIFY_DEPLOYMENT.md`
- `TEST_TELEGRAM_AUTH.md`

Delete or archive these files—they are no longer needed when this guide is available.
