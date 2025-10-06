# Console Debugging Reference - Telegram Authentication

Quick reference for debugging authentication issues in browser console.

---

## Quick Diagnostics

### Run Full Diagnostic Scan
```javascript
await window.runAuthDiagnostics()
```

**Expected Output**:
- ✅ All checks passed - authentication is working correctly

**If Failed**, see recommendations in output.

---

## Session Inspection

### Check Current Session
```javascript
window.__SUPABASE_SESSION__
```

**Should Show**:
```javascript
{
  access_token: "eyJ...",
  user: {
    id: "uuid...",
    app_metadata: { provider: "telegram" }
  }
}
```

### Check JWT Claims
```javascript
window.__JWT_CLAIMS__
```

**Should Show**:
```javascript
{
  user_id: "uuid...",
  telegram_id: "8448635084",
  role: "owner",
  workspace_id: "uuid...",
  provider: "telegram"
}
```

### Decode JWT Manually
```javascript
const token = window.__SUPABASE_SESSION__.access_token;
const payload = JSON.parse(atob(token.split('.')[1]));
console.log(payload);
```

---

## Session Tracker

### View Session Report
```javascript
window.printSessionReport()
```

### Check If Session Ready
```javascript
window.sessionTracker.isReady()
// Should return: true
```

### View All Checkpoints
```javascript
window.sessionTracker.getCheckpoints()
```

### Verify Session Manually
```javascript
await window.sessionTracker.verifySession()
```

**Expected Output**:
```javascript
{
  valid: true,
  hasSession: true,
  hasClaims: true,
  claims: { user_id, telegram_id, role, ... },
  errors: []
}
```

---

## Telegram Data

### Check Telegram WebApp Availability
```javascript
window.Telegram?.WebApp
```

### Check Init Data
```javascript
window.Telegram?.WebApp?.initData
```

### Check User Data
```javascript
window.Telegram?.WebApp?.initDataUnsafe?.user
```

**Should Show**:
```javascript
{
  id: 8448635084,
  first_name: "Name",
  username: "username",
  language_code: "en"
}
```

---

## Supabase Client

### Get Current Session
```javascript
const supabase = window.__SUPABASE_CLIENT__;
const { data } = await supabase.auth.getSession();
console.log(data.session);
```

### Get Current User
```javascript
const { data } = await supabase.auth.getUser();
console.log(data.user);
```

### Check Auth State
```javascript
const { data } = await supabase.auth.getSession();
console.log({
  isAuthenticated: !!data.session,
  userId: data.session?.user.id,
  provider: data.session?.user.app_metadata?.provider
});
```

---

## Common Issues

### Issue: "No session found"
**Check**:
```javascript
// 1. Verify Telegram data exists
window.Telegram?.WebApp?.initData

// 2. Check for errors in console

// 3. Run diagnostics
await window.runAuthDiagnostics()
```

### Issue: "Missing JWT claims"
**Check**:
```javascript
// 1. Decode JWT
const token = window.__SUPABASE_SESSION__?.access_token;
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('JWT Payload:', payload);
}

// 2. Check if clientSideAuth was used (wrong)
if (payload?.app_metadata?.provider !== 'telegram') {
  console.error('❌ Using email provider instead of telegram');
  console.log('Frontend fell back to clientSideAuth - check Edge Function logs');
}
```

### Issue: "401 Invalid signature"
**Check Edge Function logs** in Supabase Dashboard:
- Dashboard → Edge Functions → telegram-verify → Logs
- Look for "HMAC verification FAILED"

**Local Debug**:
```javascript
// Check if bot token is configured
fetch('https://your-project.supabase.co/functions/v1/telegram-verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'webapp',
    initData: window.Telegram?.WebApp?.initData
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

---

## Clear Everything and Retry

```javascript
// Clear all storage
localStorage.clear();
sessionStorage.clear();

// Sign out
const supabase = window.__SUPABASE_CLIENT__;
await supabase.auth.signOut();

// Reload
location.reload();
```

---

## Export Diagnostic Data

### Save All Debug Info to File
```javascript
const debugData = {
  timestamp: new Date().toISOString(),
  diagnostics: window.__AUTH_DIAGNOSTICS__,
  session: window.__SUPABASE_SESSION__,
  claims: window.__JWT_CLAIMS__,
  telegramData: window.Telegram?.WebApp?.initDataUnsafe,
  sessionTracker: window.sessionTracker.getCheckpoints()
};

console.log(JSON.stringify(debugData, null, 2));

// Or copy to clipboard
copy(JSON.stringify(debugData, null, 2));
```

---

## Quick Health Check

Run this one-liner to check everything:

```javascript
(async () => {
  const checks = await window.runAuthDiagnostics();
  const sessionReady = window.sessionTracker.isReady();
  const hasClaims = !!window.__JWT_CLAIMS__?.user_id;

  console.log({
    overall: checks.summary,
    sessionReady,
    hasClaims,
    recommendations: checks.recommendations
  });
})();
```

---

## Expected Healthy State

When everything is working:

```javascript
{
  // Telegram data
  window.Telegram?.WebApp?.initData: "query_id=...",
  window.Telegram?.WebApp?.initDataUnsafe?.user: { id, username, ... },

  // Session
  window.__SUPABASE_SESSION__: { access_token, user, ... },

  // Claims
  window.__JWT_CLAIMS__: {
    user_id: "uuid",
    telegram_id: "12345",
    role: "owner",
    workspace_id: "uuid",
    provider: "telegram"
  },

  // Trackers
  window.sessionTracker.isReady(): true,
  await window.runAuthDiagnostics(): { summary: "✅ All checks passed" }
}
```

---

## Getting Help

If all checks fail, provide:
1. Output of `window.runAuthDiagnostics()`
2. Content of `window.__AUTH_DIAGNOSTICS__`
3. Browser console logs
4. Supabase Edge Function logs for telegram-verify
5. Value of TELEGRAM_BOT_TOKEN (first 10 characters only)
