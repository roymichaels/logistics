import { createClient } from 'npm:@supabase/supabase-js@2';
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { SignJWT } from 'npm:jose@5';

/**
 * ✅ Optional local .env loader (for Bolt / non-Supabase CLI)
 * Works both locally and in Supabase Edge runtime.
 */
let envLoaded = false;
try {
  const { load } = await import("https://deno.land/std@0.224.0/dotenv/mod.ts");
  const env = await load({ export: true });
  if (Object.keys(env).length > 0) {
    envLoaded = true;
    console.log("✅ Local .env loaded for Bolt environment");
  }
} catch {
  console.warn("⚠️ No .env file found, relying on Supabase secrets");
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

function normalizeUsername(username?: string) {
  if (!username) return null;
  return username.replace(/^@/, '').toLowerCase().trim();
}

/**
 * ✅ Telegram WebApp HMAC verification
 * Reference: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function verifyTelegramWebApp(initData: string, botToken: string): boolean {
  console.log('🔐 verifyTelegramWebApp: Starting verification');
  try {
    let cleaned = initData;
    if (initData.startsWith('tgWebAppData=')) {
      cleaned = decodeURIComponent(initData.replace('tgWebAppData=', '').split('#')[0]);
    }

    const params = new URLSearchParams(cleaned);
    const hash = params.get('hash');
    if (!hash) {
      console.error('❌ Missing hash in initData');
      return false;
    }
    params.delete('hash');

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    // ✅ Correct Telegram HMAC key derivation
    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computed = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    const isValid = timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(hash, 'hex'));
    console.log('✅ HMAC verified:', isValid);
    return isValid;
  } catch (err) {
    console.error('💥 verifyTelegramWebApp exception:', err);
    return false;
  }
}

function verifyLoginWidget(data: any, botToken: string): boolean {
  const { hash, ...fields } = data;
  if (!hash) return false;
  const checkString = Object.keys(fields)
    .sort()
    .map(k => `${k}=${fields[k]}`)
    .join('\n');
  const secretKey = createHash('sha256').update(botToken).digest();
  const computed = createHmac('sha256', secretKey).update(checkString).digest('hex');
  return timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(hash, 'hex'));
}

function parseWebAppInitData(initData: string) {
  try {
    const params = new URLSearchParams(initData);
    const userParam = params.get('user');
    if (!userParam) return null;
    const user = JSON.parse(userParam);
    const authDate = parseInt(params.get('auth_date') || '0');
    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      photo_url: user.photo_url,
      auth_date: authDate,
    };
  } catch (err) {
    console.error('⚠️ parseWebAppInitData failed:', err);
    return null;
  }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { type, data, initData } = await req.json();
    console.log('📲 Incoming Telegram verification request', { type });

    // ✅ Load token (env fallback)
    let botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')?.trim() ?? '';
    if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN missing or empty');
    console.log('🔑 Token length:', botToken.length, '| Prefix:', botToken.slice(0, 10));

    let valid = false;
    let user = null;

    if (type === 'loginWidget' && data) {
      valid = verifyLoginWidget(data, botToken);
      if (valid) {
        user = {
          id: parseInt(data.id || '0'),
          first_name: data.first_name || '',
          last_name: data.last_name,
          username: data.username,
          photo_url: data.photo_url,
        };
      }
    } else if (type === 'webapp' && initData) {
      valid = verifyTelegramWebApp(initData, botToken);
      if (valid) user = parseWebAppInitData(initData);
    }

    if (!valid || !user) {
      console.warn('❌ Telegram verification failed');
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log('✅ Verified Telegram user:', user.username || user.id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET');
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const telegramId = user.id.toString();
    const username = normalizeUsername(user.username);
    const fullName = `${user.first_name || ''}${user.last_name ? ' ' + user.last_name : ''}`;
    const defaultRole = 'user';

    // Find or create user
    let { data: existing } = await supabase
      .from('users')
      .select('id, telegram_id, role')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    let userId, userRole = defaultRole;
    if (existing) {
      userId = existing.id;
      userRole = existing.role || defaultRole;
    } else {
      const { data: created, error } = await supabase
        .from('users')
        .insert({
          telegram_id: telegramId,
          username,
          name: fullName,
          role: defaultRole,
          photo_url: user.photo_url,
        })
        .select('id')
        .single();
      if (error) throw error;
      userId = created.id;
    }

    // Generate JWT
    const jwtKey = new TextEncoder().encode(jwtSecret);
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      aud: 'authenticated',
      exp: now + 7 * 24 * 60 * 60,
      iat: now,
      iss: supabaseUrl,
      sub: userId,
      telegram_id: telegramId,
      role: userRole,
    };

    const access_token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .sign(jwtKey);

    console.log('✅ JWT issued for user:', userId);

    return new Response(
      JSON.stringify({
        ok: true,
        valid: true,
        user: {
          id: userId,
          telegram_id: telegramId,
          username,
          name: fullName,
          role: userRole,
          photo_url: user.photo_url,
        },
        session: {
          access_token,
          expires_in: 604800,
          token_type: 'bearer',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('💥 Telegram verification error:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
