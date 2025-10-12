# Debugging 401 Authentication Errors

**Status:** Token is configured, but signature verification is failing

## Current Situation

You have `TELEGRAM_BOT_TOKEN` configured in Supabase (updated Oct 11, 2025), but the telegram-verify function is still returning 401 errors. This means the issue is likely **signature verification failure**, not missing token.

## Why Signature Verification Fails

The 401 error on line 144-149 of `telegram-verify/index.ts` happens when:

1. **Wrong bot token** - Token in Supabase doesn't match the bot launching the Mini App
2. **Expired initData** - Telegram initData is too old (>24 hours)
3. **Modified initData** - Data was altered between Telegram and your server
4. **Bot misconfiguration** - Mini App URL not properly set in BotFather

## Step 1: Verify Bot Token Matches

The bot token in Supabase MUST be from the SAME bot that launches your Mini App.

### Check which bot is configured:
1. Open BotFather in Telegram
2. Send: `/mybots`
3. Find the bot with your Mini App URL
4. Check: **Menu Button** or **Web App** settings
5. Verify the URL matches: `https://thebull.dog` or your deployment URL

### Verify token in Supabase:
1. Go to Supabase Dashboard → Edge Functions → Secrets
2. Check `TELEGRAM_BOT_TOKEN` secret
3. Compare with the bot token from BotFather for the SAME bot

**If they don't match, update the secret with the correct token**

## Step 2: Deploy Updated Function with Better Logging

I've added enhanced logging to help diagnose the issue. Deploy the updated function:

### Option A: Via Supabase Dashboard (Easiest)
1. Go to Supabase Dashboard
2. Navigate to: **Edge Functions** → **telegram-verify**
3. Click: **Edit Function**
4. Copy the contents of `supabase/functions/telegram-verify/index.ts`
5. Paste and save
6. Click: **Deploy**

### Option B: Via Supabase CLI
```bash
# Login to Supabase
npx supabase login

# Deploy the function
npx supabase functions deploy telegram-verify
```

## Step 3: Test and Read Logs

After deploying, test the authentication:

### 1. Reload your Mini App in Telegram

### 2. Check Function Logs:

**In Supabase Dashboard:**
1. Go to: **Edge Functions** → **telegram-verify** → **Logs**
2. Look for recent invocations
3. Check for these log messages:

```
✅ Good signs:
🔑 Token loaded - length: XX | Prefix: XXXXXXXXXX
🔐 Verifying webapp initData...
📊 InitData preview: query_id=...
✅ HMAC verified: true
✅ Verified Telegram user: username

❌ Problem indicators:
❌ Missing hash in initData
❌ HMAC verified: false
❌ Telegram verification failed
⚠️ Invalid request type or missing data
```

## Step 4: Interpret the Logs

### If you see: `❌ Missing hash in initData`
**Problem:** InitData is malformed or empty
**Fix:**
- Ensure Mini App is launched from Telegram (not browser)
- Check BotFather configuration has correct URL
- Verify Telegram.WebApp.initData is not empty

### If you see: `❌ HMAC verified: false`
**Problem:** Signature doesn't match
**Possible causes:**
1. Wrong bot token (most common)
2. InitData was modified/corrupted
3. Telegram API version mismatch

**Fix:**
- Verify bot token matches the bot launching the app
- Try restarting Telegram and relaunching the Mini App
- Check bot is properly configured in BotFather

### If you see: `❌ TELEGRAM_BOT_TOKEN is not set`
**Problem:** Secret not loaded
**Fix:**
- Re-add the secret in Supabase Dashboard
- Wait 30 seconds for propagation
- Redeploy the function

## Step 5: Compare Bot Configurations

### What you need to match:

**In BotFather:**
```
Bot: @YourBot
Web App URL: https://thebull.dog
```

**In Supabase Secrets:**
```
TELEGRAM_BOT_TOKEN: [token from @YourBot]
```

**In your Mini App:**
```
Accessed via: @YourBot menu button or direct link
```

