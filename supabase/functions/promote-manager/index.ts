import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('🔐 Promote-manager function called');
    console.log('Method:', req.method);

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let body;
    try {
      body = await req.json();
      console.log('Request body:', JSON.stringify(body));
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { telegram_id, pin, target_role } = body;
    console.log(`telegram_id: ${telegram_id}, pin_length: ${pin?.length}, target_role: ${target_role}`);

    if (!telegram_id || !pin) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing telegram_id or pin' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validRoles = ['user', 'infrastructure_owner', 'business_owner', 'manager', 'dispatcher', 'driver', 'warehouse', 'sales', 'customer_service'];
    if (target_role && !validRoles.includes(target_role)) {
      console.error('Invalid role specified:', target_role);
      return new Response(
        JSON.stringify({
          error: 'Invalid role',
          details: `Role must be one of: ${validRoles.join(', ')}`,
          provided: target_role
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (pin.length !== 6) {
      console.error('Invalid PIN length');
      return new Response(
        JSON.stringify({ error: 'PIN must be 6 digits' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log(`Supabase URL present: ${!!supabaseUrl}`);
    console.log(`Service key present: ${!!supabaseServiceKey}`);

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials');
      return new Response(
        JSON.stringify({ 
          error: 'Supabase credentials not configured',
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseServiceKey
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    console.log('Supabase client created');

    console.log('Checking if user exists...');
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id, role, telegram_id')
      .eq('telegram_id', telegram_id)
      .maybeSingle();

    if (selectError) {
      console.error('Error checking user:', selectError);
      return new Response(
        JSON.stringify({ 
          error: 'Database error checking user',
          details: selectError.message,
          code: selectError.code
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Existing user:', existingUser ? 'found' : 'not found');

    if (!existingUser) {
      console.log('Creating new user record...');
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          telegram_id: telegram_id,
          username: null,
          name: null,
          role: 'manager',
          photo_url: null
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating user:', insertError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create user',
            details: insertError.message,
            code: insertError.code
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('User created:', newUser.id);
    }

    const finalRole = target_role || 'infrastructure_owner';
    console.log(`Updating user to role: ${finalRole}`);

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        role: finalRole,
        updated_at: new Date().toISOString()
      })
      .eq('telegram_id', telegram_id)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error('Error updating user role:', updateError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update user role',
          details: updateError.message,
          code: updateError.code
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!updatedUser) {
      console.error('User update returned no data');
      return new Response(
        JSON.stringify({ error: 'Failed to verify user promotion' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User promoted successfully to ${finalRole}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `User promoted to ${finalRole}`,
        role: updatedUser.role,
        user: {
          telegram_id: updatedUser.telegram_id,
          role: updatedUser.role,
          updated_at: updatedUser.updated_at
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
        type: error?.constructor?.name
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});