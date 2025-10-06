# Quick Start - Telegram Authentication Fix

**5-Minute Deployment Guide**

---

## ⚡ Deploy in 3 Steps

### Step 1: Deploy Edge Function (2 min)

```bash
supabase functions deploy telegram-verify
```

**Or manually**:
1. Go to Supabase Dashboard → Edge Functions → telegram-verify
2. Copy contents of `supabase/functions/telegram-verify/index.ts`
3. Paste and deploy

### Step 2: Deploy Frontend (2 min)

```bash
# Files are already built in dist/
# Deploy to your hosting provider

# Netlify example:
netlify deploy --prod --dir=dist

# Vercel example:
vercel --prod

# Or copy dist/ contents to your web server
```

### Step 3: Test (1 min)

```bash
# In browser console after app loads:
await window.runAuthDiagnostics()
```

**Should show**: `✅ All checks passed`

---

## 🔍 Verify Configuration

### Check Environment Variables

In Supabase Dashboard → Settings → Edge Functions:

**Required**:
- ✅ `TELEGRAM_BOT_TOKEN` - Your bot token from @BotFather
- ✅ No extra spaces or newlines in token
- ✅ Token matches bot that launches your Mini App

**Auto-configured** (no action needed):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`

---

## 🧪 Quick Test

### 1. Clear Cache
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### 2. Run Diagnostics
```javascript
await window.runAuthDiagnostics()
```

### 3. Check Claims
```javascript
window.__JWT_CLAIMS__
// Should show: { user_id, telegram_id, role, workspace_id }
```

---

## ❌ Troubleshooting

### Still getting 401 errors?

**Check Edge Function Logs**:
1. Supabase Dashboard → Edge Functions → telegram-verify → Logs
2. Look for "HMAC verification FAILED"

**Common Fixes**:
- Wrong bot token → Update `TELEGRAM_BOT_TOKEN`
- Extra spaces in token → Remove whitespace
- Wrong bot → Use token from bot that launches Mini App
- Bot not configured → Set Mini App URL in @BotFather

### Missing JWT claims?

**Check Session**:
```javascript
window.__SUPABASE_SESSION__
```

**If provider is 'email' instead of 'telegram'**:
- Frontend fell back to clientSideAuth
- Check Edge Function logs for why telegram-verify failed
- Fix the root cause, then clear cache and retry

---

## 📚 Full Documentation

- **Complete Guide**: `TELEGRAM_AUTH_FIX_COMPLETE.md`
- **Console Debug**: `CONSOLE_DEBUG_REFERENCE.md`
- **Technical Summary**: `AUTHENTICATION_FIX_SUMMARY.md`

---

## ✅ Success Checklist

After deployment, verify:

- [ ] No 401 errors in console
- [ ] `window.runAuthDiagnostics()` shows all passed
- [ ] JWT claims include user_id, telegram_id, role
- [ ] User Management page works
- [ ] Role changes succeed
- [ ] Business context loads
- [ ] Session persists across page reloads

---

## 🆘 Need Help?

Run this and share output:

```javascript
const debug = {
  diagnostics: await window.runAuthDiagnostics(),
  claims: window.__JWT_CLAIMS__,
  session: window.__SUPABASE_SESSION__?.user.id,
  provider: window.__SUPABASE_SESSION__?.user.app_metadata?.provider
};
console.log(JSON.stringify(debug, null, 2));
```

Also check:
1. Supabase Edge Function logs
2. Browser console errors
3. TELEGRAM_BOT_TOKEN configuration

---

That's it! Your Telegram authentication should now work correctly with full JWT claims support.
