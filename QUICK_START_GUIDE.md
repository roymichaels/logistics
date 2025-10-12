# Quick Start: PIN Authentication & Messaging System

## 5-Minute Setup

### Prerequisites
- Supabase project created
- Supabase CLI installed: `npm install -g supabase`
- Project linked: `supabase link --project-ref YOUR_REF`

### Step 1: Deploy Database (2 minutes)

```bash
# Apply all migrations
supabase db push

# Verify tables created
psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('user_pins', 'chat_messages', 'message_attachments');"
```

### Step 2: Create Storage Buckets (1 minute)

**Via Supabase Dashboard:**
1. Go to **Storage** → **New bucket**
2. Create: `chat-files` (Private, 20MB limit)
3. Create: `chat-voice-notes` (Private, 5MB limit)
4. Create: `chat-thumbnails` (Private, 1MB limit)

**Or via SQL:**
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('chat-files', 'chat-files', false, 20971520),
  ('chat-voice-notes', 'chat-voice-notes', false, 5242880),
  ('chat-thumbnails', 'chat-thumbnails', false, 1048576);
```

### Step 3: Deploy Edge Functions (2 minutes)

```bash
# Set Telegram bot token
supabase secrets set TELEGRAM_BOT_TOKEN=your_token_here

# Deploy all functions
supabase functions deploy pin-verify
supabase functions deploy pin-reset
supabase functions deploy message-send
supabase functions deploy room-create
supabase functions deploy file-upload

# Verify deployments
supabase functions list
```

### Step 4: Test (Optional but Recommended)

```bash
# Get your access token (from browser console after logging in)
TOKEN="your_access_token_here"
URL="https://your-project-ref.supabase.co"

# Test PIN setup
curl -X POST "$URL/functions/v1/pin-verify" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"operation":"setup","pin":"123456"}'

# Expected: {"success":true,"message":"PIN setup successfully"}
```

## Done! 🎉

Your PIN authentication and messaging system is now deployed and ready to use.

## What You Got

✅ **PIN Authentication**
- PBKDF2-hashed 6-digit PINs
- Progressive lockout protection
- Business-level enforcement
- Complete audit trail

✅ **Encrypted Messaging**
- End-to-end encrypted chats
- Real-time message delivery
- File uploads (documents, images, voice notes)
- Emoji reactions and read receipts

✅ **Security**
- Row-level security on all data
- Business-scoped isolation
- Role-based access control
- Automatic session management

## Next Steps

### For Developers

1. **Add PIN to Your App:**
   ```typescript
   // src/App.tsx
   import { PINEntry } from './components/PINEntry';

   // Show PIN challenge if required
   if (pinRequired && !pinVerified) {
     return <PINEntry mode="verify" onSuccess={handlePinSuccess} />;
   }
   ```

2. **Add Messaging to Your App:**
   ```typescript
   // src/pages/Chat.tsx
   import { MessagingService } from '../lib/messagingService';

   const service = new MessagingService(session.access_token);
   await service.sendMessage(roomId, encryptedContent);
   ```

3. **Subscribe to Real-time Messages:**
   ```typescript
   const channel = supabase
     .channel(`chat-room:${roomId}`)
     .on('postgres_changes', {
       event: 'INSERT',
       schema: 'public',
       table: 'chat_messages',
       filter: `room_id=eq.${roomId}`
     }, handleNewMessage)
     .subscribe();
   ```

### For Business Owners

1. **Configure PIN Policies:**
   - Go to Supabase Dashboard
   - Navigate to Table Editor → `pin_settings`
   - Set `require_pin=true` for your business
   - Configure lockout duration and attempt limits

2. **Create Default Chat Rooms:**
   - Use `room-create` function to create team rooms
   - Assign members based on roles
   - Set up department channels (Sales, Warehouse, Delivery)

3. **Monitor Usage:**
   - Check `pin_audit_log` for security events
   - Review `chat_notifications_queue` for delivery issues
   - Monitor storage usage in Dashboard

## API Reference (Quick)

### PIN Operations

```bash
# Setup PIN
POST /functions/v1/pin-verify
Body: {"operation":"setup","pin":"123456"}

# Verify PIN
POST /functions/v1/pin-verify
Body: {"operation":"verify","pin":"123456","business_id":"UUID"}

# Change PIN
POST /functions/v1/pin-verify
Body: {"operation":"change","currentPin":"123456","newPin":"654321"}

# Reset PIN (admin only)
POST /functions/v1/pin-reset
Body: {"operation":"reset","target_telegram_id":"USER_ID"}
```

### Messaging Operations

```bash
# Create Room
POST /functions/v1/room-create
Body: {
  "operation":"create",
  "business_id":"UUID",
  "name":"Team Chat",
  "type":"group",
  "initial_members":["telegram_id1","telegram_id2"]
}

# Send Message
POST /functions/v1/message-send
Body: {
  "operation":"send",
  "room_id":"UUID",
  "encrypted_content":"encrypted_text",
  "message_type":"text"
}

# Upload File
POST /functions/v1/file-upload
Body: {
  "operation":"generate_upload_url",
  "room_id":"UUID",
  "message_id":"UUID",
  "file_name":"document.pdf",
  "file_size":1048576,
  "mime_type":"application/pdf",
  "attachment_type":"file"
}
```

## Troubleshooting

### "Unauthorized" Errors
- Verify JWT token is valid: `supabase auth verify $TOKEN`
- Check user exists: `SELECT * FROM users WHERE telegram_id='YOUR_ID'`

### Messages Not Real-time
- Verify Realtime enabled in project settings
- Check subscription: `supabase realtime channels list`
- Ensure RLS allows user to read messages

### File Upload Fails
- Check bucket exists: `SELECT * FROM storage.buckets`
- Verify file size within limits
- Check MIME type is allowed

### PIN Locked Out
```sql
-- Unlock user
UPDATE user_pins
SET failed_attempts=0, locked_until=NULL
WHERE telegram_id='USER_TELEGRAM_ID';
```

## Support

- **Full Deployment Guide:** `SUPABASE_PIN_MESSAGING_DEPLOYMENT.md`
- **Implementation Details:** `PIN_MESSAGING_IMPLEMENTATION_SUMMARY.md`
- **Storage Configuration:** `supabase/STORAGE_SETUP.md`
- **Supabase Docs:** https://supabase.com/docs

## Pro Tips

1. **Test in Staging First:** Use separate Supabase project for testing
2. **Enable Backups:** Configure point-in-time recovery in settings
3. **Monitor Logs:** Check edge function logs daily for errors
4. **Set Alerts:** Configure storage and database usage alerts
5. **Optimize Queries:** Add indexes for your most common queries

---

**You're all set!** Start building secure, encrypted communications into your app. 🚀
