# ⚡ Deploy PIN Authentication & Messaging System NOW

## 🚀 Quick Deploy (5 minutes)

### Step 1: Deploy Database (2 minutes)

1. **Open Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard/project/ncuyyjvvzeaqqjganbzz/sql/new

2. **Copy & Paste SQL:**
   - Open file: `deploy-complete-system.sql`
   - Select all (Ctrl+A / Cmd+A)
   - Copy everything
   - Paste into SQL Editor

3. **Run Migration:**
   - Click **"Run"** button
   - Wait for "Success" message (~30 seconds)

4. **Verify:**
   - Go to: Database → Tables
   - Confirm these tables exist:
     - ✅ `user_pins`
     - ✅ `pin_audit_log`
     - ✅ `pin_settings`
     - ✅ `pin_sessions`
     - ✅ `message_attachments`
     - ✅ `chat_message_reactions`
     - ✅ `chat_notifications_queue`
     - ✅ `chat_encryption_keys`

### Step 2: Create Storage Buckets (1 minute)

1. **Go to Storage:**
   - https://supabase.com/dashboard/project/ncuyyjvvzeaqqjganbzz/storage/buckets

2. **Create 3 buckets:**

**Bucket 1: chat-files**
- Click "New bucket"
- Name: `chat-files`
- Public: **OFF**
- File size limit: `20971520` (20MB)
- Click "Create bucket"

**Bucket 2: chat-voice-notes**
- Click "New bucket"
- Name: `chat-voice-notes`
- Public: **OFF**
- File size limit: `5242880` (5MB)
- Click "Create bucket"

**Bucket 3: chat-thumbnails**
- Click "New bucket"
- Name: `chat-thumbnails`
- Public: **OFF**
- File size limit: `1048576` (1MB)
- Click "Create bucket"

### Step 3: Deploy Edge Functions (2 minutes)

**Important:** You need Supabase CLI for this step

**Option A: If you have Supabase CLI installed:**

```bash
cd /tmp/cc-agent/58462562/project

# Link to project
supabase link --project-ref ncuyyjvvzeaqqjganbzz

# Deploy all functions
supabase functions deploy pin-verify
supabase functions deploy pin-reset
supabase functions deploy message-send
supabase functions deploy room-create
supabase functions deploy file-upload
```

**Option B: Install Supabase CLI first:**

**macOS:**
```bash
brew install supabase/tap/supabase
```

**Windows:**
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Linux:**
```bash
# Download latest release from:
# https://github.com/supabase/cli/releases
```

Then run commands from Option A.

**Option C: Manual deployment via Dashboard:**

For each function, go to:
https://supabase.com/dashboard/project/ncuyyjvvzeaqqjganbzz/functions

1. Click "Create a new function"
2. Name: `pin-verify` (or function name)
3. Copy code from: `supabase/functions/pin-verify/index.ts`
4. Paste and click "Deploy function"
5. Repeat for:
   - `pin-reset`
   - `message-send`
   - `room-create`
   - `file-upload`

### Step 4: Test Deployment

**Quick Test:**

1. Get your access token:
   - Open your app in browser
   - Open DevTools Console (F12)
   - Type: `localStorage.getItem('sb-ncuyyjvvzeaqqjganbzz-auth-token')`
   - Copy the token value

2. Test PIN setup:
```bash
curl -X POST "https://ncuyyjvvzeaqqjganbzz.supabase.co/functions/v1/pin-verify" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"operation":"setup","pin":"123456"}'
```

Expected response:
```json
{"success":true,"message":"PIN setup successfully"}
```

## ✅ Done!

Your PIN authentication and messaging system is now deployed!

## 📚 What's Next?

1. **Configure PIN policies:**
   - Dashboard → Table Editor → `pin_settings`
   - Set `require_pin=true` for your businesses

2. **Test messaging:**
   - Create a test room
   - Send encrypted messages
   - Upload files

3. **Add to frontend:**
   - See: `SUPABASE_PIN_MESSAGING_DEPLOYMENT.md` (Step 4)
   - Integrate PIN challenge component
   - Add messaging service

## 🆘 Need Help?

**Database issues?**
- Check SQL Editor for error messages
- Verify all tables created: Database → Tables

**Storage issues?**
- Verify buckets exist: Storage → Buckets
- Check buckets are private (not public)

**Function issues?**
- Check function logs: Functions → Select function → Logs
- Verify function deployed: Functions (should show green status)

**Still stuck?**
- Check: `SUPABASE_PIN_MESSAGING_DEPLOYMENT.md`
- Or: `QUICK_START_GUIDE.md`

## 📊 Verify Deployment

Run these checks in SQL Editor:

```sql
-- Check PIN tables
SELECT COUNT(*) FROM user_pins;
SELECT COUNT(*) FROM pin_audit_log;

-- Check messaging tables
SELECT COUNT(*) FROM message_attachments;
SELECT COUNT(*) FROM chat_message_reactions;

-- Check storage buckets
SELECT * FROM storage.buckets WHERE id IN ('chat-files', 'chat-voice-notes', 'chat-thumbnails');

-- Check RLS enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('user_pins', 'message_attachments')
AND rowsecurity = true;
```

All queries should succeed!

---

**Deployment complete! 🎉** Your system is ready to use.
