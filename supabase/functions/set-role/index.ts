import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const ALLOWED_ROLES = new Set([
  'user',
  'owner',
  'infrastructure_owner',
  'business_owner',
  'manager',
  'dispatcher',
  'driver',
  'warehouse',
  'sales',
  'customer_service'
]);

const ALLOWED_TO_UPDATE_ROLES = new Set(['owner', 'business_owner', 'manager', 'infrastructure_owner']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.slice(7);

    let callerClaims: any = {};
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = parts[1];
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        callerClaims = JSON.parse(decoded);
      }
    } catch (e) {
      console.error('Failed to decode JWT:', e);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get caller's role from database (more reliable than JWT claims)
    const callerId = callerClaims?.sub;
    if (!callerId) {
      return new Response(JSON.stringify({ error: 'Invalid token - missing user ID' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: callerUser, error: callerError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', callerId)
      .maybeSingle();

    if (callerError || !callerUser) {
      console.error('Failed to fetch caller user:', callerError);
      return new Response(JSON.stringify({ error: 'Could not verify user permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const callerRole = callerUser.role;

    console.log('Caller info:', {
      id: callerId,
      role: callerRole
    });

    if (!callerRole || !ALLOWED_TO_UPDATE_ROLES.has(callerRole)) {
      return new Response(JSON.stringify({ error: 'Forbidden - insufficient role' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { user_id, telegram_id, new_role } = await req.json();

    if ((!user_id && !telegram_id) || !ALLOWED_ROLES.has(new_role)) {
      return new Response(JSON.stringify({ error: 'Bad request - invalid user_id/telegram_id or role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Updating user role:', { user_id, telegram_id, new_role, updated_by: callerRole });

    // Build query based on what identifier is provided
    let query = supabaseAdmin.from('users').update({ role: new_role });

    if (user_id) {
      query = query.eq('id', user_id);
    } else {
      query = query.eq('telegram_id', telegram_id);
    }

    const { data, error } = await query.select().single();

    if (error) {
      console.error('Update failed:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!data) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Update successful:', data);

    // Also update user_registrations table if it exists
    try {
      await supabaseAdmin
        .from('user_registrations')
        .update({ assigned_role: new_role })
        .eq('telegram_id', data.telegram_id);
      console.log('Updated user_registrations table as well');
    } catch (registrationError) {
      console.warn('Could not update user_registrations:', registrationError);
    }

    return new Response(
      JSON.stringify({ ok: true, user: data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Exception:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
