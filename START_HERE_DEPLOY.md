# START HERE - Fix Telegram Auth in 5 Minutes

## The Problem
Your logs show: "Invalid login credentials" loop.

## The Cause
Edge function `telegram-verify` is not deployed to Supabase.

## The Fix
Deploy the function via Supabase Dashboard.

---

## DEPLOY NOW (3 Steps)

### Step 1: Open Dashboard (30 seconds)
Click this link: https://supabase.com/dashboard/project/ncuyyjvvzeaqqjganbzz/functions

### Step 2: Deploy Function (2 minutes)
1. Click "New Function" or find existing `telegram-verify`
2. Name: `telegram-verify`
3. Copy ALL content from: `supabase/functions/telegram-verify/index.ts`
4. Paste into editor
5. Click "Deploy"
6. Wait for "Deployed" status

### Step 3: Test (2 minutes)
Open your Telegram mini app - should work instantly!

---

## Verify It Worked

In terminal:
```bash
curl -X POST https://ncuyyjvvzeaqqjganbzz.supabase.co/functions/v1/telegram-verify \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

Should return: `{"ok":false,"error":"Missing initData"}`

This is GOOD - means function is deployed and running!

---

## What This Fixes

Before:
- Infinite "Invalid login credentials" loop
- App stuck on loading screen
- Users can't authenticate

After:
- Instant authentication
- Dashboard loads immediately
- Users created automatically

---

## Need More Info?

- Quick guide: `MANUAL_DEPLOY_GUIDE.txt`
- Full details: `DEPLOY_EDGE_FUNCTIONS.md`
- Summary: `DEPLOYMENT_SUMMARY.md`

---

## Still Having Issues?

Check Supabase logs:
https://supabase.com/dashboard/project/ncuyyjvvzeaqqjganbzz/logs/edge-functions

Look for:
- "✅ Telegram user verified"
- "✅ Session created successfully"

---

## Timeline

- Dashboard: 30 seconds
- Deploy: 2 minutes
- Test: 2 minutes
- **Total: 5 minutes**

---

**GO TO:** https://supabase.com/dashboard/project/ncuyyjvvzeaqqjganbzz/functions

**COPY FROM:** supabase/functions/telegram-verify/index.ts

**CLICK:** Deploy

**DONE!**
