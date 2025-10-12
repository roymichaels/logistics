# Supabase Storage Configuration for Messaging System

This guide explains how to configure Supabase Storage buckets for the messaging system's file uploads, voice notes, and media attachments.

## Required Storage Buckets

### 1. chat-files (Private Bucket)
**Purpose:** Store documents, images, videos, and general file attachments

**Configuration:**
```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-files',
  'chat-files',
  false, -- Private bucket
  20971520, -- 20MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'video/mp4',
    'video/webm'
  ]
);
```

### 2. chat-voice-notes (Private Bucket)
**Purpose:** Store voice note recordings

**Configuration:**
```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-voice-notes',
  'chat-voice-notes',
  false, -- Private bucket
  5242880, -- 5MB limit
  ARRAY[
    'audio/webm',
    'audio/ogg',
    'audio/mpeg',
    'audio/mp4'
  ]
);
```

### 3. chat-thumbnails (Private Bucket)
**Purpose:** Store auto-generated thumbnails for images and videos

**Configuration:**
```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-thumbnails',
  'chat-thumbnails',
  false, -- Private bucket
  1048576, -- 1MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
);
```

## Row Level Security (RLS) Policies

### chat-files Bucket Policies

```sql
-- Users can upload files to rooms they are members of
CREATE POLICY "Users upload to member rooms"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-files'
  AND (storage.foldername(name))[1] IN (
    SELECT room_id::text FROM chat_room_members
    WHERE telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
  )
);

-- Users can view files in rooms they are members of
CREATE POLICY "Users view files in member rooms"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-files'
  AND (storage.foldername(name))[1] IN (
    SELECT room_id::text FROM chat_room_members
    WHERE telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
  )
);

-- Users can delete their own uploaded files
CREATE POLICY "Users delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-files'
  AND (storage.foldername(name))[1] IN (
    SELECT room_id::text FROM chat_room_members
    WHERE telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
  )
  AND owner = auth.uid()
);
```

### chat-voice-notes Bucket Policies

```sql
-- Users can upload voice notes to rooms they are members of
CREATE POLICY "Users upload voice notes to member rooms"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-voice-notes'
  AND (storage.foldername(name))[1] IN (
    SELECT room_id::text FROM chat_room_members
    WHERE telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
  )
);

-- Users can view voice notes in rooms they are members of
CREATE POLICY "Users view voice notes in member rooms"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-voice-notes'
  AND (storage.foldername(name))[1] IN (
    SELECT room_id::text FROM chat_room_members
    WHERE telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
  )
);

-- Users can delete their own voice notes
CREATE POLICY "Users delete own voice notes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-voice-notes'
  AND owner = auth.uid()
);
```

### chat-thumbnails Bucket Policies

```sql
-- Thumbnails inherit permissions from parent files
CREATE POLICY "Users view thumbnails in member rooms"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-thumbnails'
  AND (storage.foldername(name))[1] IN (
    SELECT room_id::text FROM chat_room_members
    WHERE telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id'
  )
);

-- Only service role can create/delete thumbnails (auto-generated)
CREATE POLICY "Service role manages thumbnails"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'chat-thumbnails')
WITH CHECK (bucket_id = 'chat-thumbnails');
```

## File Organization Structure

Files are organized in storage using the following path structure:

```
chat-files/
└── {room_id}/
    ├── {message_id}_{timestamp}.{extension}
    ├── {message_id}_{timestamp}.{extension}
    └── ...

chat-voice-notes/
└── {room_id}/
    ├── {message_id}_{timestamp}.webm
    ├── {message_id}_{timestamp}.ogg
    └── ...

chat-thumbnails/
└── {room_id}/
    ├── {message_id}_{timestamp}_thumb.jpg
    └── ...
```

### Example Paths:
- File: `chat-files/550e8400-e29b-41d4-a716-446655440000/abc123_1697123456789.pdf`
- Voice: `chat-voice-notes/550e8400-e29b-41d4-a716-446655440000/xyz789_1697123456789.webm`
- Thumbnail: `chat-thumbnails/550e8400-e29b-41d4-a716-446655440000/abc123_1697123456789_thumb.jpg`

## Security Features

### 1. Private Buckets
All buckets are configured as private, requiring authentication and proper RLS policies for access.

