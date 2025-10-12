# Quick Test Guide - Telegram Authentication

**Updated:** October 12, 2025
**Status:** Ready to test

---

## 🚀 Quick Test Steps

### 1. Open the Mini App
Open your Telegram Mini App in Telegram (desktop or mobile)

### 2. Open Developer Console
- **Desktop Telegram:** Press F12 or right-click → Inspect
- **Mobile:** Use remote debugging if available

### 3. Watch for Success Messages

**Look for these logs:**
```
✅ Telegram user data loaded: {id: ..., username: ...}
📱 Starting Telegram authentication...
📡 Calling telegram-verify endpoint...
✅ Authentication successful
✅ Session established successfully
```

**If you see this - IT WORKS! ✅**

---

## Expected Console Output

### Successful Authentication Flow
```javascript
// 1. Telegram SDK initialization
🎬 Telegram Mini App SDK initialized

// 2. Supabase initialization
✅ Supabase initialized successfully in XXXms

// 3. Authentication starts
🔐 Initializing authentication...
📱 Starting Telegram authentication...
📡 Calling telegram-verify endpoint...

// 4. Backend verification (Edge Function logs)
📲 Telegram verification request: { type: 'webapp', hasInitData: true }
🔑 Bot token loaded (length: 46)
✅ HMAC verification passed
✅ Telegram user verified: [your-username]
✅ User found: [user-id]
✅ Auth user metadata updated
🎫 Creating session using admin API...
✅ Session created successfully
✅ Session tokens validated successfully

// 5. Frontend success
✅ Authentication successful
✅ Session established successfully
```

---

## Diagnostic Commands

### Check Authentication Status
```javascript
// Run in browser console
window.runAuthDiagnostics()
```

**Expected Output:**
```
🔍 === Authentication Diagnostics ===
✅ Supabase initialized: true
✅ User authenticated: true
✅ User ID: [your-user-id]
✅ Telegram ID: [your-telegram-id]
✅ Session valid: true
✅ JWT contains telegram_id: true
```

### Check Session Details
```javascript
// View current session
window.__SUPABASE_SESSION__

// Should return:
{
  access_token: "eyJ...",
  refresh_token: "...",
  expires_at: 1234567890,
  user: {
    id: "...",
    email: "telegram_[id]@twa.local",
    user_metadata: {
      telegram_id: "...",
      username: "...",
      name: "..."
    }
  }
}
```

### Full Diagnostics
```javascript
// Complete system check
window.runFullDiagnostics()
```

---

## Troubleshooting

### ❌ Error: "Invalid Telegram signature"
**Cause:** Bot token mismatch

**Fix:**
1. Check which bot is launching your Mini App in @BotFather
2. Verify that bot's token is in Supabase secrets
3. Token must match exactly (no spaces, correct format)

**How to check:**
```
1. Open @BotFather in Telegram
2. Send: /mybots
3. Find your bot
4. Click "API Token"
5. Compare with Supabase Dashboard → Edge Functions → Secrets
```

### ❌ Error: "Failed to create session"
**Cause:** Supabase configuration issue

**Fix:**
1. Check Supabase Dashboard → Edge Functions → telegram-verify
2. Click "Logs" tab
3. Look for specific error message
4. Verify SUPABASE_SERVICE_ROLE_KEY is set

### ❌ Error: "Bot token not configured"
**Cause:** TELEGRAM_BOT_TOKEN missing from Supabase

**Fix:**
```
1. Go to Supabase Dashboard
2. Navigate to: Edge Functions → Configuration → Secrets
3. Add secret: TELEGRAM_BOT_TOKEN = [your-bot-token]
4. Wait 30 seconds for propagation
5. Reload Mini App
```

### ❌ Network errors / Timeout
**Cause:** Connection issues

**Fix:**
1. Check internet connection
2. Verify Supabase project is active
3. Test endpoint manually:
```javascript
fetch('https://ncuyyjvvzeaqqjganbzz.supabase.co/functions/v1/telegram-verify', {
  method: 'OPTIONS'
}).then(r => console.log('Reachable:', r.ok))
```

---

## Edge Function Logs

### How to View
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click: Edge Functions (in sidebar)
4. Click: telegram-verify
5. Click: Logs tab

### What to Look For

**Good Signs ✅**
```
🔑 Bot token loaded (length: 46)
✅ HMAC verification passed
✅ User found: [user-id]
✅ Session created successfully
```

**Bad Signs ❌**
```
❌ TELEGRAM_BOT_TOKEN not configured
❌ HMAC verification failed
❌ Failed to create session
```

---

## Testing Different Scenarios

### Test 1: New User Registration
1. Use a Telegram account that hasn't used the app before
2. Open the Mini App
3. Check logs - should see "Creating new user"
4. Verify user appears in Supabase → Table Editor → users

### Test 2: Returning User Login
1. Use a Telegram account that has used the app before
2. Open the Mini App
3. Check logs - should see "User found"
4. Verify profile data is updated

### Test 3: Multiple Sessions
1. Open Mini App in Telegram Desktop
2. Open same Mini App in Telegram Mobile
3. Both should authenticate successfully
4. Each gets their own session tokens

---

## Success Criteria

✅ **Authentication is fixed if:**
- No more "OTP verification failed" errors
- Users can log in immediately
- Console shows "✅ Session established successfully"
- No 500 errors from telegram-verify endpoint
- Edge function logs show "✅ Session created successfully"

---

## Performance Metrics

### Expected Timing
- **Total authentication time:** 500-2000ms
- **Telegram signature verification:** 5-20ms
- **User lookup/creation:** 50-200ms
- **Session creation:** 100-300ms
- **Token validation:** 10-50ms

### If Slower Than Expected
- Check Supabase region/latency
- Check network connection
- Look for database query slowness in logs

---

## Next Steps After Successful Test

1. ✅ Confirm authentication works
2. ✅ Test on different devices (mobile/desktop)
3. ✅ Test with different Telegram accounts
4. ✅ Monitor for any errors over 24 hours
5. ✅ Consider adding success rate analytics

---

## Quick Verification Checklist

- [ ] Mini App opens without errors
- [ ] Console shows Telegram user data loaded
- [ ] Console shows authentication successful
- [ ] No 500 errors in Network tab
- [ ] Edge function logs show successful flow
- [ ] User can access app features
- [ ] Session persists on refresh
- [ ] Authentication works on mobile
- [ ] Authentication works on desktop

---

**Questions?** Check AUTHENTICATION_FIXED.md for detailed technical documentation.
