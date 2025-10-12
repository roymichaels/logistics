# Quick Setup Guide: Configure TELEGRAM_BOT_TOKEN

## Current Issue

Your app is showing this error:
```
❌ Backend authentication failed (401)
⚠️ TELEGRAM_BOT_TOKEN is not configured in Supabase secrets
```

## Why This Happens

The Telegram Mini App sends authentication data to your Supabase Edge Function, which needs to verify it's legitimate using your bot's secret token. Without this token, the backend can't verify users and rejects all authentication attempts with a 401 error.

## Fix in 5 Minutes

### Step 1: Get Your Bot Token

1. Open Telegram
2. Search for `@BotFather`
3. Send: `/mybots`
4. Select your bot from the list
5. Click: **API Token**
6. Copy the token (it looks like this: `7898654321:AAH8f3jKl2nM9pQ5rS6tU7vW8xY9zA0bC1d`)

### Step 2: Add Token to Supabase

1. Go to: https://supabase.com/dashboard
2. Select your project: `ncuyyjvvzeaqqjganbzz`
3. Navigate to: **Edge Functions** (in sidebar)
4. Click: **Configuration** tab
5. Click: **Secrets** section
6. Click: **Add Secret** button

Enter:
- **Name**: `TELEGRAM_BOT_TOKEN`
- **Value**: `[paste your token here]`

7. Click **Save**

### Step 3: Test

1. Reload your Mini App in Telegram
2. Open browser developer tools (F12 if in desktop Telegram)
3. Look for: `✅ ensureTwaSession: Session established successfully`

## Troubleshooting

### "Still getting 401 errors"

**Wait 10-30 seconds after saving the secret** - Supabase needs a moment to propagate the secret to edge functions.

**Verify the token is correct:**
- Token should be from the SAME bot that launches your Mini App
- Token format: numbers, colon, alphanumeric string
- No extra spaces or characters

**Check in Supabase:**
- Go to Edge Functions → Configuration → Secrets
- Verify `TELEGRAM_BOT_TOKEN` appears in the list
- Check there's no typo in the secret name (case-sensitive)

### "How do I know which bot to use?"

The bot token must match the bot that has your Mini App configured in BotFather:
1. In @BotFather, send `/mybots`
2. Find the bot with your Mini App URL configured
3. Use THAT bot's token

### "Can I test locally without this?"

Yes, but you need to:
1. Create a `.env` file in your project root
2. Add: `TELEGRAM_BOT_TOKEN=your_token_here`
3. The local edge functions will pick it up

For the deployed app, you MUST configure it in Supabase dashboard.

## Verification Commands

After configuration, test in browser console:

```javascript
// Run full diagnostics
window.runFullDiagnostics()

// Check session
console.log(window.__SUPABASE_SESSION__)

// View JWT claims
console.log(window.__JWT_CLAIMS__)
```

## Expected Results

### Before Configuration
```
POST .../functions/v1/telegram-verify 401 (Unauthorized)
❌ ensureTwaSession: Backend verification failed
⚠️ TELEGRAM_BOT_TOKEN Configuration Required
```

### After Configuration
```
POST .../functions/v1/telegram-verify 200 (OK)
✅ ensureTwaSession: Session established successfully
✅ TWA session established with JWT claims
```

## Security Notes

- **Keep your bot token secret** - Never commit it to Git
- The token gives full control of your bot
- Supabase secrets are encrypted at rest
- Edge functions access the token securely via environment variables

## Still Having Issues?

Run diagnostics:
```javascript
window.runFullDiagnostics()
```

Check for:
- `supabaseInitialized: true`
- `telegramAvailable: true`
- `telegramInitData: true`
- `telegramUser: true`

If any are `false`, see the main [RACE_CONDITION_FIX.md](./RACE_CONDITION_FIX.md) document for detailed troubleshooting.

---

**Time to fix:** 5 minutes
**Difficulty:** Easy
**Impact:** Resolves all 401 authentication errors
