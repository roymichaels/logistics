import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Generate encryption key ID for room
 */
function generateKeyId(): string {
  const array = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a new chat room
 */
async function createRoom(
  creator_telegram_id: string,
  business_id: string,
  name: string,
  type: 'direct' | 'group' | 'team',
  initial_members: string[],
  metadata?: Record<string, any>
) {
  console.log(`Creating room: name=${name}, type=${type}, business=${business_id}`);

  // Verify creator is in the business
  const { data: creatorBusiness, error: businessError } = await supabase
    .from('business_users')
    .select('role')
    .eq('business_id', business_id)
    .eq('user_id', creator_telegram_id)
    .eq('active', true)
    .maybeSingle();

  if (businessError || !creatorBusiness) {
    return {
      success: false,
      error: 'Not a member of this business',
    };
  }

  // For direct messages, check if room already exists
  if (type === 'direct' && initial_members.length === 1) {
    const other_member = initial_members[0];
    const { data: existingRoom } = await supabase
      .rpc('get_or_create_dm_room', {
        p_business_id: business_id,
        p_user1_telegram_id: creator_telegram_id,
        p_user2_telegram_id: other_member,
      });

    if (existingRoom) {
      return {
        success: true,
        room_id: existingRoom,
        existing: true,
      };
    }
  }

  // Generate encryption key ID
  const encryption_key_id = generateKeyId();

  // Create room
  const { data: room, error: roomError } = await supabase
    .from('chat_rooms')
    .insert({
      business_id,
      name,
      type,
      encryption_key_id,
      created_by: creator_telegram_id,
      is_active: true,
      metadata: metadata || {},
    })
    .select()
    .single();

  if (roomError || !room) {
    console.error('Failed to create room:', roomError);
    return {
      success: false,
      error: 'Failed to create room',
    };
  }

  // Add creator as admin member
  const { error: creatorMemberError } = await supabase
    .from('chat_room_members')
    .insert({
      room_id: room.id,
      telegram_id: creator_telegram_id,
      is_admin: true,
      joined_at: new Date().toISOString(),
    });

  if (creatorMemberError) {
    console.error('Failed to add creator as member:', creatorMemberError);
    // Rollback room creation
    await supabase.from('chat_rooms').delete().eq('id', room.id);
    return {
      success: false,
      error: 'Failed to add creator to room',
    };
  }

  // Add initial members
  if (initial_members.length > 0) {
    const memberInserts = initial_members
      .filter(id => id !== creator_telegram_id) // Don't add creator twice
      .map(telegram_id => ({
        room_id: room.id,
        telegram_id,
        is_admin: false,
        joined_at: new Date().toISOString(),
      }));

    if (memberInserts.length > 0) {
      const { error: membersError } = await supabase
        .from('chat_room_members')
        .insert(memberInserts);

      if (membersError) {
        console.error('Failed to add members:', membersError);
        // Continue anyway, room is created
      }
    }
  }

  // Create encryption key record
  const { error: keyError } = await supabase
    .from('chat_encryption_keys')
    .insert({
      room_id: room.id,
      key_version: 1,
      created_by: creator_telegram_id,
    });

  if (keyError) {
    console.error('Failed to create encryption key record:', keyError);
    // Continue anyway
  }

  // Create DM participant records if direct message
  if (type === 'direct' && initial_members.length > 0) {
    const dm_participants = [
      {
        room_id: room.id,
        telegram_id: creator_telegram_id,
        other_telegram_id: initial_members[0],
      },
      {
        room_id: room.id,
        telegram_id: initial_members[0],
        other_telegram_id: creator_telegram_id,
      },
    ];

    await supabase.from('direct_message_participants').insert(dm_participants);
  }

  console.log(`Room created successfully: ${room.id}`);

  return {
    success: true,
    room_id: room.id,
    encryption_key_id,
    existing: false,
  };
}

/**
 * Add member to room
 */
async function addMember(
  requester_telegram_id: string,
  room_id: string,
  new_member_telegram_id: string
) {
  console.log(`Adding member: room=${room_id}, member=${new_member_telegram_id}`);

  // Verify requester is admin of room
  const { data: requesterMember, error: memberError } = await supabase
    .from('chat_room_members')
    .select('is_admin')
    .eq('room_id', room_id)
    .eq('telegram_id', requester_telegram_id)
    .maybeSingle();

  if (memberError || !requesterMember || !requesterMember.is_admin) {
    return {
      success: false,
      error: 'Not authorized to add members',
    };
  }

  // Check if member already exists
  const { data: existingMember } = await supabase
    .from('chat_room_members')
    .select('telegram_id')
    .eq('room_id', room_id)
    .eq('telegram_id', new_member_telegram_id)
    .maybeSingle();

  if (existingMember) {
    return {
      success: false,
      error: 'User is already a member',
    };
  }

  // Add member
  const { error: insertError } = await supabase
    .from('chat_room_members')
    .insert({
      room_id,
      telegram_id: new_member_telegram_id,
      is_admin: false,
      joined_at: new Date().toISOString(),
    });

  if (insertError) {
    console.error('Failed to add member:', insertError);
    return {
      success: false,
      error: 'Failed to add member',
    };
  }

  // Send system message about member addition
  await supabase.from('chat_messages').insert({
    room_id,
    sender_telegram_id: 'system',
    encrypted_content: `${new_member_telegram_id} joined the room`,
    message_type: 'system',
    sent_at: new Date().toISOString(),
  });

  return {
    success: true,
  };
}

/**
 * Remove member from room
 */
async function removeMember(
  requester_telegram_id: string,
  room_id: string,
  member_telegram_id: string
) {
  console.log(`Removing member: room=${room_id}, member=${member_telegram_id}`);

  // Verify requester is admin of room
  const { data: requesterMember, error: memberError } = await supabase
    .from('chat_room_members')
    .select('is_admin')
    .eq('room_id', room_id)
    .eq('telegram_id', requester_telegram_id)
    .maybeSingle();

  if (memberError || !requesterMember || !requesterMember.is_admin) {
    return {
      success: false,
      error: 'Not authorized to remove members',
    };
  }

  // Don't allow removing the creator
  const { data: room, error: roomError } = await supabase
    .from('chat_rooms')
    .select('created_by')
    .eq('id', room_id)
    .maybeSingle();

  if (!roomError && room && room.created_by === member_telegram_id) {
    return {
      success: false,
      error: 'Cannot remove room creator',
    };
  }

  // Remove member
  const { error: deleteError } = await supabase
    .from('chat_room_members')
    .delete()
    .eq('room_id', room_id)
    .eq('telegram_id', member_telegram_id);

  if (deleteError) {
    console.error('Failed to remove member:', deleteError);
    return {
      success: false,
      error: 'Failed to remove member',
    };
  }

  // Send system message
  await supabase.from('chat_messages').insert({
    room_id,
    sender_telegram_id: 'system',
    encrypted_content: `${member_telegram_id} left the room`,
    message_type: 'system',
    sent_at: new Date().toISOString(),
  });

  return {
    success: true,
  };
}

/**
 * Update room settings
 */
async function updateRoom(
  requester_telegram_id: string,
  room_id: string,
  updates: { name?: string; archived?: boolean; metadata?: Record<string, any> }
) {
  console.log(`Updating room: ${room_id}`);

  // Verify requester is admin of room
  const { data: requesterMember, error: memberError } = await supabase
    .from('chat_room_members')
    .select('is_admin')
    .eq('room_id', room_id)
    .eq('telegram_id', requester_telegram_id)
    .maybeSingle();

  if (memberError || !requesterMember || !requesterMember.is_admin) {
    return {
      success: false,
      error: 'Not authorized to update room',
    };
  }

  // Update room
  const updateData: any = { updated_at: new Date().toISOString() };
  if (updates.name) updateData.name = updates.name;
  if (updates.archived !== undefined) updateData.archived = updates.archived;
  if (updates.metadata) updateData.metadata = updates.metadata;

  const { error: updateError } = await supabase
    .from('chat_rooms')
    .update(updateData)
    .eq('id', room_id);

  if (updateError) {
    console.error('Failed to update room:', updateError);
    return {
      success: false,
      error: 'Failed to update room',
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
      case 'create':
        const { business_id, name, type, initial_members, metadata } = body;
        if (!business_id || !name || !type) {
          throw new Error('business_id, name, and type are required');
        }
        result = await createRoom(
          telegram_id,
          business_id,
          name,
          type,
          initial_members || [],
          metadata
        );
        break;

      case 'add_member':
        const { room_id: add_room_id, new_member_telegram_id } = body;
        if (!add_room_id || !new_member_telegram_id) {
          throw new Error('room_id and new_member_telegram_id are required');
        }
        result = await addMember(telegram_id, add_room_id, new_member_telegram_id);
        break;

      case 'remove_member':
        const { room_id: remove_room_id, member_telegram_id } = body;
        if (!remove_room_id || !member_telegram_id) {
          throw new Error('room_id and member_telegram_id are required');
        }
        result = await removeMember(telegram_id, remove_room_id, member_telegram_id);
        break;

      case 'update':
        const { room_id: update_room_id, updates } = body;
        if (!update_room_id || !updates) {
          throw new Error('room_id and updates are required');
        }
        result = await updateRoom(telegram_id, update_room_id, updates);
        break;

      default:
        throw new Error('Invalid operation. Use: create, add_member, remove_member, update');
    }

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Room operation error:', err);
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
