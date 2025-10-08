import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { action, password, telegram_id, username } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // SET PASSWORD - First user to set password becomes owner
    if (action === 'set') {
      if (!password || password.length < 6) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Password must be at least 6 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if password already set
      const { data: config } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'superadmin_password_hash')
        .single();

      if (config && config.value && config.value !== '') {
        return new Response(
          JSON.stringify({ ok: false, error: 'Superadmin password already set' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Hash and store password
      const passwordHash = await hashPassword(password);
      
      const { error: updateError } = await supabase
        .from('system_config')
        .upsert({ 
          key: 'superadmin_password_hash', 
          value: passwordHash,
          updated_by: telegram_id || username || 'system'
        });

      if (updateError) {
        console.error('Failed to set password:', updateError);
        throw updateError;
      }

      // Promote user to owner
      if (telegram_id) {
        const { error: roleError } = await supabase
          .from('users')
          .update({ role: 'owner' })
          .eq('telegram_id', telegram_id);

        if (roleError) {
          console.error('Failed to promote user:', roleError);
        }
      }

      return new Response(
        JSON.stringify({ 
          ok: true, 
          message: 'Superadmin password set successfully. You are now an owner.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // VERIFY PASSWORD - Promote user to owner if password matches
    if (action === 'verify') {
      if (!password || !telegram_id) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Password and telegram_id required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get stored password hash
      const { data: config } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'superadmin_password_hash')
        .single();

      if (!config || !config.value || config.value === '') {
        return new Response(
          JSON.stringify({ ok: false, error: 'Superadmin password not set yet' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify password
      const passwordHash = await hashPassword(password);
      
      if (passwordHash !== config.value) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid password' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Promote user to owner
      const { error: roleError } = await supabase
        .from('users')
        .update({ role: 'owner' })
        .eq('telegram_id', telegram_id);

      if (roleError) {
        console.error('Failed to promote user:', roleError);
        throw roleError;
      }

      return new Response(
        JSON.stringify({ 
          ok: true, 
          message: 'Password verified. You are now an owner.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CHECK STATUS - See if password is set
    if (action === 'status') {
      const { data: config } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'superadmin_password_hash')
        .single();

      const isSet = !!(config && config.value && config.value !== '');

      return new Response(
        JSON.stringify({ ok: true, passwordSet: isSet }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ok: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Superadmin auth error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});