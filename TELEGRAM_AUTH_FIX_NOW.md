# Fix Telegram 401 "Invalid signature" Error - Action Plan

**Status**: 🔴 Authentication failing with 401 error
**Root Cause**: Bot token misconfiguration or mismatch
**Fix Time**: 5 minutes once token is correct

---

## Quick Diagnosis

Run this in your browser console when the Mini App loads:

```javascript
// Quick diagnostic
(async () => {
  const WebApp = window.Telegram?.WebApp;

  console.log('=== TELEGRAM MINI APP DIAGNOSTIC ===\n');

  console.log('1. Environment Check:');
  console.log('   - Running in Telegram:', !!WebApp);
  console.log('   - Has initData:', !!WebApp?.initData);
  console.log('   - initData length:', WebApp?.initData?.length || 0);
  console.log('   - User ID:', WebApp?.initDataUnsafe?.user?.id);
  console.log('   - Username:', WebApp?.initDataUnsafe?.user?.username);

  if (!WebApp?.initData) {
    console.error('❌ Not running in Telegram Mini App - must open from Telegram');
    return;
  }

  console.log('\n2. Testing Edge Function:');
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  console.log('   - Supabase URL:', supabaseUrl);

  const url = `${supabaseUrl}/functions/v1/telegram-verify`;
  console.log('   - Calling:', url);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'webapp',
        initData: WebApp.initData
      })
    });

    console.log('   - Response status:', response.status);
    console.log('   - Response ok:', response.ok);

    const result = await response.json();
    console.log('   - Result:', result);

    if (response.status === 200) {
      console.log('\n✅ SUCCESS - Authentication working!');
      console.log('User:', result.user);
    } else if (response.status === 401) {
      console.log('\n❌ FAILED - Invalid signature (HMAC mismatch)');
      console.log('This means the TELEGRAM_BOT_TOKEN in Supabase is wrong or missing');
    } else if (response.status === 404) {
      console.log('\n❌ FAILED - Edge function not found');
      console.log('Need to deploy telegram-verify edge function');
    } else {
      console.log('\n❌ FAILED - Unexpected error');
    }
  } catch (error) {
    console.error('\n💥 EXCEPTION:', error.message);
  }

  console.log('\n=== NEXT STEPS ===');
  console.log('If you see 401 error:');
  console.log('1. Go to Supabase Dashboard → Edge Functions → Configuration');
  console.log('2. Check if TELEGRAM_BOT_TOKEN is set');
  console.log('3. Get correct token from @BotFather');
  console.log('4. Delete old token, set new one');
  console.log('5. Redeploy telegram-verify function');
})();
```

---

## The Problem

The edge function uses HMAC-SHA256 to verify that requests come from Telegram:

```
1. Telegram sends: initData with hash
2. Edge function computes: HMAC(bot_token, data)
3. If hashes match → ✅ Valid
4. If hashes DON'T match → ❌ 401 "Invalid signature"
```

**If you're getting 401, the bot token in Supabase doesn't match the bot that opened your Mini App.**

---

## Step-by-Step Fix

### Step 1: Identify Your Bot

1. Open Telegram
2. Find the bot that opens your Mini App
3. Remember its exact username (e.g., `@YourBot`)

### Step 2: Get Bot Token from @BotFather

1. Open Telegram and search for `@BotFather`
2. Send: `/mybots`
3. Select **the exact bot from Step 1**
4. Click: "API Token"
5. Copy the ENTIRE token

**Expected format**: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz-123456789`
**Length**: 43-46 characters
**Structure**: `[numbers]:[letters/numbers/dashes]`

### Step 3: Test Bot Token

Test that the token works:

```bash
# Replace <YOUR_TOKEN> with your actual token
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getMe"
```

**Expected response**:
```json
{
  "ok": true,
  "result": {
    "id": 1234567890,
    "is_bot": true,
    "first_name": "Your Bot Name",
    "username": "your_bot_username"
  }
}
```

If you get an error, the token is invalid - get it again from @BotFather.

### Step 4: Configure Supabase

#### Option A: Via Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to: **Edge Functions** (left sidebar)
4. Click: **Configuration** tab
5. Look for existing bot token variables - DELETE these if they exist:
   - `BOT_TOKEN`
   - `TELEGRAM_TOKEN`
   - `VITE_TELEGRAM_BOT_TOKEN`
   - Any other variations
6. Click: **Add secret**
7. Name (exactly): `TELEGRAM_BOT_TOKEN`
8. Value: Paste your token from @BotFather
   - ⚠️ NO quotes
   - ⚠️ NO spaces before/after
   - ⚠️ NO newlines
   - ⚠️ Just the raw token
9. Click: **Save**

#### Option B: Via CLI (If you have Supabase CLI)

```bash
# Set the token
supabase secrets set TELEGRAM_BOT_TOKEN=your_token_here

# Verify it's set
supabase secrets list
```

### Step 5: Deploy Edge Function

#### Option A: Via Dashboard

1. In Supabase Dashboard
2. Go to: **Edge Functions**
3. Find: `telegram-verify`
4. Click: **Deploy** or **Redeploy**
5. Wait for: "Deployed successfully"

#### Option B: Via CLI

```bash
# If you have the CLI installed
supabase functions deploy telegram-verify

