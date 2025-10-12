# Quick Fix: 401 Authentication Error

**Problem:** Getting 401 error when opening Telegram Mini App

**Cause:** Missing `TELEGRAM_BOT_TOKEN` in Supabase

---

## 3-Step Fix

### 1. Get Your Bot Token
```
Telegram → @BotFather → /mybots → Your Bot → API Token
```
Copy the token (looks like: `1234567890:ABCdefGHI...`)

### 2. Add to Supabase
```
Supabase Dashboard → Edge Functions → Configuration → Secrets

Name:  TELEGRAM_BOT_TOKEN
Value: (paste your token)
```

### 3. Redeploy Function
```
Edge Functions → telegram-verify → Deploy
```

---

## Test It Works

1. Close Telegram Mini App completely
2. Reopen from Telegram
3. Should authenticate successfully ✅

---

## Still Having Issues?

### Quick Checks
- [ ] Token copied correctly (no spaces)
- [ ] Edge Function redeployed after adding secret
- [ ] Mini App reopened (not just refreshed)
- [ ] Using correct bot token (check which bot launches your app)

### Test Token
```bash
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getMe"
```
Should return: `{"ok":true,...}`

### More Help
See `TELEGRAM_BOT_TOKEN_SETUP.md` for detailed troubleshooting.

---

**Fix Time:** ~2 minutes
**Difficulty:** Easy
**Requires:** Access to BotFather and Supabase dashboard
