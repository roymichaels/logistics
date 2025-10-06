import { createClient } from 'npm:@supabase/supabase-js@2';
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { SignJWT } from 'npm:jose@5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

function normalizeUsername(username) {
  if (!username) return null;
  return username.replace(/^@/, '').toLowerCase().trim();
}

/**
 * ✅ Correct Telegram WebApp verification algorithm
 * Reference: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function verifyTelegramWebApp(initData, botToken) {
  console.log('🔐 verifyTelegramWebApp: Starting verification');
  try {
    let cleanedInitData = initData;
    if (initData.startsWith('tgWebAppData=')) {
      cleanedInitData = decodeURIComponent(initData.replace('tgWebAppData=', '').split('#')[0]);
    }

    const params = new URLSearchParams(cleanedInitData);
    const hash = params.get('hash');
    if (!hash) {
      console.error('❌ No hash found in initData');
      return false;
    }

    params.delete('hash');
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // ✅ Correct: HMAC_SHA256("WebAppData", bot_token)
    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    const isValid = timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(hash, 'hex'));
    console.log('✅ HMAC match:', isValid);
    return isValid;
  } catch (error) {
    console.error('💥 Exception in verifyTelegramWebApp:', error);
    return false;
  }
}

function verifyLoginWidget(data, botToken) {
  const { hash, ...fields } = data;
  if (!hash) return false;
  const checkString = Object.keys(fields)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join('\n');
  const secretKey = createHash('sha256').update(botToken).digest();
  const computedHash = createHmac('sha256', secretKey).update(checkString).digest('hex');
  return timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(hash, 'hex'));
}

function parseWebAppInitData(initData) {
  try {
    const params = new URLSearchParams(initData);
    const userParam = params.get('user');
    if (!userParam) return null;
    const userData = JSON.parse(userParam);
    const authDate = parseInt(params.get('auth_date') || '0');
    return {
      id: userData.id,
      first_name: userData.first_name,
      last_name: userData.last_name,
      username: userData.username,
      photo_url: userData.photo_url,
      auth_date: authDate
    };
  } catch (error) {
    console.error('Failed to parse WebApp initData:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { type, data, initData } = await req.json();
    console.log('📱 Telegram verify request:', { type, hasData: !!data, hasInitData: !!initData });

    let botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      return new Response(
        JSON.stringify({ valid: false, error: 'TELEGRAM_BOT_TOKEN not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    botToken = botToken.trim().replace(/[\s\n\r]/g, '');
    console.log('🔑 Bot token loaded, length:', botToken.length, 'first 10 chars:', botToken.substring(0, 10));

    let isValid = false;
    let user = null;

    if (type === 'loginWidget' && data) {
      console.log('🔐 Verifying login widget...');
      isValid = verifyLoginWidget(data, botToken);
      if (isValid) {
        user = {
          id: parseInt(data.id || '0'),
          first_name: data.first_name || '',
          last_name: data.last_name,
          username: data.username,
          photo_url: data.photo_url
        };
      }
    } else if (type === 'webapp' && initData) {
      console.log('🔐 Verifying webapp initData, length:', initData.length);
      console.log('🔐 First 100 chars of initData:', initData.substring(0, 100));
      isValid = verifyTelegramWebApp(initData, botToken);
      console.log('✅ Verification result:', isValid);
      if (isValid) user = parseWebAppInitData(initData);
    }

    if (!isValid || !user) {
      console.log('❌ Telegram verification failed');
      return new Response(JSON.stringify({ valid: false, error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Telegram verification succeeded for user:', user.id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET');
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const telegramIdStr = user.id.toString();
    const usernameNormalized = normalizeUsername(user.username);
    const fullName = user.first_name + (user.last_name ? ` ${user.last_name}` : '');
    const defaultRole = 'user';

    // Find or create user
    let { data: existingUser } = await supabase
      .from('users')
      .select('id, telegram_id, username, role')
      .eq('telegram_id', telegramIdStr)
      .maybeSingle();

    if (!existingUser && usernameNormalized) {
      const { data: userByUsername } = await supabase
        .from('users')
        .select('id, telegram_id, username, role')
        .eq('username', usernameNormalized)
        .maybeSingle();
      if (userByUsername) existingUser = userByUsername;
    }

    let userId;
    let userRole = defaultRole;

    if (existingUser) {
      userId = existingUser.id;
      userRole = existingUser.role || defaultRole;
      await supabase.from('users').update({ telegram_id: telegramIdStr }).eq('id', userId);
    } else {
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          telegram_id: telegramIdStr,
          username: usernameNormalized,
          name: fullName,
          role: defaultRole,
          photo_url: user.photo_url
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      userId = newUser.id;
    }

    // Generate JWT with custom claims
    const jwtSecretKey = new TextEncoder().encode(jwtSecret);
    const now = Math.floor(Date.now() / 1000);

    const payload = {
      aud: 'authenticated',
      exp: now + 7 * 24 * 60 * 60,
      iat: now,
      iss: supabaseUrl,
      sub: userId,
      email: `${telegramIdStr}@telegram.auth`,
      role: 'authenticated',
      user_id: userId,
      telegram_id: telegramIdStr,
      user_role: userRole
    };

    const access_token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .sign(jwtSecretKey);

    console.log('✅ Custom JWT generated with claims for user:', userId);

    return new Response(
      JSON.stringify({
        ok: true,
        valid: true,
        user: {
          id: userId,
          telegram_id: telegramIdStr,
          username: usernameNormalized,
          name: fullName,
          role: userRole,
          photo_url: user.photo_url
        },
        session: {
          access_token,
          refresh_token: '',
          expires_in: 604800,
          expires_at: now + 604800,
          token_type: 'bearer'
        },
        claims: {
          user_id: userId,
          telegram_id: telegramIdStr,
          role: userRole
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Telegram verify error:', error);
    return new Response(
      JSON.stringify({ valid: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
