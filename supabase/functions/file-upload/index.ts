import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_VOICE_NOTE_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_FILE_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Audio/Voice
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4',
  // Video
  'video/mp4',
  'video/webm',
];

/**
 * Validate file upload
 */
function validateFileUpload(
  file_type: string,
  file_size: number,
  attachment_type: string
): { valid: boolean; error?: string } {
  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file_type)) {
    return {
      valid: false,
      error: `File type ${file_type} is not allowed`,
    };
  }

  // Check file size
  const maxSize = attachment_type === 'voice_note' ? MAX_VOICE_NOTE_SIZE : MAX_FILE_SIZE;
  if (file_size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
    };
  }

  return { valid: true };
}

/**
 * Generate signed upload URL
 */
async function generateUploadUrl(
  telegram_id: string,
  room_id: string,
  message_id: string,
  file_name: string,
  file_size: number,
  mime_type: string,
  attachment_type: 'image' | 'video' | 'audio' | 'voice_note' | 'file' | 'document'
) {
  console.log(`Generating upload URL: room=${room_id}, file=${file_name}`);

  // Verify room membership
  const { data: membership, error: memberError } = await supabase
    .from('chat_room_members')
    .select('telegram_id')
    .eq('room_id', room_id)
    .eq('telegram_id', telegram_id)
    .maybeSingle();

  if (memberError || !membership) {
    return {
      success: false,
      error: 'Not a member of this room',
    };
  }

  // Validate file upload
  const validation = validateFileUpload(mime_type, file_size, attachment_type);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  // Determine storage bucket and path
  const bucket = attachment_type === 'voice_note' ? 'chat-voice-notes' : 'chat-files';
  const file_extension = file_name.split('.').pop();
  const unique_name = `${message_id}_${Date.now()}.${file_extension}`;
  const storage_path = `${room_id}/${unique_name}`;

  // Generate signed URL for upload (valid for 5 minutes)
  const { data: signedUrlData, error: signedUrlError } = await supabase
    .storage
    .from(bucket)
    .createSignedUploadUrl(storage_path);

  if (signedUrlError) {
    console.error('Failed to generate signed URL:', signedUrlError);
    return {
      success: false,
      error: 'Failed to generate upload URL',
    };
  }

  // Create attachment record
  const { data: attachment, error: attachmentError } = await supabase
    .from('message_attachments')
    .insert({
      message_id,
      room_id,
      attachment_type,
      storage_path,
      storage_bucket: bucket,
      file_name,
      file_size,
      mime_type,
      uploaded_by: telegram_id,
      virus_scan_status: 'pending',
    })
    .select()
    .single();

  if (attachmentError || !attachment) {
    console.error('Failed to create attachment record:', attachmentError);
    return {
      success: false,
      error: 'Failed to create attachment record',
    };
  }

  console.log(`Upload URL generated: ${attachment.id}`);

  return {
    success: true,
    upload_url: signedUrlData.signedUrl,
    upload_token: signedUrlData.token,
    attachment_id: attachment.id,
    storage_path,
    expires_in: 300, // 5 minutes
  };
}

/**
 * Confirm file upload completion
 */
async function confirmUpload(
  telegram_id: string,
  attachment_id: string
) {
  console.log(`Confirming upload: ${attachment_id}`);

  // Get attachment
  const { data: attachment, error: attachmentError } = await supabase
    .from('message_attachments')
    .select('room_id, uploaded_by, storage_bucket, storage_path')
    .eq('id', attachment_id)
    .maybeSingle();

  if (attachmentError || !attachment) {
    return {
      success: false,
      error: 'Attachment not found',
    };
  }

  // Verify uploader
  if (attachment.uploaded_by !== telegram_id) {
    return {
      success: false,
      error: 'Not authorized to confirm this upload',
    };
  }

  // Verify file exists in storage
  const { data: fileData, error: fileError } = await supabase
    .storage
    .from(attachment.storage_bucket)
    .download(attachment.storage_path);

  if (fileError) {
    console.error('File not found in storage:', fileError);
    // Mark attachment for cleanup
    await supabase
      .from('message_attachments')
      .update({ virus_scan_status: 'error' })
      .eq('id', attachment_id);

    return {
      success: false,
      error: 'File upload incomplete',
    };
  }

  // Generate presigned URL for download (7 days)
  const { data: urlData, error: urlError } = await supabase
    .storage
    .from(attachment.storage_bucket)
    .createSignedUrl(attachment.storage_path, 7 * 24 * 60 * 60); // 7 days

  if (urlError) {
    console.error('Failed to generate download URL:', urlError);
    return {
      success: false,
      error: 'Failed to generate download URL',
    };
  }

  // Mark as clean (virus scanning would happen here in production)
  await supabase
    .from('message_attachments')
    .update({
      virus_scan_status: 'clean',
      virus_scan_at: new Date().toISOString(),
    })
    .eq('id', attachment_id);

  console.log(`Upload confirmed: ${attachment_id}`);

  return {
    success: true,
    download_url: urlData.signedUrl,
    attachment_id,
  };
}

