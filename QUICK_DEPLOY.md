# Quick Deploy - 3 Steps to Fix Auth

## Step 1: Set Bot Token in Supabase (2 minutes)

1. Get your bot token from @BotFather:
   - Open Telegram
   - Search for `@BotFather`
   - Send `/mybots`
   - Select your bot
   - Click "API Token"
   - Copy the token (format: `1234567890:ABC...`)

2. Add to Supabase:
   - Go to https://supabase.com/dashboard
   - Select your project
   - Go to **Edge Functions** → **Configuration**
   - Click "Add Secret"
   - Name: `TELEGRAM_BOT_TOKEN`
   - Value: Paste your bot token
   - Click "Save"

## Step 2: Deploy Edge Function (1 minute)

```bash
supabase functions deploy telegram-verify
```

Wait for deployment to complete.

## Step 3: Deploy Frontend (2 minutes)

The build is already complete in `dist/` folder.

Deploy to your hosting platform:

```bash
# Example for Netlify
netlify deploy --prod --dir=dist

# Example for Vercel
vercel --prod

# Or your custom deployment command
```

---

## Test (30 seconds)

1. Open your bot in Telegram
2. Click the Mini App button
3. App should load successfully

If you see an error, open DevTools console and look for:
- ✅ `200 OK` → Success
- ❌ `404` → Edge function not deployed (redo Step 2)
- ❌ `401 Invalid signature` → Wrong bot token (redo Step 1)
- ❌ `500 TELEGRAM_BOT_TOKEN not configured` → Secret not set (redo Step 1)

---

## Done!

Authentication should now work:
- No more "אימות Telegram נכשל" errors
- UserManagement loads correctly
- Role updates work
- Session persists

Total time: **~5 minutes**

If issues persist, see `DEBUG_AUTH_ERROR.md` for detailed troubleshooting.
