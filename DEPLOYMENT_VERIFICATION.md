# Deployment Verification Guide

Quick 60-second checklist to verify the surgical session fix is working.

---

## Pre-Deployment

### 1. Deploy Edge Function

```bash
supabase functions deploy set-role
```

Or via Dashboard:
- Go to Edge Functions → New Function
- Name: `set-role`
- Copy from: `/supabase/functions/set-role/index.ts`
- Deploy

### 2. Deploy Frontend

The build is ready in `dist/` folder:

```bash
# Your hosting platform command
# e.g., netlify deploy --prod --dir=dist
```

---

## Post-Deployment Verification

### Green Light #1: No Multiple Clients Warning

Open Telegram Mini App → Open browser console

**Look for:**
```
🔧 Singleton Supabase client created with storageKey: twa-undergroundlab
```

**Should NOT see:**
```
⚠️ Multiple GoTrueClient instances detected
```

✅ **Green** if only ONE client creation log
❌ **Red** if multiple instances warning

---

### Green Light #2: Session Established

In console during app load:

**Look for:**
```
🔐 ensureTwaSession: Starting authentication check
✅ ensureTwaSession: Session established successfully
```

OR (if session already exists):
```
✅ ensureTwaSession: Session already exists
```

✅ **Green** if session established
❌ **Red** if "verify_failed" or "tokens_missing"

---

### Green Light #3: UserManagement Loads

Navigate to User Management → Check console

**Look for:**
```
🔍 UserManagement - Starting user load
✅ Session verified, proceeding with queries
```

**Should NOT see:**
```
❌ No active session
⚠️ No valid session found, attempting to load users anyway
חסרים claims: Session
```

✅ **Green** if users load
❌ **Red** if empty list or session errors

---

### Green Light #4: Role Update Works

Select user → Change role → Confirm

**Look for:**
```
🔄 Role update via edge function: { user_id: "...", new_role: "..." }
✅ Role updated successfully
```

**Should see success toast:**
```
תפקיד עודכן בהצלחה ל[role name]
```

✅ **Green** if role updates
❌ **Red** if "שגיאה בשינוי התפקיד"

---

### Green Light #5: Claims Verification

Run in console:

```javascript
window.__JWT_CLAIMS__
```

**Should output:**
```javascript
{
  role: "owner",
  user_id: "uuid-here",
  telegram_id: "123456789",
  workspace_id: "uuid-here",
  updated_at: "2025-10-05T..."
}
```

✅ **Green** if all claims present
❌ **Red** if `undefined` or missing claims

---

## If All Lights Are Green

🎉 **Success!** The fix is working.

- No multiple clients
- Session established before queries
- UserManagement loads
- Role updates work
- JWT claims present

**Next**: Monitor for 24 hours. Users should report no "No session" errors.

---

## If Any Lights Are Red

### Red Light #1 (Multiple Clients)

**Issue**: Singleton not being used everywhere

**Fix**:
1. Search codebase for `createClient(` (not in node_modules)
2. Replace with `getSupabase()` import
3. Rebuild and redeploy

### Red Light #2 (Session Not Established)

**Issue**: telegram-verify edge function failing

**Check**:
1. Supabase Edge Function logs for `telegram-verify`
2. Look for errors in response
3. Verify `TELEGRAM_BOT_TOKEN` env var is set

**Fix**:
- Check edge function logs
- Verify env vars in Supabase dashboard
- Redeploy telegram-verify if needed

### Red Light #3 (UserManagement Doesn't Load)

**Issue**: Session check failing or RLS blocking queries

**Check**:
1. Console: Does session exist?
2. Run: `window.__SUPABASE_SESSION__`
3. If null, session not set properly

**Fix**:
- Verify ensureTwaSession is being called
- Check App.tsx initialization order
- Verify session is set before DataStore creation

### Red Light #4 (Role Update Fails)

**Issue**: Edge function not deployed or unauthorized

**Check**:
1. Supabase Edge Functions: Does `set-role` exist?
2. Edge function logs: Any errors?
3. Console: What's the error response?

**Fix**:
- Deploy set-role edge function
- Check caller JWT claims have role
- Verify SUPABASE_SERVICE_ROLE_KEY env var

### Red Light #5 (No Claims)

**Issue**: telegram-verify not adding claims to JWT

**Check**:
1. telegram-verify edge function logs
2. Look for "Auth user updated with JWT claims"
3. Verify signInWithPassword returns session

**Fix**:
- Check telegram-verify is doing atomic update
- Verify claims being added to app_metadata
- Check Supabase auth.users table for app_metadata

---

## Emergency Rollback

If nothing works and you need to rollback:

```bash
# Checkout previous working commit
git checkout HEAD~1

# Rebuild
npm run build:web

# Redeploy
[your deploy command]
```

Then investigate logs to understand what went wrong.

---

## Monitoring

After deployment, monitor for:

1. **No "חסרים claims" errors** in production
2. **No "No active session" errors** in production
3. **Role updates complete successfully** in production
4. **Users report smooth authentication** flow

If any issues appear, check:
- Browser console logs
- Supabase Edge Function logs
- Network tab for failed requests

---

## Support

If issues persist after verification:

1. Export console logs: `copy(console.log.history)`
2. Export session state: `copy(window.__SUPABASE_SESSION__)`
3. Export JWT claims: `copy(window.__JWT_CLAIMS__)`
4. Check Edge Function logs in Supabase Dashboard
5. Review Network tab for failed requests

With these diagnostics, the exact failure point can be identified.