All three must use the SAME bot!

## Common Misconfigurations

### Multiple Bots
If you have multiple bots:
- Bot A has Mini App URL configured → Use Bot A's token
- Bot B is just for testing → Don't use Bot B's token
- The token must match the bot users click to open the app

### Wrong URL in BotFather
```
✅ Correct: https://thebull.dog
❌ Wrong: http://thebull.dog (no HTTPS)
❌ Wrong: https://thebull.dog/ (trailing slash)
❌ Wrong: Different domain entirely
```

### Cached Bot Configuration
Sometimes BotFather changes take time to propagate:
- Wait 1-2 minutes after changing configuration
- Close and reopen Telegram
- Try on a different device

## Step 6: Test with Fresh Data

### Clear all caches:
```javascript
// In browser console (F12)
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Relaunch from Telegram:
1. Close the Mini App
2. Close Telegram completely
3. Reopen Telegram
4. Launch Mini App again

### Check initData is fresh:
```javascript
// In browser console
console.log(window.Telegram.WebApp.initData);
console.log('Length:', window.Telegram.WebApp.initData.length);
```

Should show a long string (500+ characters). If empty or short, that's your problem.

## Step 7: Enable Debug Mode

### In browser console:
```javascript
// Run full diagnostics
window.runFullDiagnostics()

// Check Telegram data
console.log('Telegram:', window.Telegram?.WebApp);
console.log('InitData:', window.Telegram?.WebApp?.initData);
console.log('User:', window.Telegram?.WebApp?.initDataUnsafe?.user);
```

### Expected output:
```javascript
{
  supabaseInitialized: true,
  telegramAvailable: true,
  telegramInitData: true,  // ← Must be true
  telegramUser: true,      // ← Must be true
  ...
}
```

## Alternative: Test Locally

If you want to test the verification logic locally:

### 1. Create local .env:
```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
SUPABASE_URL=https://ncuyyjvvzeaqqjganbzz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Run function locally:
```bash
npx supabase functions serve telegram-verify
```

### 3. Test with curl:
```bash
curl -X POST http://localhost:54321/functions/v1/telegram-verify \
  -H "Content-Type: application/json" \
  -d '{"type":"webapp","initData":"query_id=..."}'
```

## Expected Results After Fix

### Frontend logs:
```
📡 Calling telegram-verify: {url: '...', attempt: 1}
📥 telegram-verify response: {status: 200, ok: true}
✅ ensureTwaSession: Session established successfully
```

### Backend logs (Supabase):
```
🔑 Token loaded - length: 46 | Prefix: 1234567890
🔐 Verifying webapp initData...
✅ HMAC verified: true
👤 Parsed user: John (123456789)
✅ Verified Telegram user: john_doe
✅ Session created for user: uuid-here
```

## Still Not Working?

### Collect diagnostic info:

```javascript
// Run in browser console
const diagnostics = {
  initialization: window.getInitStatus(),
  telegram: window.Telegram?.WebApp,
  session: window.__SUPABASE_SESSION__,
  claims: window.__JWT_CLAIMS__
};
console.log(JSON.stringify(diagnostics, null, 2));
```

Copy this output and check:
1. Is `telegramInitData` true?
2. Is `telegramUser` present?
3. Does `initData` have length > 100?

### Manual token verification:

Get your bot token and test verification manually:
```bash
# Get initData from browser console
# window.Telegram.WebApp.initData

# Test with Telegram's API
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe"
```

Should return bot info. If error, token is invalid.

## Summary

**Most likely cause:** Wrong bot token or bot misconfiguration in BotFather

**Quick fix checklist:**
- [ ] Verify bot token matches the bot with Mini App URL
- [ ] Check BotFather configuration has correct URL
- [ ] Deploy updated function with better logging
- [ ] Read function logs to see exact error
- [ ] Test with fresh initData (close/reopen Telegram)

**After fix:** You should see HTTP 200 responses and successful authentication.
