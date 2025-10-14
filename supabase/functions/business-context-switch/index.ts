import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SwitchContextRequest {
  business_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { business_id }: SwitchContextRequest = await req.json();

    if (!business_id) {
      return new Response(
        JSON.stringify({ error: 'business_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has access to this business
    const { data: businessRole, error: roleError } = await supabase
      .from('user_business_roles')
      .select('id, business_id, is_active')
      .eq('user_id', user.id)
      .eq('business_id', business_id)
      .eq('is_active', true)
      .maybeSingle();

    if (roleError || !businessRole) {
      return new Response(
        JSON.stringify({ error: 'You do not have access to this business' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update or create user business context
    const { error: contextError } = await supabase
      .from('user_business_contexts')
      .upsert({
        user_id: user.id,
        active_business_id: business_id,
        last_switched_at: new Date().toISOString(),
        session_metadata: {
          switched_from_ip: req.headers.get('x-forwarded-for'),
          user_agent: req.headers.get('user-agent'),
        },
      }, {
        onConflict: 'user_id',
      });

    if (contextError) {
      throw contextError;
    }

    // Invalidate permission cache for this user
    await supabase
      .from('user_permissions_cache')
      .delete()
      .eq('user_id', user.id);

    // Log the context switch in audit log
    await supabase
      .from('system_audit_log')
      .insert({
        event_type: 'settings_changed',
        actor_id: user.id,
        business_id: business_id,
        action: 'business_context_switched',
        new_state: { business_id },
        severity: 'info',
      });

    // Get business details for response
    const { data: business } = await supabase
      .from('businesses')
      .select('id, name, name_hebrew, business_type')
      .eq('id', business_id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        active_business_id: business_id,
        business: business,
        message: 'Business context switched successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Business context switch error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
