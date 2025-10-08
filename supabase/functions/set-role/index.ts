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

const ALLOWED_TO_UPDATE_ROLES = new Set(['owner', 'business_owner', 'manager']);

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

    // Check for custom claims at root level (from telegram-verify)
    const callerRole = callerClaims?.user_role || callerClaims?.app_metadata?.role;

    console.log('Caller info:', {
      role: callerRole,
      has_custom_claims: !!(callerClaims?.user_role && callerClaims?.telegram_id),
      provider: callerClaims?.app_metadata?.provider
    });

    if (!callerRole || !ALLOWED_TO_UPDATE_ROLES.has(callerRole)) {
      return new Response(JSON.stringify({ error: 'Forbidden - insufficient role' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { user_id, new_role } = await req.json();

    if (!user_id || !ALLOWED_ROLES.has(new_role)) {
      return new Response(JSON.stringify({ error: 'Bad request - invalid user_id or role' }), {
        status: 400,
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

    console.log('Updating user role:', { user_id, new_role, updated_by: callerRole });

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ role: new_role })
      .eq('id', user_id)
      .select()
      .single();

    if (error) {
      console.error('Update failed:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Update successful:', data);

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
