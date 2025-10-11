import { createClient } from 'npm:@supabase/supabase-js@2';
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { corsHeaders } from '../_shared/cors.ts';

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

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const telegramId = user.id.toString();
    const username = normalizeUsername(user.username);
    const fullName = `${user.first_name || ''}${user.last_name ? ' ' + user.last_name : ''}`;
    const defaultRole = 'user';

    // Find or create user in custom users table
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

    // Determine workspace context (primary business if exists)
    let workspaceId: string | null = null;
    const { data: memberships } = await supabase
      .from('business_users')
      .select('business_id, is_primary')
      .eq('user_id', userId)
      .eq('active', true)
      .order('is_primary', { ascending: false });

    if (memberships && memberships.length > 0) {
      workspaceId = memberships[0].business_id;
    }

    // Create or update auth.users with Supabase Auth Admin API
    const email = `telegram_${telegramId}@telegram-auth.local`;
    const password = crypto.randomUUID();

    let authUser;
    const { data: existingAuthUser } = await supabase.auth.admin.listUsers();
    const foundAuthUser = existingAuthUser?.users?.find(u => u.email === email);

    if (foundAuthUser) {
      // Update existing auth user metadata
      const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        foundAuthUser.id,
        {
          user_metadata: {
            telegram_id: telegramId,
            username,
            name: fullName,
            photo_url: user.photo_url,
          },
          app_metadata: {
            provider: 'telegram',
            role: userRole,
            workspace_id: workspaceId,
            user_id: userId,
            telegram_id: telegramId,
            user_role: userRole,
          },
        }
      );
      if (updateError) throw updateError;
      authUser = updatedUser.user;
    } else {
      // Create new auth user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          telegram_id: telegramId,
          username,
          name: fullName,
          photo_url: user.photo_url,
        },
        app_metadata: {
          provider: 'telegram',
          role: userRole,
          workspace_id: workspaceId,
          user_id: userId,
          telegram_id: telegramId,
          user_role: userRole,
        },
      });
      if (createError) throw createError;
      authUser = newUser.user;
    }

    // Generate session token using Supabase Auth API
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.createSession({
      user_id: authUser.id,
    });

    if (sessionError || !sessionData) {
      throw new Error('Failed to create session: ' + sessionError?.message);
    }

    console.log('✅ Session created for user:', userId);

    // Build claims object for backwards compatibility
    const claims = {
      user_id: userId,
      telegram_id: telegramId,
      user_role: userRole,
      role: userRole,
      workspace_id: workspaceId,
      app_metadata: {
        provider: 'telegram',
        role: userRole,
        workspace_id: workspaceId,
      },
    };

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
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
          expires_in: sessionData.expires_in || 3600,
          token_type: 'bearer',
        },
        claims,
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
