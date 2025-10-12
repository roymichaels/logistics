# Telegram Bot Token Configuration Guide

## Problem

If you're seeing a **401 Unauthorized** error when authenticating through the Telegram Mini App, it means the `TELEGRAM_BOT_TOKEN` secret is not configured correctly in your Supabase project.

**Error Messages You Might See:**
- `Failed to load resource: the server responded with a status of 401 ()`
- `אימות Telegram נכשל` (Telegram authentication failed)
- `Signature verification failed: undefined`
- `Backend authentication failed`

## Solution

You need to configure the correct Telegram Bot Token in your Supabase Edge Functions secrets.

---

## Step 1: Get Your Telegram Bot Token

### 1.1 Identify Which Bot Launches Your Mini App

Open your Telegram Mini App and note the bot username that appears in the header. This is the bot that needs to be configured.

### 1.2 Get the Token from BotFather

1. Open Telegram and search for `@BotFather`
2. Send the command: `/mybots`
3. Select your bot from the list
4. Click on **"API Token"**
5. Copy the token (format: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 1.3 Verify the Token Works

Test the token using curl:

```bash
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getMe"
```

You should see:
```json
{"ok":true,"result":{"id":123456789,"is_bot":true,"first_name":"YourBot",...}}
```

If you get an error, the token is invalid. Get a fresh token from BotFather.

---

## Step 2: Configure Supabase Secrets

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions → Configuration**
3. Click on the **Secrets** tab
4. Look for any existing bot token secrets and delete them:
   - `BOT_TOKEN` (old name - delete)
   - `TELEGRAM_TOKEN` (old name - delete)
   - `TELEGRAM_BOT_TOKEN` (correct name - update if exists)

5. Add or update the secret:
   - **Name:** `TELEGRAM_BOT_TOKEN`
   - **Value:** Your bot token from BotFather (paste exactly, no quotes or spaces)

6. Click **Save** or **Add Secret**

### Option B: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Set the secret
supabase secrets set TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# Verify it was set
supabase secrets list
```

---

## Step 3: Redeploy Edge Function

After updating the secret, you MUST redeploy the `telegram-verify` Edge Function for the changes to take effect.

### Using Dashboard:

1. Go to **Edge Functions** in your Supabase dashboard
2. Find `telegram-verify` in the list
3. Click **Deploy** or **Redeploy**
4. Wait for the deployment to complete

### Using CLI:

```bash
supabase functions deploy telegram-verify
```

---

## Step 4: Verify the Fix

### 4.1 Close and Reopen the Mini App

1. Completely close the Telegram Mini App
2. Reopen it from Telegram
3. The app should now authenticate successfully

### 4.2 Check Browser Console (Optional)

If you're using Telegram Desktop, you can open the DevTools:

1. Right-click in the Mini App → Inspect
2. Go to Console tab
3. Look for these log messages:
   - `✅ Telegram WebApp ready and expanded`
   - `✅ TWA session established with JWT claims`
   - `✅ AppServicesProvider initialized successfully!`

### 4.3 Run Diagnostic (Optional)

In the browser console, run:

```javascript
window.runAuthDiagnostics()
```

This will show you the complete authentication status.

---

## Common Issues and Solutions

### Issue: Still Getting 401 After Setting Token

**Possible Causes:**
1. Forgot to redeploy the Edge Function after setting the secret
2. Used the wrong bot's token (check which bot launches your Mini App)
3. Token was copied incorrectly (extra spaces, quotes, or incomplete)

**Solution:**
1. Verify the token works: `curl "https://api.telegram.org/bot<TOKEN>/getMe"`
2. Delete and re-add the secret in Supabase dashboard
3. Redeploy `telegram-verify` Edge Function
4. Close and reopen the Mini App

### Issue: Multiple Bots, Which Token to Use?

**Solution:**
Use the token for the bot that has the Mini App button/link. To check:
1. Open your Mini App from Telegram
2. Look at the bot username in the header
3. That's the bot whose token you need

### Issue: Token Keeps Getting Lost

**Cause:**
Secrets are stored in Supabase project settings, not in your code. They persist across deployments.

**Solution:**
Once set correctly, you shouldn't need to set it again unless:
- You create a new Supabase project
- You rotate your bot token in BotFather
- You accidentally delete the secret

### Issue: Works in Browser But Not in Telegram

**Cause:**
The Mini App URL in BotFather doesn't match your deployed URL.

**Solution:**
1. Go to @BotFather → Your Bot → Bot Settings → Mini Apps
2. Ensure the URL exactly matches your deployed app URL:
   - Must be HTTPS
   - Must match the domain exactly
   - No query parameters in the URL
3. Example: `https://your-app.netlify.app`

---

## Security Notes

1. **Never commit the bot token to your repository**
   - Tokens should only be in Supabase secrets
   - Never put tokens in `.env` files that get committed

2. **Rotate tokens if compromised**
   - If your token is exposed, revoke it in BotFather
   - Generate a new token
   - Update the Supabase secret
   - Redeploy the Edge Function

3. **Separate tokens for development and production**
   - Consider using different bots for testing and production
   - This prevents accidental mixing of test and real data

---

## Verification Checklist

After configuration, verify:

- [ ] Token copied correctly from BotFather (no extra spaces)
- [ ] Secret named exactly `TELEGRAM_BOT_TOKEN` in Supabase
- [ ] `telegram-verify` Edge Function redeployed after setting secret
- [ ] Mini App URL in BotFather matches deployed app URL
- [ ] Mini App reopened from Telegram (not just refreshed)
- [ ] Authentication succeeds without 401 errors
- [ ] User can access the app dashboard

---

## Getting Help

If you've followed all steps and authentication still fails:

1. Check Supabase Edge Function logs:
   ```bash
   supabase functions logs telegram-verify
   ```

2. Look for specific error messages in the logs

3. Verify the Edge Function is deployed and accessible:
   ```bash
   curl -X POST "https://your-project.supabase.co/functions/v1/telegram-verify" \
     -H "Content-Type: application/json" \
     -d '{"type":"webapp","initData":"test"}'
   ```

   Should return 401 with error message (not 404)

4. Check that `SUPABASE_SERVICE_ROLE_KEY` exists in Edge Function environment:
   - This is auto-configured by Supabase
   - Only needed if you're using self-hosted Supabase

---

## Quick Reference Commands

```bash
# Get bot info (verify token)
curl "https://api.telegram.org/bot<TOKEN>/getMe"

# Set secret (CLI)
supabase secrets set TELEGRAM_BOT_TOKEN=<YOUR_TOKEN>

# List secrets (CLI)
supabase secrets list

# Deploy Edge Function (CLI)
supabase functions deploy telegram-verify

# View logs (CLI)
supabase functions logs telegram-verify
```

---

## Related Documentation

- [docs/telegram-authentication.md](./docs/telegram-authentication.md) - Complete authentication flow
- [QUICK_START_AUTH.md](./QUICK_START_AUTH.md) - Quick authentication setup guide
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Full deployment checklist

---

**Last Updated:** 2025-10-12

This guide specifically addresses the 401 authentication error caused by missing or incorrect `TELEGRAM_BOT_TOKEN` configuration in Supabase Edge Functions.
