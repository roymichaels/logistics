# Quick Start - Deploy User Management Fix

## 🚀 Fast Track Deployment (5 minutes)

### Prerequisites
- Supabase CLI installed and logged in
- Project built and tested locally
- Telegram bot token configured

### Step 1: Deploy Backend (2 minutes)

```bash
# Deploy Edge Function
supabase functions deploy telegram-verify

# Apply RLS policies
supabase db push
```

### Step 2: Deploy Frontend (2 minutes)

```bash
# Build
npm run build:web

# Deploy to your hosting platform
# Netlify:
netlify deploy --prod --dir=dist

# Vercel:
vercel --prod

# Or manual: Upload dist/ folder to your web server
```

### Step 3: Verify (1 minute)

1. Open Telegram Mini App
2. Go to Settings → User Management
3. ✅ Users should appear in list

## 🐛 Quick Debug

**Still seeing empty list?**

```javascript
// In browser console:
import { logAuthDebug } from './src/lib/authDebug';
await logAuthDebug();
// Check if JWT claims are present
```

```sql
-- In Supabase SQL Editor:
SELECT debug_auth_claims();
-- Verify role and workspace_id
```

## 📊 What Changed

| Component | Change | Impact |
|-----------|--------|--------|
| telegram-verify | Added JWT claims (workspace_id, app_role) | Backend sets proper auth context |
| RLS Policies | 5 new policies for user management | Owners/managers can view team |
| TelegramAuth | Session establishment & timing fixes | Auth completes before queries |
| UserManagement | Validation & debug logging | Better error visibility |

## ✅ Success Indicators

- [ ] User list displays names and roles
- [ ] Role filter dropdown works
- [ ] Stat boxes show correct numbers
- [ ] Console shows "🔐 Authentication Debug Info"
- [ ] No RLS policy errors

## 🔄 Rollback (if needed)

```bash
# Revert all changes
git checkout HEAD~1 supabase/functions/telegram-verify/
git checkout HEAD~1 src/
supabase functions deploy telegram-verify
supabase db reset
npm run build:web
```

## 📚 Full Documentation

- **Summary**: USER_MANAGEMENT_FIX_SUMMARY.md
- **Complete Guide**: USER_MANAGEMENT_FIX_GUIDE.md
- **Flow Diagrams**: AUTHENTICATION_FLOW.md
- **Automated Script**: DEPLOYMENT_COMMANDS.sh

## 🆘 Need Help?

**Empty user list:**
1. Check JWT claims in console
2. Verify user role is 'owner' or 'manager'
3. Check business_users association exists

**RLS errors:**
1. Run `SELECT debug_auth_claims()` in SQL
2. Verify workspace_id matches business
3. Check business_users.active = true

**Session issues:**
1. Hard refresh (Ctrl+Shift+R)
2. Clear Telegram app cache
3. Re-authenticate (close and reopen app)

## 💡 Architecture Summary

```
Telegram WebApp
    ↓ (100-500ms delay)
TelegramAuth Component
    ↓ (POST initData)
telegram-verify Edge Function
    ↓ (verify + lookup business + set JWT claims)
Supabase Session
    ↓ (setSession with JWT)
UserManagement Query
    ↓ (RLS checks JWT claims)
Database Returns Filtered Users
    ↓
UI Displays User List ✅
```

## 🎯 Critical Components

**JWT Claims** (set by telegram-verify):
```json
{
  "app_metadata": {
    "role": "owner",
    "app_role": "business_owner",
    "workspace_id": "uuid",
    "user_id": "uuid",
    "telegram_id": "123456789"
  }
}
```

**Key RLS Policy** (workspace_admins_view_team):
- Checks user has owner/manager role
- Verifies workspace_id via business_users join
- Returns users in same workspace

---

**Deployment Time**: ~5 minutes
**Testing Time**: ~2 minutes
**Total Time**: ~7 minutes

Ready to deploy? Run `./DEPLOYMENT_COMMANDS.sh` 🚀