### 2. File Size Limits
- chat-files: 20MB maximum
- chat-voice-notes: 5MB maximum
- chat-thumbnails: 1MB maximum

### 3. MIME Type Restrictions
Each bucket only accepts specific file types to prevent malicious uploads.

### 4. Room-Based Access Control
Files are isolated by room_id in the storage path, and RLS policies ensure users can only access files in rooms they are members of.

### 5. Virus Scanning (Optional)
The `message_attachments` table includes a `virus_scan_status` column. In production, integrate with a virus scanning service:

```typescript
// Pseudocode for virus scanning integration
async function scanUploadedFile(storage_path: string) {
  const { data: file } = await supabase.storage
    .from('chat-files')
    .download(storage_path);

  const scanResult = await virusScanningService.scan(file);

  await supabase
    .from('message_attachments')
    .update({
      virus_scan_status: scanResult.isClean ? 'clean' : 'infected',
      virus_scan_at: new Date().toISOString(),
    })
    .eq('storage_path', storage_path);
}
```

## Deployment Steps

### Option 1: Using Supabase Dashboard

1. Navigate to **Storage** in your Supabase dashboard
2. Click **New bucket**
3. For each bucket (`chat-files`, `chat-voice-notes`, `chat-thumbnails`):
   - Enter bucket name
   - Set **Public bucket** to OFF
   - Configure **File size limit**
   - Add **Allowed MIME types**
   - Click **Create bucket**

4. Navigate to **Policies** tab for each bucket
5. Click **New policy**
6. Copy and paste the RLS policies from above
7. Click **Review** and **Save**

### Option 2: Using SQL Editor

1. Navigate to **SQL Editor** in your Supabase dashboard
2. Create a new query
3. Copy and paste all bucket creation SQL and RLS policies
4. Click **Run**

### Option 3: Using Supabase CLI

```bash
# Apply storage configuration from migration
supabase db push

# Or run specific SQL file
psql $DATABASE_URL -f supabase/migrations/storage_setup.sql
```

## Monitoring and Maintenance

### Storage Usage Monitoring

```sql
-- Check total storage usage per bucket
SELECT
  bucket_id,
  COUNT(*) as file_count,
  pg_size_pretty(SUM(metadata->>'size')::bigint) as total_size
FROM storage.objects
WHERE bucket_id IN ('chat-files', 'chat-voice-notes', 'chat-thumbnails')
GROUP BY bucket_id;
```

### Cleanup Old Files

```sql
-- Delete files older than 90 days (adjust as needed)
DELETE FROM storage.objects
WHERE bucket_id IN ('chat-files', 'chat-voice-notes')
AND created_at < NOW() - INTERVAL '90 days';
```

### Voice Note Retention Policy

```sql
-- Auto-delete voice notes older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_voice_notes()
RETURNS void AS $$
BEGIN
  DELETE FROM storage.objects
  WHERE bucket_id = 'chat-voice-notes'
  AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule with pg_cron
SELECT cron.schedule(
  'cleanup-old-voice-notes',
  '0 2 * * *', -- Run daily at 2 AM
  $$ SELECT cleanup_old_voice_notes(); $$
);
```

## Troubleshooting

### Issue: Files not uploading

**Check:**
1. Bucket exists and is properly configured
2. RLS policies are enabled and correct
3. User is authenticated and member of the room
4. File size and MIME type are within limits

### Issue: Cannot download files

**Check:**
1. Presigned URLs are being generated correctly
2. URLs haven't expired (7-day limit)
3. User has room membership
4. File wasn't deleted or marked as infected

### Issue: Storage quota exceeded

**Solution:**
1. Review file retention policies
2. Implement automatic cleanup for old files
3. Upgrade Supabase plan for more storage
4. Implement file compression before upload

## Cost Optimization

1. **Compress images before upload** - Use client-side compression to reduce file sizes
2. **Set retention policies** - Auto-delete files after a certain period
3. **Use thumbnails** - Generate and serve thumbnails instead of full-size images when possible
4. **Monitor usage** - Set up alerts when approaching storage limits

## Related Documentation

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [RLS Policies Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [File Upload Edge Function](../functions/file-upload/index.ts)
- [Message Attachments Schema](./migrations/20251012110000_messaging_system.sql)
