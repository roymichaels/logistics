# Supabase PIN Authentication & Messaging System - Complete Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the PIN authentication and messaging system to your Supabase project. The implementation is **100% Supabase-native**, leveraging:

- **Supabase Database (PostgreSQL)** - Schema, RLS policies, triggers, functions
- **Supabase Auth** - User authentication with Telegram
- **Supabase Edge Functions** - Server-side business logic
- **Supabase Storage** - File uploads and media
- **Supabase Realtime** - Live message updates

## Prerequisites

Before starting, ensure you have:

1. **Supabase Project** - Active project at [supabase.com](https://supabase.com)
2. **Supabase CLI** - Installed and authenticated
   ```bash
   npm install -g supabase
   supabase login
   ```
3. **Project Linked** - Your local environment linked to Supabase project
   ```bash
   supabase link --project-ref your-project-ref
   ```
4. **Telegram Bot** - Bot token from [@BotFather](https://t.me/botfather)

## Phase 1: Database Schema Deployment

### Step 1.1: Deploy PIN Authentication Schema

```bash
# Apply PIN authentication migration
supabase db push --db-url $DATABASE_URL

# Or use SQL Editor in Supabase Dashboard
# Copy contents of: supabase/migrations/20251012100000_pin_authentication_system.sql
```

**Verify:**
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_pins', 'pin_audit_log', 'pin_settings', 'pin_sessions');
```

### Step 1.2: Deploy Messaging System Schema

```bash
# Apply messaging system migration
supabase db push
```

**Verify:**
```sql
-- Check messaging tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('message_attachments', 'chat_message_reactions', 'chat_notifications_queue', 'chat_encryption_keys');
```

### Step 1.3: Verify RLS Policies

```sql
-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user_pins', 'chat_messages', 'message_attachments')
AND rowsecurity = true;

-- Should return all tables with rowsecurity = true
```

## Phase 2: Storage Configuration

### Step 2.1: Create Storage Buckets

**Option A: Using Supabase Dashboard**

1. Navigate to **Storage** → **New bucket**
2. Create three buckets:

**chat-files:**
- Name: `chat-files`
- Public: OFF
- File size limit: `20971520` (20MB)
- Allowed MIME types: `image/jpeg, image/png, image/gif, application/pdf, video/mp4`

**chat-voice-notes:**
- Name: `chat-voice-notes`
- Public: OFF
- File size limit: `5242880` (5MB)
- Allowed MIME types: `audio/webm, audio/ogg, audio/mpeg`

**chat-thumbnails:**
- Name: `chat-thumbnails`
- Public: OFF
- File size limit: `1048576` (1MB)
- Allowed MIME types: `image/jpeg, image/png`

**Option B: Using SQL**

```sql
-- Run in SQL Editor
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('chat-files', 'chat-files', false, 20971520),
  ('chat-voice-notes', 'chat-voice-notes', false, 5242880),
  ('chat-thumbnails', 'chat-thumbnails', false, 1048576);
```

### Step 2.2: Apply Storage RLS Policies

See `supabase/STORAGE_SETUP.md` for complete RLS policies. Apply them in the Supabase Dashboard under **Storage** → **Policies** for each bucket.

**Verify:**
```sql
-- Check storage policies exist
SELECT * FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects';
```

## Phase 3: Edge Functions Deployment

### Step 3.1: Set Required Secrets

```bash
# Set Telegram bot token
supabase secrets set TELEGRAM_BOT_TOKEN=your_bot_token_here

# Verify secrets are set
supabase secrets list
```

### Step 3.2: Deploy PIN Functions

```bash
# Deploy PIN verify function
supabase functions deploy pin-verify

# Deploy PIN reset function
supabase functions deploy pin-reset
```

**Test PIN Functions:**
```bash
# Test pin-verify setup
curl -X POST "https://your-project-ref.supabase.co/functions/v1/pin-verify" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"operation":"setup","pin":"123456"}'
```

### Step 3.3: Deploy Messaging Functions

```bash
# Deploy message send function
supabase functions deploy message-send

# Deploy room create function
supabase functions deploy room-create

# Deploy file upload function
supabase functions deploy file-upload
```

**Verify Deployments:**
```bash
# List all deployed functions
supabase functions list

# Check function logs
supabase functions logs pin-verify --tail
```

## Phase 4: Frontend Integration

### Step 4.1: Update Environment Variables

Add to your `.env` file:

```bash
# Existing variables
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# New function URLs (automatically derived from above)
# No additional variables needed - functions are accessible via:
# ${VITE_SUPABASE_URL}/functions/v1/pin-verify
# ${VITE_SUPABASE_URL}/functions/v1/message-send
# etc.
```

### Step 4.2: Add PIN Service Integration

The PIN authentication service is already implemented in `src/utils/security/pinAuth.ts`. To integrate:

**1. Update AuthContext to support PIN:**

```typescript
// In src/context/AuthContext.tsx
import { PINAuthService } from '../utils/security/pinAuth';

// Add PIN state
const [pinRequired, setPinRequired] = useState(false);
const [pinVerified, setPinVerified] = useState(false);
const pinService = new PINAuthService();

// Check PIN requirement after Telegram auth
useEffect(() => {
  if (user && activeBusinessId) {
    checkPinRequirement(activeBusinessId);
  }
}, [user, activeBusinessId]);

async function checkPinRequirement(businessId: string) {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/pin-verify`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'check_required',
        business_id: businessId,
      }),
    }
  );
  const data = await response.json();
  setPinRequired(data.required);
}
```

**2. Add PIN challenge component:**

```typescript
// In src/App.tsx
import { PINEntry } from './components/PINEntry';

function App() {
  // ... existing code

  // Show PIN entry if required and not verified
  if (pinRequired && !pinVerified) {
    return (
      <PINEntry
        mode="verify"
        onSuccess={async (pin) => {
          // Verify PIN with backend
          const response = await fetch(
            `${supabaseUrl}/functions/v1/pin-verify`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                operation: 'verify',
                pin,
                business_id: activeBusinessId,
              }),
            }
          );
          const data = await response.json();
          if (data.success) {
            setPinVerified(true);
            // Store PIN session token
            sessionStorage.setItem('pin_session', data.session_token);
          }
        }}
      />
    );
  }

  // ... rest of app
}
```

### Step 4.3: Add Messaging Service

Create `src/lib/messagingService.ts`:

```typescript
import { supabase } from './supabaseClient';

export class MessagingService {
  private supabaseUrl: string;
  private accessToken: string;

  constructor(accessToken: string) {
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    this.accessToken = accessToken;
  }

  /**
   * Send encrypted message to room
   */
  async sendMessage(
    roomId: string,
    encryptedContent: string,
    messageType: 'text' | 'image' | 'file' = 'text'
  ) {
    const response = await fetch(
      `${this.supabaseUrl}/functions/v1/message-send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'send',
          room_id: roomId,
          encrypted_content: encryptedContent,
          message_type: messageType,
        }),
      }
    );
    return response.json();
  }

  /**
   * Create chat room
   */
  async createRoom(
    businessId: string,
    name: string,
    type: 'direct' | 'group' | 'team',
    initialMembers: string[] = []
  ) {
    const response = await fetch(
      `${this.supabaseUrl}/functions/v1/room-create`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'create',
          business_id: businessId,
          name,
          type,
          initial_members: initialMembers,
        }),
      }
    );
    return response.json();
  }

  /**
   * Subscribe to room messages in real-time
   */
  subscribeToRoom(roomId: string, callback: (message: any) => void) {
    const channel = supabase
      .channel(`chat-room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Upload file attachment
   */
  async uploadFile(
    roomId: string,
    messageId: string,
    file: File,
    attachmentType: 'image' | 'file' | 'voice_note'
  ) {
    // Step 1: Get signed upload URL
    const urlResponse = await fetch(
      `${this.supabaseUrl}/functions/v1/file-upload`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'generate_upload_url',
          room_id: roomId,
          message_id: messageId,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          attachment_type: attachmentType,
        }),
      }
    );
    const urlData = await urlResponse.json();
    if (!urlData.success) throw new Error(urlData.error);

    // Step 2: Upload file to signed URL
    const uploadResponse = await fetch(urlData.upload_url, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
        'x-upsert': 'true',
      },
    });
    if (!uploadResponse.ok) throw new Error('Upload failed');

    // Step 3: Confirm upload
    const confirmResponse = await fetch(
      `${this.supabaseUrl}/functions/v1/file-upload`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'confirm_upload',
          attachment_id: urlData.attachment_id,
        }),
      }
    );
    return confirmResponse.json();
  }
}
```

### Step 4.4: Create Chat Page Component

Create `src/pages/Chat.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { MessagingService } from '../lib/messagingService';
import { encryptMessage, decryptMessage } from '../lib/chatEncryption';
import { useAuth } from '../context/AuthContext';

export function Chat() {
  const { session, activeBusinessId } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');

  const messagingService = new MessagingService(session?.access_token);

  // Load rooms
  useEffect(() => {
    loadRooms();
  }, [activeBusinessId]);

  // Subscribe to selected room
  useEffect(() => {
    if (!selectedRoom) return;

    const unsubscribe = messagingService.subscribeToRoom(
      selectedRoom.id,
      async (newMessage) => {
        // Decrypt message
        const decrypted = await decryptMessage(
          newMessage.encrypted_content,
          selectedRoom.id
        );
        setMessages(prev => [...prev, { ...newMessage, content: decrypted }]);
      }
    );

    return unsubscribe;
  }, [selectedRoom]);

  async function loadRooms() {
    const { data } = await supabase
      .from('v_chat_room_list')
      .select('*')
      .eq('business_id', activeBusinessId);
    setRooms(data || []);
  }

  async function sendMessage() {
    if (!messageText.trim() || !selectedRoom) return;

    // Encrypt message client-side
    const encrypted = await encryptMessage(messageText, selectedRoom.id);

    await messagingService.sendMessage(
      selectedRoom.id,
      encrypted,
      'text'
    );

    setMessageText('');
  }

  return (
    <div>
      {/* Room list sidebar */}
      <div>
        {rooms.map(room => (
          <div key={room.id} onClick={() => setSelectedRoom(room)}>
            {room.name}
            {room.unread_count > 0 && <span>{room.unread_count}</span>}
          </div>
        ))}
      </div>

      {/* Messages area */}
      <div>
        {messages.map(msg => (
          <div key={msg.id}>
            <strong>{msg.sender_telegram_id}:</strong> {msg.content}
          </div>
        ))}
      </div>

      {/* Compose area */}
      <input
        value={messageText}
        onChange={(e) => setMessageText(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
      />
    </div>
  );
}
```

## Phase 5: Testing & Verification

### Step 5.1: Test PIN Authentication

```bash
# Test PIN setup
curl -X POST "$SUPABASE_URL/functions/v1/pin-verify" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"operation":"setup","pin":"123456"}'

# Expected: {"success":true,"message":"PIN setup successfully"}

# Test PIN verify
curl -X POST "$SUPABASE_URL/functions/v1/pin-verify" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"operation":"verify","pin":"123456"}'

# Expected: {"success":true,"session_token":"...","expires_at":"..."}
```

### Step 5.2: Test Messaging Functions

```bash
# Create a room
curl -X POST "$SUPABASE_URL/functions/v1/room-create" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation":"create",
    "business_id":"YOUR_BUSINESS_ID",
    "name":"Test Room",
    "type":"group",
    "initial_members":[]
  }'

# Expected: {"success":true,"room_id":"...","encryption_key_id":"..."}

# Send a message
curl -X POST "$SUPABASE_URL/functions/v1/message-send" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation":"send",
    "room_id":"ROOM_ID_FROM_ABOVE",
    "encrypted_content":"encrypted_test_message",
    "message_type":"text"
  }'

# Expected: {"success":true,"message_id":"..."}
```

### Step 5.3: Verify Real-time Subscriptions

In browser console:

```javascript
// Subscribe to room changes
const channel = supabase
  .channel('chat-room:YOUR_ROOM_ID')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_messages',
    filter: 'room_id=eq.YOUR_ROOM_ID'
  }, (payload) => {
    console.log('New message:', payload);
  })
  .subscribe();

// Send a test message and verify you receive it in real-time
```

## Phase 6: Production Optimization

### Step 6.1: Enable pg_cron for Cleanup Jobs

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule PIN session cleanup
SELECT cron.schedule(
  'cleanup-expired-pin-sessions',
  '0 * * * *', -- Every hour
  $$ SELECT cleanup_expired_pin_sessions(); $$
);

-- Schedule notification cleanup
SELECT cron.schedule(
  'cleanup-expired-notifications',
  '0 */6 * * *', -- Every 6 hours
  $$ SELECT cleanup_expired_notifications(); $$
);
```

### Step 6.2: Set Up Monitoring

**In Supabase Dashboard:**

1. Navigate to **Database** → **Monitoring**
2. Set up alerts for:
   - Storage approaching limits
   - High database load
   - Failed function invocations

### Step 6.3: Configure Backups

**Ensure automatic backups are enabled:**

1. Navigate to **Settings** → **Database**
2. Verify **Point-in-time Recovery** is enabled
3. Configure backup retention (7-30 days recommended)

## Troubleshooting

### Issue: Edge functions return 401 Unauthorized

**Solution:**
- Verify JWT token is valid and not expired
- Check function has correct CORS headers
- Ensure user has Supabase session

### Issue: Messages not appearing in real-time

**Solution:**
- Verify Realtime is enabled in project settings
- Check RLS policies allow user to read messages
- Confirm channel subscription is active

### Issue: File uploads failing

**Solution:**
- Verify storage buckets exist
- Check RLS policies on storage.objects
- Ensure file size within limits
- Verify MIME type is allowed

### Issue: PIN lockout issues

**Solution:**
```sql
-- Unlock user's PIN
UPDATE user_pins
SET failed_attempts = 0, locked_until = NULL
WHERE telegram_id = 'USER_TELEGRAM_ID';
```

## Security Checklist

Before going live, verify:

- [ ] All RLS policies are enabled and tested
- [ ] PIN hashing uses PBKDF2 with 100k iterations
- [ ] Storage buckets are private
- [ ] Edge functions validate all inputs
- [ ] Rate limiting is configured
- [ ] Audit logging is enabled
- [ ] Backups are scheduled
- [ ] Secrets are set and not exposed
- [ ] HTTPS is enforced everywhere

## Performance Tips

1. **Index optimization:**
   ```sql
   -- Ensure indexes exist for common queries
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_messages_room_sent
   ON chat_messages(room_id, sent_at DESC);
   ```

2. **Connection pooling:**
   - Use Supabase connection pooler for high traffic
   - Configure in Database settings

3. **Realtime optimization:**
   - Limit number of simultaneous subscriptions
   - Unsubscribe from channels when not in use

## Next Steps

After successful deployment:

1. **Monitor usage** - Check function logs and database metrics
2. **User feedback** - Gather feedback on PIN and messaging UX
3. **Iterate** - Add features like voice notes, file sharing
4. **Scale** - Optimize based on usage patterns

## Support Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Storage Documentation](https://supabase.com/docs/guides/storage)
- [Realtime Guide](https://supabase.com/docs/guides/realtime)
- Project-specific: Review docs in `docs/` directory

---

**Deployment complete!** Your PIN authentication and messaging system is now live on Supabase.
