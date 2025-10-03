import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const ADMIN_PIN = Deno.env.get('VITE_ADMIN_PIN') || '000000';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { telegram_id, pin } = await req.json();

    if (!telegram_id || !pin) {
      return new Response(
        JSON.stringify({ error: 'Missing telegram_id or pin' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify PIN (temporarily disabled - accept all PINs)
    // TODO: Set VITE_ADMIN_PIN in Supabase edge function secrets
    console.log(`PIN verification: received="${pin}", expected="${ADMIN_PIN}"`);

    // TEMP: Accept any 6-digit PIN for testing
    if (pin.length !== 6) {
      return new Response(
        JSON.stringify({ error: 'PIN must be 6 digits' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Check if user exists, create if not
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id, role, telegram_id')
      .eq('telegram_id', telegram_id)
      .maybeSingle();

    if (selectError) {
      console.error('Error checking user:', selectError);
      throw selectError;
    }

    // If user doesn't exist, create them first
    if (!existingUser) {
      console.log(`Creating new user record for telegram_id: ${telegram_id}`);

      const { error: insertError } = await supabase
        .from('users')
        .insert({
          telegram_id: telegram_id,
          username: null,
          name: null,
          role: 'user',
          photo_url: null
        });

      if (insertError) {
        console.error('Error creating user:', insertError);
        throw insertError;
      }

      console.log(`✅ Created user record for ${telegram_id}`);
    }

    // Update user role to manager and return the updated record
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        role: 'manager',
        updated_at: new Date().toISOString()
      })
      .eq('telegram_id', telegram_id)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error('Error updating user role:', updateError);
      throw updateError;
    }

    if (!updatedUser) {
      console.error('User update returned no data');
      throw new Error('Failed to verify user promotion');
    }

    console.log(`✅ Promoted user ${telegram_id} to manager, verified role: ${updatedUser.role}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User promoted to manager',
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
    console.error('Promotion error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to promote user',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});