# Fix 401 "Invalid signature" Error

**Error:** `{"valid":false,"error":"Invalid signature"}` with status 401

**Cause:** HMAC verification fails because bot token doesn't match or has formatting issues.

---

## Step 1: Get Correct Bot Token

### A. From @BotFather

1. Open Telegram
2. Search for `@BotFather`
3. Send `/mybots`
4. Select **the exact bot that opens your Mini App**
5. Click "API Token"
6. Copy the entire token

**Format:** `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz-123456789`
**Length:** Usually 43-46 characters
**Structure:** `[numbers]:[alphanumeric + dashes]`

### B. Verify Token Works

Test it with curl:

```bash
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getMe"
```

Expected response:
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

If you get an error, the token is invalid.

---

## Step 2: Set Token in Supabase (CRITICAL)

### A. Clean Existing Configuration

1. Go to Supabase Dashboard
2. Navigate to: **Edge Functions → Configuration**
3. Delete ALL of these if they exist:
   - `BOT_TOKEN`
   - `VITE_TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_TOKEN`
   - Any other variations

### B. Set Correct Variable

1. Click "Add Secret"
2. Name (exactly): `TELEGRAM_BOT_TOKEN`
3. Value: Paste your token from @BotFather
4. **IMPORTANT:** Do NOT add quotes, spaces, or newlines
5. **IMPORTANT:** Copy-paste, don't type manually
6. Click "Save"

### C. Verify It's Set Correctly

After saving:
- Name should be: `TELEGRAM_BOT_TOKEN`
- Value should show as: `••••••••••••••••••••••••••••••`
- Length should be 43-46 characters (hover to see length)

---

## Step 3: Deploy Edge Function

```bash
supabase functions deploy telegram-verify
```

Wait for:
```
Deploying function telegram-verify...
Function telegram-verify deployed successfully
```

---

## Step 4: Check Edge Function Logs

After deployment, test the Mini App once, then:

1. Go to Supabase Dashboard
2. Navigate to: **Edge Functions → telegram-verify**
3. Click **Logs** tab
4. Look for these log entries:

### Expected Success Logs:

```
📱 Telegram verify request: { type: "webapp", hasInitData: true }
🔑 Using bot token: 1234567890...xyz (length: 46)
🔐 verifyWebApp: Starting verification
📊 initData length: 427
📊 initData preview: query_id=AAF8...
✅ Hash from Telegram: abc123def456...
📝 dataCheckString length: 350
🔐 Computed hash: abc123def456...
🔐 Expected hash: abc123def456...
✅ Match: true
Telegram verification succeeded for user: 123456789
```

### Common Error Logs:

#### Error A: Token Not Set
```
❌ TELEGRAM_BOT_TOKEN environment variable not set
```
**Fix:** Go back to Step 2 and set the token

#### Error B: Token Has Whitespace
```
⚠️ WARNING: Bot token contains whitespace characters!
```
**Fix:** Delete and re-add the token without any spaces/newlines

#### Error C: Token Too Short
```
⚠️ WARNING: Bot token seems too short. Expected ~45 characters.
```
**Fix:** You copied only part of the token - get the full token from @BotFather

#### Error D: Hash Mismatch
```
🔐 Computed hash: abc123...
🔐 Expected hash: xyz789...
✅ Match: false
❌ HMAC verification failed - hashes do not match
```

**Causes:**
1. **Wrong bot** - Token is from Bot A, but you're opening Mini App from Bot B
2. **Cached token** - Old token still in use, redeploy edge function
3. **initData modified** - Frontend is altering initData before sending

---

## Step 5: Verify in Browser Console

After deployment, open Mini App and check browser console:

### Success Pattern:

```
📡 Calling telegram-verify: { url, hasInitData: true }
📥 telegram-verify response: { status: 200, ok: true }
✅ ensureTwaSession: Session established successfully
```

### Failure Pattern:

```
📡 Calling telegram-verify: { url, hasInitData: true }
📥 telegram-verify response: { status: 401, ok: false }
❌ ensureTwaSession: Backend verification failed
error: "401: {"valid":false,"error":"Invalid signature"}"
```

If you see 401, go to Supabase Edge Function logs (Step 4) to see the detailed error.

---

## Debugging Checklist

Use this checklist to identify the issue:

- [ ] **Token from correct bot?**
  - Open Mini App from bot X
  - Token in Supabase is from bot X
  - Test: Send `/start` to bot, click Mini App, check if it's the same bot

- [ ] **Token copied correctly?**
  - No spaces before or after
  - No newlines
  - Full token copied (43-46 chars)
  - Test: curl `https://api.telegram.org/bot<TOKEN>/getMe` returns bot info

- [ ] **Environment variable name exact?**
  - Name is: `TELEGRAM_BOT_TOKEN` (not BOT_TOKEN, not TELEGRAM_TOKEN)
  - Check spelling and capitalization

- [ ] **Edge function deployed after setting token?**
  - Run: `supabase functions deploy telegram-verify`
  - Wait for "deployed successfully"

- [ ] **Edge function logs show token being used?**
  - Logs show: `🔑 Using bot token: 1234567890...xyz`
  - Length shown is 43-46 characters

