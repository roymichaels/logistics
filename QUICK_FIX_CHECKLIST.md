# Quick Fix Checklist - Telegram 401 Error

Use this as a printable/shareable checklist.

---

## Pre-Fix Verification

- [ ] Open Telegram Mini App
- [ ] Note the error: "אימות Telegram נכשל: 401: {"valid":false,"error":"Invalid signature"}"
- [ ] Confirm you're opening from Telegram (not browser)
- [ ] Identify which bot username opens the Mini App: `__________________`

---

## Fix Steps

### Step 1: Get Bot Token (2 minutes)

- [ ] Open Telegram Desktop or Mobile
- [ ] Search for: `@BotFather`
- [ ] Send: `/mybots`
- [ ] Select the bot from Pre-Fix step: `__________________`
- [ ] Click: **API Token**
- [ ] Copy the ENTIRE token (43-46 characters)
- [ ] Token format check: `[numbers]:[letters-numbers-dashes]`
- [ ] First 10 chars of token: `__________________`

### Step 2: Verify Token Works (30 seconds)

- [ ] Open terminal
- [ ] Run: `curl "https://api.telegram.org/bot<YOUR_TOKEN>/getMe"`
- [ ] Response shows bot info? (Yes / No): ______
- [ ] Bot username matches? (Yes / No): ______

If "No" to either → Get token again from @BotFather

### Step 3: Configure Supabase (1 minute)

- [ ] Go to: https://app.supabase.com
- [ ] Select your project
- [ ] Click: **Edge Functions** (left sidebar)
- [ ] Click: **Configuration** tab
- [ ] Delete these if they exist:
  - [ ] `BOT_TOKEN`
  - [ ] `TELEGRAM_TOKEN`
  - [ ] `VITE_TELEGRAM_BOT_TOKEN`
  - [ ] Any other bot token variables
- [ ] Click: **Add secret**
- [ ] Name (EXACTLY): `TELEGRAM_BOT_TOKEN`
- [ ] Value: Paste your token
  - [ ] NO quotes
  - [ ] NO spaces before/after
  - [ ] NO newlines
- [ ] Click: **Save**
- [ ] Token appears as: `••••••••••••••••••••••••••••••` (Yes / No): ______

### Step 4: Redeploy Edge Function (30 seconds)

**Option A: Via Dashboard**
- [ ] Stay in Edge Functions section
- [ ] Find: `telegram-verify`
- [ ] Click: **Deploy** or **Redeploy**
- [ ] Wait for: "Deployed successfully"
- [ ] Deployment timestamp: `__________________`

**Option B: Via CLI** (if installed)
- [ ] Run: `supabase functions deploy telegram-verify`
- [ ] Wait for: "Function telegram-verify deployed successfully"

### Step 5: Test (1 minute)

- [ ] CLOSE Telegram Mini App completely
- [ ] Open Telegram
- [ ] Send `/start` to your bot
- [ ] Click Mini App button
- [ ] App loads? (Yes / No): ______
- [ ] No 401 error? (Yes / No): ______

---

## Verification

Run in browser console (if accessible):

```javascript
(async () => {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-verify`;
  const WebApp = window.Telegram?.WebApp;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'webapp', initData: WebApp.initData })
  });
  console.log('Status:', res.status, res.ok ? '✅' : '❌');
})();
```

- [ ] Status: 200 ✅
- [ ] Result shows user data

---

## Edge Function Logs Check

Supabase Dashboard → Edge Functions → telegram-verify → Logs

Look for these lines:
- [ ] `🔑 Using bot token: [numbers]...`
- [ ] `✅ Match: true`
- [ ] `Telegram verification succeeded`

If you see `✅ Match: false` → Token is wrong, repeat from Step 1

---

## Success Criteria

All must be ✅:
- [ ] Diagnostic script shows status 200
- [ ] Edge function logs show "Match: true"
- [ ] Mini App loads without errors
- [ ] No "Invalid signature" in console
- [ ] UserManagement page loads users

---

## If Still Not Working

1. Which bot opens the Mini App? `__________________`
2. Which bot did you get token from? `__________________`
3. Do they match? (Yes / No): ______
4. Token first 10 chars: `__________________`
5. Edge function logs show what? `__________________`

Run automated diagnostic:
```bash
./verify-deployment.sh
```

Or open in browser:
```
https://your-app.com/telegram-diagnostic.html
```

---

## Common Issues

**Issue**: Status still 401
**Cause**: Wrong bot token
**Fix**: Verify bot username matches in Steps 1 and 3

**Issue**: Status 500
**Cause**: Token not set or edge function error
**Fix**: Check edge function logs for specific error

**Issue**: Status 404
**Cause**: Edge function not deployed
**Fix**: Deploy telegram-verify function

**Issue**: Can't access Supabase
**Cause**: No permissions
**Fix**: Get access from project owner

---

## Time Estimate

- With Supabase access: **5 minutes**
- Without CLI (Dashboard only): **7 minutes**
- First time: **10 minutes**

Once fixed, authentication works permanently.

---

## Files to Reference

- Full guide: `TELEGRAM_AUTH_FIX_NOW.md`
- Complete solution: `TELEGRAM_401_COMPLETE_SOLUTION.md`
- Diagnostic tool: `public/telegram-diagnostic.html`
- Verify script: `./verify-deployment.sh`

---

**Completed**: ______ / ______ / 20____
**Fixed by**: ____________________
**Notes**: _________________________________________________
