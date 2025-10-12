import { createClient } from 'npm:@supabase/supabase-js@2';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

let envLoaded = false;
try {
  const { load } = await import("https://deno.land/std@0.224.0/dotenv/mod.ts");
  const env = await load({ export: true });
  if (Object.keys(env).length > 0) {
    envLoaded = true;
    console.log("✅ Local .env loaded");
  }
} catch {
  console.log("ℹ️ Using Supabase environment variables");
}

function verifyTelegramWebApp(initData: string, botToken: string): boolean {
  console.log('🔐 Starting HMAC verification...');
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');

    if (!hash) {
      console.error('❌ No hash found in initData');
      return false;
    }

    params.delete('hash');

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computed = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    const isValid = timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(hash, 'hex'));
    console.log(isValid ? '✅ HMAC verification passed' : '❌ HMAC verification failed');

    return isValid;
  } catch (err) {
    console.error('💥 HMAC verification exception:', err);
    return false;
  }
}

function parseWebAppInitData(initData: string) {
  try {
    const params = new URLSearchParams(initData);
    const userParam = params.get('user');

    if (!userParam) {
      console.error('❌ No user parameter in initData');
      return null;
    }

    const user = JSON.parse(userParam);
    const authDate = parseInt(params.get('auth_date') || '0');

    const now = Math.floor(Date.now() / 1000);
    const age = now - authDate;

    if (age > 86400) {
      console.warn(`⚠️ InitData is ${Math.floor(age / 3600)} hours old (>24h)`);
    }

    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      photo_url: user.photo_url,
      auth_date: authDate,
    };
  } catch (err) {
    console.error('❌ Failed to parse initData:', err);
    return null;
  }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { type, initData } = await req.json();
    console.log('📲 Telegram verification request:', { type, hasInitData: !!initData });

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')?.trim();
    if (!botToken) {
      console.error('❌ TELEGRAM_BOT_TOKEN not configured');
      return new Response(
        JSON.stringify({ ok: false, error: 'Bot token not configured on server' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔑 Bot token loaded (length:', botToken.length, ')');

    if (type !== 'webapp' || !initData) {
      console.error('❌ Invalid request:', { type, hasInitData: !!initData });
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid request format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isValid = verifyTelegramWebApp(initData, botToken);

    if (!isValid) {
      console.warn('❌ Telegram signature verification failed');
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid Telegram signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = parseWebAppInitData(initData);
    if (!user) {
      console.error('❌ Failed to parse user data');
      return new Response(
        JSON.stringify({ ok: false, error: 'Failed to parse user data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Telegram user verified:', user.username || user.id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase configuration missing');
      return new Response(
        JSON.stringify({ ok: false, error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const telegramId = user.id.toString();
    const username = user.username?.replace(/^@/, '').toLowerCase() || null;
    const fullName = `${user.first_name || ''}${user.last_name ? ' ' + user.last_name : ''}`.trim();

    console.log('🔍 Looking up user in database...');
    let { data: existingUser } = await supabase
      .from('users')
      .select('id, telegram_id, role')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    let userId: string;
    let userRole: string;

    if (existingUser) {
      console.log('✅ User found:', existingUser.id);
      userId = existingUser.id;
      userRole = existingUser.role || 'user';

      await supabase
        .from('users')
        .update({
          username,
          name: fullName,
          photo_url: user.photo_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    } else {
      console.log('➕ Creating new user...');
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          telegram_id: telegramId,
          username,
          name: fullName,
          role: 'user',
          photo_url: user.photo_url,
        })
        .select('id, role')
        .single();

      if (createError) {
        console.error('❌ Failed to create user:', createError);
        throw createError;
      }

      userId = newUser.id;
      userRole = newUser.role || 'user';
      console.log('✅ New user created:', userId);
    }

    const email = `telegram_${telegramId}@twa.local`;

    console.log('🔍 Looking up auth user...');
    const { data: existingAuthUsers } = await supabase.auth.admin.listUsers();
    const authUser = existingAuthUsers?.users?.find(u => u.email === email);

    let authUserId: string;

    if (authUser) {
      console.log('✅ Auth user found, updating metadata...');
      const { data: updatedAuth, error: updateError } = await supabase.auth.admin.updateUserById(
        authUser.id,
        {
          user_metadata: {
            telegram_id: telegramId,
            username,
            name: fullName,
            photo_url: user.photo_url,
          },
          app_metadata: {
            provider: 'telegram',
            user_id: userId,
            telegram_id: telegramId,
            role: userRole,
          },
        }
      );

      if (updateError) {
        console.error('❌ Failed to update auth user:', updateError);
        throw updateError;
      }
      authUserId = updatedAuth.user.id;
      console.log('✅ Auth user metadata updated');
    } else {
      console.log('➕ Creating auth user...');
      const { data: newAuth, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: crypto.randomUUID(),
        email_confirm: true,
        user_metadata: {
          telegram_id: telegramId,
          username,
          name: fullName,
          photo_url: user.photo_url,
        },
        app_metadata: {
          provider: 'telegram',
          user_id: userId,
          telegram_id: telegramId,
          role: userRole,
        },
      });

      if (createError) {
        console.error('❌ Failed to create auth user:', createError);
        throw createError;
      }
      authUserId = newAuth.user!.id;
      console.log('✅ Auth user created:', authUserId);
    }

    console.log('🎫 Creating session using admin API...');

    const { data: sessionData, error: sessionError } = await supabase.auth.admin.createSession({
      user_id: authUserId,
    });

    if (sessionError || !sessionData?.session) {
      console.error('❌ Session creation failed:', sessionError);
      throw new Error(`Failed to create session: ${sessionError?.message || 'No session returned'}`);
    }

    console.log('✅ Session created successfully');

    if (!sessionData.session.access_token || !sessionData.session.refresh_token) {
      console.error('❌ Session missing tokens:', sessionData.session);
      throw new Error('Session created but tokens are missing');
    }

    console.log('✅ Session tokens validated successfully');

    return new Response(
      JSON.stringify({
        ok: true,
        user: {
          id: userId,
          telegram_id: telegramId,
          username,
          name: fullName,
          role: userRole,
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('💥 Authentication error:', err);

    let errorMessage = 'Internal server error';
    let statusCode = 500;

    if (err instanceof Error) {
      errorMessage = err.message;

      if (errorMessage.includes('Failed to create session')) {
        statusCode = 500;
        errorMessage = 'שגיאה ביצירת הפעלה / Failed to create session. Please try again.';
      } else if (errorMessage.includes('Failed to create user')) {
        statusCode = 500;
        errorMessage = 'שגיאה ביצירת משתמש / Failed to create user. Please try again.';
      } else if (errorMessage.includes('Failed to update auth user')) {
        statusCode = 500;
        errorMessage = 'שגיאה בעדכון משתמש / Failed to update user. Please try again.';
      } else if (errorMessage.includes('Failed to create auth user')) {
        statusCode = 500;
        errorMessage = 'שגיאה ביצירת חשבון / Failed to create account. Please try again.';
      }
    }

    return new Response(
      JSON.stringify({
        ok: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
        details: err instanceof Error ? err.message : 'Unknown error'
      }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});