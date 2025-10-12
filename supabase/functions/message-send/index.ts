import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Rate limiting: max 60 messages per minute per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(telegram_id: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const userLimit = rateLimitMap.get(telegram_id);

  if (!userLimit || userLimit.resetAt < now) {
    // Reset limit
    rateLimitMap.set(telegram_id, { count: 1, resetAt: now + 60000 });
    return { allowed: true };
  }

  if (userLimit.count >= 60) {
    const retryAfter = Math.ceil((userLimit.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  userLimit.count += 1;
  return { allowed: true };
}

/**
 * Send a message to a chat room
 */
async function sendMessage(
  telegram_id: string,
  room_id: string,
  encrypted_content: string,
  message_type: string = 'text',
  parent_message_id?: string,
  metadata?: Record<string, any>
) {
  console.log(`Sending message: room=${room_id}, sender=${telegram_id}, type=${message_type}`);

  // Check rate limit
  const rateCheck = checkRateLimit(telegram_id);
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: `Rate limit exceeded. Retry after ${rateCheck.retryAfter} seconds`,
      retry_after: rateCheck.retryAfter,
    };
  }

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

  // Verify room is active
  const { data: room, error: roomError } = await supabase
    .from('chat_rooms')
    .select('is_active, archived')
    .eq('id', room_id)
    .maybeSingle();

  if (roomError || !room || !room.is_active || room.archived) {
    return {
      success: false,
      error: 'Room is not active or archived',
    };
  }

  // Insert message
  const { data: message, error: insertError } = await supabase
    .from('chat_messages')
    .insert({
      room_id,
      sender_telegram_id: telegram_id,
      encrypted_content,
      message_type,
      parent_message_id: parent_message_id || null,
      sent_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError || !message) {
    console.error('Failed to insert message:', insertError);
    return {
      success: false,
      error: 'Failed to send message',
    };
  }

  // Store metadata if provided
  if (metadata && Object.keys(metadata).length > 0) {
    await supabase
      .from('chat_messages')
      .update({ metadata })
      .eq('id', message.id);
  }

  console.log(`Message sent successfully: ${message.id}`);

  return {
    success: true,
    message_id: message.id,
    sent_at: message.sent_at,
  };
}

/**
 * Edit a message
 */
async function editMessage(
  telegram_id: string,
  message_id: string,
  new_encrypted_content: string
) {
  console.log(`Editing message: ${message_id}`);

  // Verify message ownership
  const { data: message, error: messageError } = await supabase
    .from('chat_messages')
    .select('sender_telegram_id, sent_at, is_deleted')
    .eq('id', message_id)
    .maybeSingle();

  if (messageError || !message) {
    return {
      success: false,
      error: 'Message not found',
    };
  }

  if (message.is_deleted) {
    return {
      success: false,
      error: 'Cannot edit deleted message',
    };
  }

  if (message.sender_telegram_id !== telegram_id) {
    return {
      success: false,
      error: 'Not authorized to edit this message',
    };
  }

  // Check if message is too old to edit (5 minutes)
  const sentAt = new Date(message.sent_at);
  const now = new Date();
  const diffMinutes = (now.getTime() - sentAt.getTime()) / 60000;

  if (diffMinutes > 5) {
    return {
      success: false,
      error: 'Message too old to edit (max 5 minutes)',
    };
  }

  // Update message
  const { error: updateError } = await supabase
    .from('chat_messages')
    .update({
      encrypted_content: new_encrypted_content,
      edited_at: new Date().toISOString(),
    })
    .eq('id', message_id);

  if (updateError) {
    console.error('Failed to update message:', updateError);
    return {
      success: false,
      error: 'Failed to edit message',
    };
  }

  return {
    success: true,
    message_id,
    edited_at: new Date().toISOString(),
  };
}

/**
 * Delete a message (soft delete)
 */
async function deleteMessage(
  telegram_id: string,
  message_id: string
) {
  console.log(`Deleting message: ${message_id}`);

  // Verify message ownership
  const { data: message, error: messageError } = await supabase
    .from('chat_messages')
    .select('sender_telegram_id, is_deleted')
    .eq('id', message_id)
    .maybeSingle();

  if (messageError || !message) {
    return {
      success: false,
      error: 'Message not found',
    };
  }

  if (message.is_deleted) {
    return {
      success: false,
      error: 'Message already deleted',
    };
  }

  if (message.sender_telegram_id !== telegram_id) {
    return {
      success: false,
      error: 'Not authorized to delete this message',
    };
  }

  // Soft delete
  const { error: updateError } = await supabase
    .from('chat_messages')
    .update({
      is_deleted: true,
      encrypted_content: '', // Clear content
    })
    .eq('id', message_id);

  if (updateError) {
    console.error('Failed to delete message:', updateError);
    return {
      success: false,
      error: 'Failed to delete message',
    };
  }

  return {
    success: true,
    message_id,
  };
}

/**
 * Add reaction to message
 */
async function addReaction(
  telegram_id: string,
  message_id: string,
  emoji: string
) {
  console.log(`Adding reaction: message=${message_id}, emoji=${emoji}`);

  // Get room_id from message
  const { data: message, error: messageError } = await supabase
    .from('chat_messages')
    .select('room_id')
    .eq('id', message_id)
    .maybeSingle();

  if (messageError || !message) {
    return {
      success: false,
      error: 'Message not found',
    };
  }

  // Verify room membership
  const { data: membership, error: memberError } = await supabase
    .from('chat_room_members')
    .select('telegram_id')
    .eq('room_id', message.room_id)
    .eq('telegram_id', telegram_id)
    .maybeSingle();

  if (memberError || !membership) {
    return {
      success: false,
      error: 'Not a member of this room',
    };
  }

  // Insert or update reaction
  const { data: reaction, error: reactionError } = await supabase
    .from('chat_message_reactions')
    .upsert({
      message_id,
      room_id: message.room_id,
      telegram_id,
      reaction_emoji: emoji,
    })
    .select()
    .single();

  if (reactionError) {
    console.error('Failed to add reaction:', reactionError);
    return {
      success: false,
      error: 'Failed to add reaction',
    };
  }

  return {
    success: true,
    reaction_id: reaction.id,
  };
}

/**
 * Remove reaction from message
 */
async function removeReaction(
  telegram_id: string,
  message_id: string,
  emoji: string
) {
  console.log(`Removing reaction: message=${message_id}, emoji=${emoji}`);

  const { error: deleteError } = await supabase
    .from('chat_message_reactions')
    .delete()
    .eq('message_id', message_id)
    .eq('telegram_id', telegram_id)
    .eq('reaction_emoji', emoji);

  if (deleteError) {
    console.error('Failed to remove reaction:', deleteError);
    return {
      success: false,
      error: 'Failed to remove reaction',
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
      case 'send':
        const { room_id, encrypted_content, message_type, parent_message_id, metadata } = body;
        if (!room_id || !encrypted_content) {
          throw new Error('room_id and encrypted_content are required');
        }
        result = await sendMessage(
          telegram_id,
          room_id,
          encrypted_content,
          message_type,
          parent_message_id,
          metadata
        );
        break;

      case 'edit':
        const { message_id: edit_message_id, new_encrypted_content } = body;
        if (!edit_message_id || !new_encrypted_content) {
          throw new Error('message_id and new_encrypted_content are required');
        }
        result = await editMessage(telegram_id, edit_message_id, new_encrypted_content);
        break;

      case 'delete':
        const { message_id: delete_message_id } = body;
        if (!delete_message_id) {
          throw new Error('message_id is required');
        }
        result = await deleteMessage(telegram_id, delete_message_id);
        break;

      case 'add_reaction':
        const { message_id: react_message_id, emoji } = body;
        if (!react_message_id || !emoji) {
          throw new Error('message_id and emoji are required');
        }
        result = await addReaction(telegram_id, react_message_id, emoji);
        break;

      case 'remove_reaction':
        const { message_id: unreact_message_id, emoji: remove_emoji } = body;
        if (!unreact_message_id || !remove_emoji) {
          throw new Error('message_id and emoji are required');
        }
        result = await removeReaction(telegram_id, unreact_message_id, remove_emoji);
        break;

      default:
        throw new Error('Invalid operation. Use: send, edit, delete, add_reaction, remove_reaction');
    }

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Message operation error:', err);
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
