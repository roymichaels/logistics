# Deploy Telegram Verify Function - FIXED

## What's Fixed
The signature verification algorithm now uses the correct Telegram Mini App method:
- Lines 65-67: Changed from `createHash('sha256')` to `createHmac('sha256', 'WebAppData')`
- This matches Telegram's official validation algorithm for Mini Apps

## Deploy via Supabase Dashboard (Easiest)

### Step 1: Access Your Edge Functions
Go to: https://supabase.com/dashboard/project/0ec90b57d6e95fcbda19832f/functions

### Step 2: Find or Create Function
- Look for `telegram-verify` in the list
- If it exists: Click on it, then click **"Edit"**
- If it doesn't exist: Click **"New Function"**, name it `telegram-verify`

### Step 3: Copy the Fixed Code
The complete fixed code is in:
```
/tmp/cc-agent/57871658/project/supabase/functions/telegram-verify/index.ts
```

### Step 4: Deploy
1. Paste the entire code into the Supabase editor
2. Click **"Deploy"** or **"Save & Deploy"**
3. Wait for deployment to complete (usually 10-30 seconds)

### Step 5: Verify Environment Variables
Make sure these secrets are set in your Supabase project:
- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token
- `APP_OWNER_TELEGRAM_ID` - Telegram ID of the platform owner (optional)
- `FIRST_ADMIN_USERNAME` - First admin username (optional)

Check at: https://supabase.com/dashboard/project/0ec90b57d6e95fcbda19832f/settings/functions

## Deploy via CLI (Alternative)

If you prefer CLI and have access:

```bash
# Login first
npx supabase login

# Deploy
npx supabase functions deploy telegram-verify --project-ref 0ec90b57d6e95fcbda19832f --no-verify-jwt
```

## What This Fix Does

### Before (BROKEN)
```typescript
// Login Widget algorithm - WRONG for Mini Apps
const secretKey = createHash('sha256').update(botToken).digest();
```

### After (FIXED)
```typescript
// Mini App algorithm - CORRECT per Telegram docs
const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
```

### Reference
https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app

## Testing After Deployment

1. Open your Mini App in Telegram
2. Try to authenticate
3. Check the Supabase Edge Function logs:
   https://supabase.com/dashboard/project/0ec90b57d6e95fcbda19832f/logs/edge-functions

You should see:
- ✅ "HMAC verification SUCCEEDED"
- ✅ "Session created successfully with JWT claims"
- ✅ No more 401 errors

## Troubleshooting

If you still see 401 errors after deployment:

1. **Check bot token**: Verify `TELEGRAM_BOT_TOKEN` matches the bot that launched your Mini App
2. **Check for spaces**: Bot token should have no extra spaces or newlines
3. **Multiple bots**: Make sure you're using the token from the correct bot
4. **View logs**: Check Edge Function logs for detailed error messages