- [ ] **initData is being sent from frontend?**
  - Frontend logs show: `hasInitData: true`
  - initData preview shows: `query_id=...`

---

## Quick Test Script

Run this in browser console after opening Mini App:

```javascript
(async () => {
  const initData = window.Telegram?.WebApp?.initData;

  console.log('=== DIAGNOSTIC INFO ===');
  console.log('1. Has initData:', !!initData);
  console.log('2. initData length:', initData?.length || 0);
  console.log('3. initData preview:', initData?.substring(0, 50) + '...');

  if (!initData) {
    console.error('❌ No initData - not running in Telegram Mini App');
    return;
  }

  console.log('\n=== TESTING EDGE FUNCTION ===');

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-verify`;
  console.log('4. Calling:', url);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'webapp', initData })
  });

  console.log('5. Status:', response.status);

  const result = await response.json();
  console.log('6. Result:', result);

  if (response.status === 200) {
    console.log('\n✅ SUCCESS - Authentication working!');
    console.log('User:', result.user);
  } else if (response.status === 401) {
    console.log('\n❌ FAILED - Signature verification failed');
    console.log('Check Supabase Edge Function logs for detailed error');
    console.log('Most likely cause: Wrong TELEGRAM_BOT_TOKEN');
  } else if (response.status === 404) {
    console.log('\n❌ FAILED - Edge function not deployed');
    console.log('Run: supabase functions deploy telegram-verify');
  } else {
    console.log('\n❌ FAILED - Unexpected error');
    console.log('Check Supabase Edge Function logs');
  }

  console.log('\n=== NEXT STEPS ===');
  if (response.status === 401) {
    console.log('1. Go to Supabase Dashboard');
    console.log('2. Edge Functions → telegram-verify → Logs');
    console.log('3. Look for "🔑 Using bot token:" line');
    console.log('4. Verify token matches your bot from @BotFather');
  }
})();
```

Expected output for success:
```
=== DIAGNOSTIC INFO ===
1. Has initData: true
2. initData length: 427
3. initData preview: query_id=AAF8...

=== TESTING EDGE FUNCTION ===
4. Calling: https://your-project.supabase.co/functions/v1/telegram-verify
5. Status: 200
6. Result: { ok: true, valid: true, user: {...}, session: {...} }

✅ SUCCESS - Authentication working!
```

---

## Common Mistakes

### Mistake 1: Multiple Bots

**Symptom:** Token is correct, but still 401

**Cause:** You have multiple bots and tokens are mixed up

**Fix:**
1. Identify which bot opens the Mini App (send `/start` and check bot name)
2. Get token for THAT SPECIFIC bot from @BotFather
3. Use only that token in Supabase

### Mistake 2: Token from .env File

**Symptom:** Frontend .env has a different token

**Cause:** `.env` file might have `VITE_TELEGRAM_BOT_TOKEN` but edge function uses `TELEGRAM_BOT_TOKEN`

**Fix:**
- Frontend .env doesn't need the bot token
- Only Supabase Edge Function Configuration needs it
- Delete any bot token from frontend .env

### Mistake 3: Spaces in Token

**Symptom:** Token looks correct but verification fails

**Cause:** Copy-paste added a space or newline

**Fix:**
1. Delete the token from Supabase
2. Get token fresh from @BotFather
3. Copy-paste into a text editor first
4. Verify no spaces/newlines
5. Copy from text editor to Supabase

### Mistake 4: Old Deployment

**Symptom:** Set token but still fails

**Cause:** Edge function not redeployed after setting token

**Fix:**
```bash
supabase functions deploy telegram-verify --no-verify-jwt
```

Wait for successful deployment message.

---

## Success Criteria

All these should be ✅:

- [ ] Bot token retrieved from @BotFather
- [ ] Token tested with curl and returns bot info
- [ ] Token set in Supabase as `TELEGRAM_BOT_TOKEN`
- [ ] No other bot token variables exist in Supabase
- [ ] Edge function deployed after setting token
- [ ] Edge function logs show token being used (masked)
- [ ] Edge function logs show: `✅ Match: true`
- [ ] Browser console shows: `status: 200`
- [ ] App loads successfully

---

## Still Not Working?

If authentication still fails after following all steps:

1. **Export edge function logs:**
   - Copy the full log output from Supabase Dashboard
   - Look for the specific error message

2. **Export browser console:**
   - Run the test script above
   - Copy the full output

3. **Verify bot configuration:**
   ```bash
   # Get bot info
   curl "https://api.telegram.org/bot<YOUR_TOKEN>/getMe"

   # Should return your bot details
   ```

4. **Check Mini App URL in @BotFather:**
   - Send `/mybots` to @BotFather
   - Select your bot
   - Click "Bot Settings" → "Menu Button" → "Edit Menu Button URL"
   - Verify URL is correct

5. **Test with a different bot:**
   - Create a new test bot with @BotFather
   - Set it up with your Mini App
   - Use its token
   - If this works, original bot has an issue

---

## After Success

Once you see `status: 200` and `✅ Match: true`:

1. Close Telegram Mini App completely
2. Reopen from bot
3. App should load without errors
4. Check browser console - no "Invalid signature" messages
5. UserManagement and all features should work

The 401 error is now permanently fixed!
