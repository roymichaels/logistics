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

    // Find or create auth user
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
      console.log('✅ Auth user found, updating metadata and password...');
      // ALWAYS update password for existing users to prevent credential mismatch
      const { error: updateErr } = await supabase.auth.admin.updateUserById(authUser.id, {
        password: password,
        user_metadata: {
          telegram_id: user.id,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          photo_url: user.photo_url,
        },
      });

      if (updateErr) {
        console.error('❌ Failed to update user:', updateErr);
        throw updateErr;
      }
      console.log('✅ User metadata and password updated');
    }

    // Retry sign-in up to 3 times to handle replication lag
    console.log('🎫 Generating session tokens...');
    let sessionData = null;
    let lastError = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`🔄 Sign-in attempt ${attempt}/3...`);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data?.session) {
        sessionData = data;
        console.log(`✅ Sign-in successful on attempt ${attempt}`);
        break;
      }

      lastError = error;
      console.warn(`⚠️ Attempt ${attempt} failed:`, error?.message);

      // Wait with exponential backoff before retrying
      if (attempt < 3) {
        const delay = 400 * attempt; // 400ms, 800ms
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    if (!sessionData?.session) {
      console.error('❌ All sign-in attempts failed:', lastError);
      throw lastError || new Error('Failed to create session after 3 attempts');
    }

    console.log('✅ Session created successfully');

    const fullName = `${user.first_name || ''}${user.last_name ? ' ' + user.last_name : ''}`.trim();

    // Insert/update user in users table with required role field
    console.log('💾 Upserting user to users table...');
    const { error: upsertErr } = await supabase
      .from('users')
      .upsert({
        telegram_id: user.id.toString(),
        username: user.username?.replace(/^@/, '').toLowerCase() || null,
        name: fullName,
        first_name: user.first_name || null,
        last_name: user.last_name || null,
        photo_url: user.photo_url || null,
        role: 'user', // Set default role for new users
      }, {
        onConflict: 'telegram_id',
        ignoreDuplicates: false, // Update existing users
      });

    if (upsertErr) {
      console.error('❌ User upsert failed:', upsertErr);
      // Don't throw here - we have a valid session, just log the error
      console.warn('⚠️ Continuing despite upsert error - session is valid');
    } else {
      console.log('✅ User record updated in users table');
    }

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