# Wait for success message
```

### Step 6: Verify the Fix

1. **Close the Telegram Mini App completely**
2. **Reopen it from Telegram** (send `/start` to your bot, click the Mini App button)
3. **Open browser console** (if using Telegram Desktop, or remote debugging on mobile)
4. **Run the diagnostic script** from the top of this document
5. **Check the output**:

**Success looks like**:
```
Response status: 200
Response ok: true
✅ SUCCESS - Authentication working!
```

**Still failing looks like**:
```
Response status: 401
❌ FAILED - Invalid signature
```

### Step 7: Check Edge Function Logs

If still getting 401:

1. Go to Supabase Dashboard
2. Navigate to: **Edge Functions → telegram-verify**
3. Click: **Logs** tab
4. Look for recent entries
5. Find these key log lines:

**What you should see (SUCCESS)**:
```
📱 Telegram verify request: { type: "webapp", hasInitData: true }
🔑 Using bot token: 1234567890...xyz (length: 46)
🔐 verifyTelegramWebApp: Starting HMAC verification
✅ Hash from Telegram: abc123...
🔐 Computed hash: abc123...
🔐 Expected hash: abc123...
✅ Match: true
✅ HMAC verification SUCCEEDED
Telegram verification succeeded for user: 123456789
```

**What indicates WRONG TOKEN**:
```
🔐 Computed hash: abc123...
🔐 Expected hash: xyz789...
✅ Match: false
❌ HMAC verification FAILED
Possible causes:
1. Wrong TELEGRAM_BOT_TOKEN (not matching the bot that launched the Mini App)
```

---

## Common Mistakes

### Mistake #1: Multiple Bots

**Problem**: You have multiple bots and mixed up the tokens

**Solution**:
1. Identify which bot opens the Mini App (check bot username in Telegram)
2. Get token for THAT SPECIFIC bot from @BotFather
3. Use only that token in Supabase

### Mistake #2: Token Has Spaces

**Problem**: Copy-paste added spaces or newlines

**Solution**:
1. Copy token from @BotFather
2. Paste into a text editor first
3. Verify no spaces before/after
4. Copy from text editor to Supabase

### Mistake #3: Didn't Redeploy

**Problem**: Set token but forgot to redeploy edge function

**Solution**:
1. Go to Edge Functions dashboard
2. Click "Deploy" or "Redeploy" on telegram-verify
3. Wait for success message
4. Test again

### Mistake #4: Wrong Bot

**Problem**: Token is from Bot A, but Mini App opens from Bot B

**Solution**:
1. In Telegram, click the Mini App button
2. Check which bot sent you the Mini App
3. Get token for that EXACT bot
4. Not for any other bot you own

---

## Troubleshooting Checklist

- [ ] **Got token from @BotFather** for the correct bot
- [ ] **Tested token** with curl - returns bot info
- [ ] **Set in Supabase** as `TELEGRAM_BOT_TOKEN` (exact name)
- [ ] **No spaces/quotes** in token value
- [ ] **Deleted old tokens** (BOT_TOKEN, etc.)
- [ ] **Redeployed edge function** after setting token
- [ ] **Closed and reopened** Telegram Mini App
- [ ] **Checked logs** in Supabase dashboard
- [ ] **Verified bot username** matches the one opening Mini App

---

## Alternative: Use Client-Side Auth

If you can't get the edge function working, the app has a client-side fallback:

The `TelegramAuth` component automatically falls back to client-side authentication if the backend verification fails. This means:

1. Users can still authenticate
2. User registration still works
3. Role selection still appears
4. App is still functional

The only difference is that validation happens on the client instead of server.

To rely on client-side auth:
1. Comment out the `authenticateWithBackend()` call in `TelegramAuth.tsx`
2. Always use `authenticateClientSide()` instead
3. Backend verification is skipped

**However, server-side verification is more secure, so fixing the token is preferred.**

---

## Success Criteria

You'll know it's fixed when:

✅ Diagnostic script shows `status: 200`
✅ Edge function logs show `✅ Match: true`
✅ Browser console shows "Session established successfully"
✅ UserManagement page loads user list
✅ No "Invalid signature" errors

---

## Still Not Working?

If you've followed all steps and still getting 401:

1. **Export diagnostics**:
   - Run diagnostic script, copy output
   - Check edge function logs, copy output
   - Note which bot username opens the Mini App
   - Note which bot token you're using (first 10 chars)

2. **Verify bot configuration**:
   ```bash
   # Check bot info
   curl "https://api.telegram.org/bot<TOKEN>/getMe"

   # Should return bot details
   ```

3. **Check Mini App URL**:
   - In @BotFather, send `/mybots`
   - Select your bot
   - Click "Bot Settings" → "Menu Button"
   - Verify the URL is correct
   - Verify it points to your Supabase project

4. **Try a new test bot**:
   - Create fresh bot with @BotFather: `/newbot`
   - Set up Mini App URL
   - Use new bot's token
   - Test if it works with new bot
   - If yes, old bot has an issue

---

## Quick Command Reference

```bash
# Test bot token
curl "https://api.telegram.org/bot<TOKEN>/getMe"

# Set token via CLI
supabase secrets set TELEGRAM_BOT_TOKEN=your_token

# Deploy function via CLI
supabase functions deploy telegram-verify

# View function logs via CLI
supabase functions logs telegram-verify

# List all secrets via CLI
supabase secrets list
```

---

## After Success

Once authentication works:

1. ✅ Close and reopen Mini App - should load instantly
2. ✅ No errors in browser console
3. ✅ UserManagement shows users
4. ✅ Role changes work
5. ✅ All features accessible

The fix is permanent - authentication will work for all users going forward.

---

**Need Help?**

If you're stuck, provide:
1. Bot username that opens the Mini App
2. First 10 characters of the token you're using
3. Output from diagnostic script
4. Edge function logs from Supabase dashboard

This will make it easy to identify the exact issue.
