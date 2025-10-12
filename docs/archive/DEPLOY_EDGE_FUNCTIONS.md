# Deploy Edge Functions to Fix Telegram Authentication

## Problem
Your edge functions exist in code but aren't deployed to Supabase. The authentication loop happens because when the frontend tries to call `telegram-verify`, it either doesn't exist or has an old version without the proper retry logic.

## Solution: Deploy via Supabase Dashboard

Since Supabase CLI requires interactive authentication, the easiest way is to deploy via the dashboard:

### Option 1: Deploy via Dashboard (Recommended - 5 minutes)

#### Step 1: Access Edge Functions Dashboard
1. Go to: https://supabase.com/dashboard/project/ncuyyjvvzeaqqjganbzz
2. Navigate to **Edge Functions** in the left sidebar
3. You should see a list of functions (or an empty state if none are deployed)

#### Step 2: Deploy telegram-verify (Critical)
1. Click **"New Function"** or find `telegram-verify` if it exists
2. If creating new:
   - Name: `telegram-verify`
   - Click **"Create function"**
3. Replace the code editor content with the file from:
   `supabase/functions/telegram-verify/index.ts`
4. Click **"Deploy"**
5. Wait for deployment to complete (usually 10-30 seconds)

#### Step 3: Deploy telegram-webhook
1. Click **"New Function"** or find `telegram-webhook`
2. Name: `telegram-webhook`
3. Copy code from: `supabase/functions/telegram-webhook/index.ts`
4. **Important**: Also copy the shared CORS helper:
   - Create `_shared/cors.ts` if it doesn't exist
   - Copy from: `supabase/functions/_shared/cors.ts`
5. Click **"Deploy"**

#### Step 4: Verify Deployment
1. Check that both functions show "Deployed" status
2. Click on `telegram-verify` and test with a curl command:

```bash
curl -X POST https://ncuyyjvvzeaqqjganbzz.supabase.co/functions/v1/telegram-verify \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

You should get a 500 error about missing initData - that's OK! It means the function is deployed and running.

#### Step 5: Check Logs
1. Go to **Edge Functions → telegram-verify → Logs**
2. You should see the error from your test request
3. This confirms the function is live and executing

---

### Option 2: Deploy via CLI (Requires Setup)

If you want to use CLI for future deployments:

#### Step 1: Get Access Token
1. Go to: https://supabase.com/dashboard/account/tokens
2. Click **"Generate new token"**
3. Name it: "CLI Deployment"
4. Copy the token (starts with `sbp_`)
5. **Save it securely** - you can't view it again!

#### Step 2: Set Environment Variable
```bash
export SUPABASE_ACCESS_TOKEN='your_token_here'
```

Or add to your `.bashrc` / `.zshrc`:
```bash
echo 'export SUPABASE_ACCESS_TOKEN="your_token_here"' >> ~/.bashrc
source ~/.bashrc
```

#### Step 3: Deploy All Functions
```bash
cd /path/to/your/project

# Deploy critical auth functions
npx supabase functions deploy telegram-verify --project-ref ncuyyjvvzeaqqjganbzz
npx supabase functions deploy telegram-webhook --project-ref ncuyyjvvzeaqqjganbzz