/**
 * Get download URL for attachment
 */
async function getDownloadUrl(
  telegram_id: string,
  attachment_id: string
) {
  console.log(`Getting download URL: ${attachment_id}`);

  // Get attachment
  const { data: attachment, error: attachmentError } = await supabase
    .from('message_attachments')
    .select('room_id, storage_bucket, storage_path, virus_scan_status')
    .eq('id', attachment_id)
    .maybeSingle();

  if (attachmentError || !attachment) {
    return {
      success: false,
      error: 'Attachment not found',
    };
  }

  // Verify room membership
  const { data: membership, error: memberError } = await supabase
    .from('chat_room_members')
    .select('telegram_id')
    .eq('room_id', attachment.room_id)
    .eq('telegram_id', telegram_id)
    .maybeSingle();

  if (memberError || !membership) {
    return {
      success: false,
      error: 'Not authorized to access this attachment',
    };
  }

  // Check virus scan status
  if (attachment.virus_scan_status === 'infected') {
    return {
      success: false,
      error: 'File is infected and cannot be downloaded',
    };
  }

  // Generate presigned URL (7 days)
  const { data: urlData, error: urlError } = await supabase
    .storage
    .from(attachment.storage_bucket)
    .createSignedUrl(attachment.storage_path, 7 * 24 * 60 * 60);

  if (urlError) {
    console.error('Failed to generate download URL:', urlError);
    return {
      success: false,
      error: 'Failed to generate download URL',
    };
  }

  return {
    success: true,
    download_url: urlData.signedUrl,
    expires_in: 7 * 24 * 60 * 60, // 7 days in seconds
  };
}

/**
 * Delete attachment
 */
async function deleteAttachment(
  telegram_id: string,
  attachment_id: string
) {
  console.log(`Deleting attachment: ${attachment_id}`);

  // Get attachment
  const { data: attachment, error: attachmentError } = await supabase
    .from('message_attachments')
    .select('uploaded_by, storage_bucket, storage_path, message_id')
    .eq('id', attachment_id)
    .maybeSingle();

  if (attachmentError || !attachment) {
    return {
      success: false,
      error: 'Attachment not found',
    };
  }

  // Verify uploader
  if (attachment.uploaded_by !== telegram_id) {
    return {
      success: false,
      error: 'Not authorized to delete this attachment',
    };
  }

  // Delete from storage
  const { error: storageError } = await supabase
    .storage
    .from(attachment.storage_bucket)
    .remove([attachment.storage_path]);

  if (storageError) {
    console.error('Failed to delete from storage:', storageError);
    // Continue anyway
  }

  // Delete attachment record
  const { error: deleteError } = await supabase
    .from('message_attachments')
    .delete()
    .eq('id', attachment_id);

  if (deleteError) {
    console.error('Failed to delete attachment record:', deleteError);
    return {
      success: false,
      error: 'Failed to delete attachment',
    };
  }

  return {
    success: true,
  };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const telegram_id = user.user_metadata?.telegram_id?.toString();
    if (!telegram_id) {
      throw new Error('Telegram ID not found in user metadata');
    }

    const body = await req.json();
    const { operation } = body;

    let result;
    switch (operation) {
      case 'generate_upload_url':
        const { room_id, message_id, file_name, file_size, mime_type, attachment_type } = body;
        if (!room_id || !message_id || !file_name || !file_size || !mime_type || !attachment_type) {
          throw new Error('All parameters are required');
        }
        result = await generateUploadUrl(
          telegram_id,
          room_id,
          message_id,
          file_name,
          file_size,
          mime_type,
          attachment_type
        );
        break;

      case 'confirm_upload':
        const { attachment_id: confirm_attachment_id } = body;
        if (!confirm_attachment_id) {
          throw new Error('attachment_id is required');
        }
        result = await confirmUpload(telegram_id, confirm_attachment_id);
        break;

      case 'get_download_url':
        const { attachment_id: download_attachment_id } = body;
        if (!download_attachment_id) {
          throw new Error('attachment_id is required');
        }
        result = await getDownloadUrl(telegram_id, download_attachment_id);
        break;

      case 'delete':
        const { attachment_id: delete_attachment_id } = body;
        if (!delete_attachment_id) {
          throw new Error('attachment_id is required');
        }
        result = await deleteAttachment(telegram_id, delete_attachment_id);
        break;

      default:
        throw new Error('Invalid operation. Use: generate_upload_url, confirm_upload, get_download_url, delete');
    }

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('File upload operation error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Internal Server Error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
