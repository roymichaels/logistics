import { createClient } from 'npm:@supabase/supabase-js@2';
import { createHmac } from 'node:crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function verifyTelegramInitData(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');

  if (!hash) return false;

  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calcHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  return calcHash === hash;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { type, initData } = await req.json();

    if (!initData) {
      throw new Error('Missing initData');
    }

    const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    if (!verifyTelegramInitData(initData, BOT_TOKEN)) {
      throw new Error('Invalid Telegram signature');
    }

    const params = new URLSearchParams(initData);
    const userParam = params.get('user');

    if (!userParam) {
      throw new Error('Missing Telegram user payload');
    }

    const user = JSON.parse(userParam);

    if (!user?.id) {
      throw new Error('Missing Telegram user ID');
    }

    console.log('✅ Telegram user verified:', user.username || user.id);

    const password = `twa_${user.id}_${BOT_TOKEN.slice(0, 8)}`;
    const email = `telegram_${user.id}@twa.local`;

    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let authUser = existingUsers?.users?.find((u) => u.email === email);

    if (!authUser) {
      console.log('➕ Creating new auth user...');
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          telegram_id: user.id,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          photo_url: user.photo_url,
        },
      });

      if (error) throw error;
      authUser = data.user;
      console.log('✅ Auth user created');
    } else {
      console.log('✅ Auth user found, updating metadata...');
      await supabase.auth.admin.updateUserById(authUser.id, {
        user_metadata: {
          telegram_id: user.id,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          photo_url: user.photo_url,
        },
      });
    }

    console.log('🎫 Generating session tokens...');
    const { data: sessionData, error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInErr) {
      console.error('❌ Sign in failed:', signInErr);
      throw signInErr;
    }

    if (!sessionData?.session) {
      throw new Error('No session returned from signInWithPassword');
    }

    console.log('✅ Session created successfully');

    const fullName = `${user.first_name || ''}${user.last_name ? ' ' + user.last_name : ''}`.trim();

    await supabase
      .from('users')
      .upsert({
        telegram_id: user.id.toString(),
        username: user.username?.replace(/^@/, '').toLowerCase() || null,
        name: fullName,
        photo_url: user.photo_url,
      }, {
        onConflict: 'telegram_id'
      });

    return new Response(
      JSON.stringify({
        ok: true,
        user: {
          id: authUser.id,
          telegram_id: user.id,
          username: user.username,
          name: fullName,
          photo_url: user.photo_url,
        },
        session: {
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
          expires_in: sessionData.session.expires_in || 3600,
          expires_at: sessionData.session.expires_at,
          token_type: 'bearer',
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (err: any) {
    console.error('💥 telegram-verify error:', err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: err.message || 'Internal Server Error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});