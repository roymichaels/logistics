# Quick Start: Telegram Authentication (No JWT Secret Required)

## Problem Solved ✅

**Before:** Build failed with "Missing SUPABASE_JWT_SECRET" error
**After:** Authentication works with Bolt's managed Supabase database (no JWT secret needed)

## What You Need

### For Local Development
Add to your `.env` file:
```bash
VITE_SUPABASE_URL=https://ncuyyjvvzeaqqjganbzz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### For Edge Functions (Bolt Managed)
These are **automatically configured** in Bolt's environment:
- `SUPABASE_URL` ✅ Auto-configured
- `SUPABASE_SERVICE_ROLE_KEY` ✅ Auto-configured
- `TELEGRAM_BOT_TOKEN` - Set this in Bolt secrets
- `TELEGRAM_WEBHOOK_SECRET` - Set this in Bolt secrets

## Build & Deploy

### 1. Build Frontend (Works Now!)
```bash
npm run build:web
```
✅ No more JWT_SECRET errors!

### 2. Deploy Edge Function
The `telegram-verify` Edge Function now uses Supabase's native Auth API:
- No manual JWT signing
- No JWT secret required
- Works with Bolt's managed database

### 3. Set Telegram Secrets
If you need to set Telegram bot credentials:
```bash
# In Bolt project settings, add:
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret
```

## How It Works Now

1. **User Opens Telegram Mini App**
   - Telegram provides initData with signature

2. **Frontend Calls telegram-verify Edge Function**
   - Sends initData to verify

3. **Edge Function Validates & Creates Session**
   - Verifies Telegram HMAC signature
   - Creates/updates user in custom `users` table
   - Creates auth user via `supabase.auth.admin.createUser()`
   - Stores custom claims in `app_metadata`
   - Returns Supabase-signed JWT token

4. **Frontend Sets Session**
   - Receives native Supabase session token
   - Calls `supabase.auth.setSession()`
   - App has authenticated user!

## Key Changes

### ✅ What Changed
- Removed `jose` library import
- Removed `SUPABASE_JWT_SECRET` requirement
- Using `supabase.auth.admin` API instead
- Custom claims in `app_metadata` instead of top-level JWT

### ✅ What Stayed The Same
- Telegram HMAC verification (unchanged)
- Custom `users` table (unchanged)
- Frontend auth flow (minimal changes)
- RLS policies (may need minor updates)

## Accessing Custom Claims

### In Frontend Code
```typescript
// Get current session
const { data: { session } } = await supabase.auth.getSession();

// Access custom claims
const userId = session?.user?.app_metadata?.user_id;
const telegramId = session?.user?.app_metadata?.telegram_id;
const role = session?.user?.app_metadata?.role;
const workspaceId = session?.user?.app_metadata?.workspace_id;
```

### In RLS Policies
```sql
-- Access app_metadata in RLS
CREATE POLICY "Users can access own data"
ON your_table
FOR SELECT
USING (
  user_id = (auth.jwt() -> 'app_metadata' ->> 'user_id')::uuid
);

-- Check role
CREATE POLICY "Admins only"
ON admin_table
FOR ALL
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- Workspace isolation
CREATE POLICY "Workspace members only"
ON workspace_data
FOR SELECT
USING (
  workspace_id = (auth.jwt() -> 'app_metadata' ->> 'workspace_id')::uuid
);
```

## Troubleshooting

### Build Still Fails?
Check that your `.env` has:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### Edge Function Errors?
1. Check Supabase function logs
2. Verify `TELEGRAM_BOT_TOKEN` is set
3. Ensure `SUPABASE_SERVICE_ROLE_KEY` exists (auto-configured in Bolt)

### Session Not Creating?
- Verify service role key has admin permissions
- Check Edge Function logs for specific error
- Ensure auth.users table is accessible

## Next Steps

1. ✅ Frontend builds successfully
2. 🔄 Deploy Edge Function to Supabase
3. 🔄 Test Telegram authentication flow
4. 🔄 Update RLS policies if needed
5. 🔄 Test role-based access

## Documentation

- Full details: See `AUTHENTICATION_UPDATE.md`
- Original issue: JWT secret not available in Bolt managed database
- Solution: Use Supabase Auth Admin API instead of manual JWT signing

---

**Questions?** The authentication system is now compatible with Bolt's managed Supabase database!
