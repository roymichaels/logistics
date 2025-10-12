# Quick Fix for 401 Errors

## TL;DR
Your bot token is configured, but signature verification is failing. Most likely cause: **wrong bot token** or **stale function deployment**.

## 3-Step Fix (5 minutes)

### Step 1: Verify Token Matches Bot
```
1. Open @BotFather in Telegram
2. Send: /mybots
3. Find bot with Mini App URL: https://thebull.dog
4. Click: API Token
5. Compare with token in Supabase secrets
```

**If different → Update the secret in Supabase**

### Step 2: Deploy Updated Function
```
1. Go to: https://supabase.com/dashboard
2. Edge Functions → telegram-verify
3. Copy code from: supabase/functions/telegram-verify/index.ts
4. Paste and Deploy
```

### Step 3: Check Logs
```
1. Edge Functions → telegram-verify → Logs
2. Look for:
   ✅ "HMAC verified: true" → Success!
   ❌ "HMAC verified: false" → Wrong token
```

## Test It Works

In browser console (F12):
```javascript
window.runFullDiagnostics()
```

Should show all `true`:
```
supabaseInitialized: true
telegramInitData: true
telegramUser: true
```

## Still Failing?

Read: `DEBUGGING_401_ERRORS.md` for detailed troubleshooting.

---
**Files:** All changes already committed and built ✅
**Time:** 5 minutes to fix