# Deploy supporting functions
npx supabase functions deploy bootstrap --project-ref ncuyyjvvzeaqqjganbzz
npx supabase functions deploy set-role --project-ref ncuyyjvvzeaqqjganbzz
npx supabase functions deploy promote-manager --project-ref ncuyyjvvzeaqqjganbzz
npx supabase functions deploy user-mode --project-ref ncuyyjvvzeaqqjganbzz
npx supabase functions deploy superadmin-auth --project-ref ncuyyjvvzeaqqjganbzz
npx supabase functions deploy app-config --project-ref ncuyyjvvzeaqqjganbzz
npx supabase functions deploy seed-demo --project-ref ncuyyjvvzeaqqjganbzz
```

---

## What Each Function Does

| Function | Purpose | Critical? |
|----------|---------|-----------|
| `telegram-verify` | Authenticates Telegram users, creates accounts, generates sessions | ✅ YES |
| `telegram-webhook` | Handles bot messages and commands | ⚠️ Nice to have |
| `bootstrap` | App initialization and config | ⚠️ Nice to have |
| `set-role` | User role management | ⚠️ Nice to have |
| `promote-manager` | Promote users to manager | ⚠️ Nice to have |
| `user-mode` | User preferences | ⚠️ Nice to have |
| `superadmin-auth` | Superadmin login | ⚠️ Nice to have |
| `app-config` | App configuration | ⚠️ Nice to have |
| `seed-demo` | Demo data seeding | ❌ Optional |

**Priority**: Deploy `telegram-verify` first! This is the one causing your authentication loop.

---

## Verification After Deployment

### Test 1: Function Exists
```bash
curl https://ncuyyjvvzeaqqjganbzz.supabase.co/functions/v1/telegram-verify
```
Should return an error about missing data (not 404).

### Test 2: Check Logs in Dashboard
1. Go to Edge Functions → telegram-verify → Logs
2. Open your Telegram mini app
3. Watch the logs - you should see:
   - "✅ Telegram user verified"
   - "🔄 Sign-in attempt 1/3..."
   - "✅ Sign-in successful" or "➕ Creating new auth user..."

### Test 3: Full Authentication Flow
1. Clear your app cache/data in Telegram
2. Open the mini app fresh
3. Check browser console (if using Telegram Desktop/Web):
   - Should see: "✅ Authentication successful"
   - Should see: "✅ Session established successfully"
   - Should NOT see: "Invalid login credentials" loop

### Test 4: Database Check
Run this SQL in Supabase SQL Editor:
```sql
-- Check if users are being created
SELECT 
  telegram_id, 
  username, 
  role, 
  created_at 
FROM users 
ORDER BY created_at DESC 
LIMIT 5;

-- Check auth users
SELECT 
  email, 
  created_at,
  last_sign_in_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;
```

You should see new entries appear when users authenticate.

---

## Troubleshooting

### Error: "TELEGRAM_BOT_TOKEN not configured"
- Go to: Dashboard → Settings → Edge Functions → Secrets
- Verify `TELEGRAM_BOT_TOKEN` exists
- If not, add it from your BotFather token

### Error: "Invalid login credentials" (still happening)
- Check that `SUPABASE_SERVICE_ROLE_KEY` secret is set
- Redeploy `telegram-verify` function
- Clear app cache and try again

### Error: "CORS blocked"
- The new code includes CORS headers
- Make sure you deployed the latest version
- Check browser console for specific CORS errors

### Function shows "Deployed" but not working
- Check logs for actual errors
- Verify secrets are set correctly
- Try redeploying (sometimes helps)
- Check that endpoint URL is correct in your frontend

---

## Quick Deploy Checklist

- [ ] Access Supabase dashboard
- [ ] Navigate to Edge Functions
- [ ] Deploy `telegram-verify` with latest code
- [ ] Verify deployment status is "Deployed"
- [ ] Check logs show no startup errors
- [ ] Test authentication flow
- [ ] Verify users table gets new entries
- [ ] Confirm no more "Invalid credentials" loop

---

## Expected Timeline

- **Dashboard deploy**: 5 minutes for critical function
- **CLI deploy**: 10 minutes (including token setup)
- **All functions**: 15 minutes total
- **Testing & verification**: 5 minutes

**Total: 10-20 minutes to fix the authentication loop**

---

## Next Steps After Successful Deploy

1. ✅ Authentication should work instantly
2. ✅ Remove or disable the PINEntry fallback (no longer needed)
3. ✅ Test with multiple users
4. ✅ Monitor logs for any issues
5. ✅ Deploy remaining functions when convenient

---

## Need Help?

If you're still seeing issues after deploying:

1. Check the Supabase Edge Functions logs
2. Open browser console and run: `window.runAuthDiagnostics()`
3. Share any error messages you see
4. Verify all environment secrets are set correctly

The authentication loop will stop once `telegram-verify` is properly deployed with the retry logic and user creation fallback.
