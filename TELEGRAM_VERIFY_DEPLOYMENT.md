# Telegram Verify Edge Function - Deployment Checklist

## Critical Environment Variables

The `telegram-verify` edge function requires these environment variables to be set in **Supabase Dashboard**:

### 1. TELEGRAM_BOT_TOKEN (REQUIRED)

This is your bot's token from @BotFather.

**Where to find it:**
1. Open Telegram
2. Search for @BotFather
3. Send `/mybots`
4. Select your bot
5. Click "API Token"
6. Copy the token (format: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

**Where to set it:**
1. Go to Supabase Dashboard
2. Navigate to: **Edge Functions → Configuration**
3. Click "Add Secret"
4. Name: `TELEGRAM_BOT_TOKEN`
5. Value: Paste your bot token
6. Click "Save"

### 2. SUPABASE_URL (Auto-configured)

This is automatically available in edge functions.
No action needed.

### 3. SUPABASE_SERVICE_ROLE_KEY (Auto-configured)

This is automatically available in edge functions.
No action needed.

---

## Deployment Steps

### Step 1: Verify Edge Function Exists

```bash
# List all edge functions
supabase functions list
```

You should see `telegram-verify` in the list.

If not, deploy it:

```bash
# Deploy telegram-verify
supabase functions deploy telegram-verify
```

### Step 2: Test Edge Function

Run this in your browser console (or with curl):

```javascript
// Test in browser console
(async () => {
  const botToken = 'YOUR_BOT_TOKEN_HERE'; // From @BotFather

  // Create test initData (this won't work, just testing connectivity)
  const testData = 'query_id=test&user={"id":123}&auth_date=1234567890&hash=test';

  const response = await fetch(
    'https://YOUR_PROJECT.supabase.co/functions/v1/telegram-verify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'webapp', initData: testData })
    }
  );

  console.log('Status:', response.status);
  console.log('Response:', await response.text());
})();
```

**Expected responses:**

✅ **200 OK** or **401 Invalid signature** = Edge function is working (401 is expected with test data)
❌ **404 Not Found** = Edge function not deployed
❌ **500 Server Error** + "TELEGRAM_BOT_TOKEN not configured" = Environment variable missing

### Step 3: Verify Environment Variables

In Supabase Dashboard → Edge Functions → Configuration:

```
TELEGRAM_BOT_TOKEN = [your-bot-token]  ✅ Set
SUPABASE_URL = [auto]                   ✅ Auto
SUPABASE_SERVICE_ROLE_KEY = [auto]      ✅ Auto
```

### Step 4: Check Edge Function Logs

After deploying:

1. Go to Supabase Dashboard
2. Navigate to: **Edge Functions → telegram-verify**
3. Click **Logs** tab
4. Look for:
   ```
   Telegram verify request: { type: "webapp", hasInitData: true }
   ```

If you see:
- `TELEGRAM_BOT_TOKEN not configured` → Go back to Step 1
- `Invalid signature` → Normal for invalid data, function is working
- `Telegram verification succeeded for user: [id]` → Perfect!

---

## Frontend Configuration

### .env File

Ensure your `.env` file has:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Build and Deploy

```bash
# Build
npm run build:web

# Deploy to your platform
# (Netlify, Vercel, etc.)
```

---

## Testing End-to-End

### Test 1: Open in Telegram Mini App

1. Open your bot in Telegram
2. Send `/start`
3. Click the Mini App button
4. Open browser DevTools console

### Test 2: Check Console Logs

Look for this sequence:

```
🔐 ensureTwaSession: Starting authentication check
📡 Calling telegram-verify: { url, hasInitData: true, initDataPreview: "..." }
📥 telegram-verify response: { status: 200, ok: true }
📦 ensureTwaSession: Backend response received { ok: true, has_session: true, has_tokens: true }
🔑 ensureTwaSession: Setting session with received tokens
✅ ensureTwaSession: Session established successfully { user_id: "...", role: "..." }
```

### Test 3: Verify Session

Run in console:

```javascript
window.__JWT_CLAIMS__
```

Should output:
```javascript
{
  role: "owner",
  user_id: "uuid-here",
  telegram_id: "123456789",
  workspace_id: "uuid-here"
}
```

---

## Troubleshooting

### Error: "TELEGRAM_BOT_TOKEN not configured"

**Solution:**
1. Go to Supabase Dashboard → Edge Functions → Configuration
2. Add `TELEGRAM_BOT_TOKEN` secret
3. Redeploy: `supabase functions deploy telegram-verify`

### Error: "Invalid signature" (401)

**Cause:** Bot token doesn't match the bot that opened the Mini App

**Solution:**
1. Verify you're using the correct bot token
2. Make sure you're opening the Mini App from the correct bot
3. Check that Mini App URL is configured correctly in @BotFather

### Error: "Function not found" (404)

**Solution:**
```bash
supabase functions deploy telegram-verify
```

### Error: Network error / CORS

**Solution:**
1. Check VITE_SUPABASE_URL in .env
2. Verify edge function has CORS headers (already included in code)
3. Clear browser cache and try again

### Edge Function Logs Show Nothing

**Solution:**
1. Check if edge function is actually being called (Network tab in DevTools)
2. Verify URL is correct: `https://YOUR_PROJECT.supabase.co/functions/v1/telegram-verify`
3. Check request body format matches expected structure

---

## Success Criteria

All these should be ✅:

- [ ] Edge function deployed (`supabase functions list` shows `telegram-verify`)
- [ ] TELEGRAM_BOT_TOKEN set in Supabase Dashboard
- [ ] Test request returns 200 or 401 (not 404 or 500)
- [ ] Frontend console shows successful auth sequence
- [ ] `window.__JWT_CLAIMS__` contains user data
- [ ] App loads successfully with user role

---

## Quick Reference Commands

```bash
# Deploy edge function
supabase functions deploy telegram-verify

# View edge function logs
supabase functions logs telegram-verify

# Test bot token
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getMe"

# List all edge functions
supabase functions list
```

---

## Support

If authentication still fails after following this checklist:

1. Check browser console for detailed error messages
2. Check Supabase Edge Function logs
3. Verify bot token with @BotFather
4. Test bot token with Telegram API directly
5. Clear all caches and try fresh

The detailed error message in console will tell you exactly what's wrong:
- `404` → Function not deployed
- `401` + "Invalid signature" → Wrong bot token or bot mismatch
- `500` + "TELEGRAM_BOT_TOKEN not configured" → Missing env var
- Network error → Wrong SUPABASE_URL
