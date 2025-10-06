import { createClient } from 'npm:@supabase/supabase-js@2';
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { SignJWT } from 'npm:jose@5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface VerifyRequest {
  type: 'loginWidget' | 'webapp';
  data?: Record<string, string>;
  initData?: string;
}

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
}

function normalizeUsername(username: string | null | undefined): string | null {
  if (!username) return null;
  return username.replace(/^@/, '').toLowerCase().trim();
}

function verifyTelegramWebApp(initData: string, botToken: string): boolean {
  console.log('🔐 verifyTelegramWebApp: Starting HMAC verification');

  try {
    // Clean possible wrappers (Telegram sometimes sends full URL fragment)
    let cleanedInitData = initData;
    if (initData.startsWith('tgWebAppData=')) {
      console.log('🧹 Cleaning tgWebAppData wrapper');
      cleanedInitData = decodeURIComponent(initData.replace('tgWebAppData=', '').split('#')[0]);
    }

    const params = new URLSearchParams(cleanedInitData);
    const hash = params.get('hash');

    if (!hash) {
      console.error('❌ No hash found in initData');
      console.error('initData preview:', cleanedInitData.substring(0, 100));
      return false;
    }

    console.log('✅ Hash from Telegram:', hash.substring(0, 10) + '...');

    params.delete('hash');
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    console.log('📝 dataCheckString length:', dataCheckString.length);
    console.log('📝 dataCheckString keys:', [...params.keys()].join(', '));

    // CRITICAL: Use correct Telegram Mini App algorithm
    // Reference: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
    console.log('🔑 Creating secret key with WebAppData constant');
    const secretKey = createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    console.log('🔐 Computing HMAC-SHA256 of data-check-string');
    const computedHash = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    console.log('🔐 Computed hash:', computedHash.substring(0, 16) + '...');
    console.log('🔐 Expected hash:', hash.substring(0, 16) + '...');
    console.log('🔐 Hash lengths:', { computed: computedHash.length, expected: hash.length });

    const isValid = timingSafeEqual(
      Buffer.from(computedHash, 'hex'),
      Buffer.from(hash, 'hex')
    );

    console.log('✅ Match:', isValid);

    if (!isValid) {
      console.error('❌ HMAC verification FAILED');
      console.error('Possible causes:');
      console.error('1. Wrong TELEGRAM_BOT_TOKEN (not matching the bot that launched the Mini App)');
      console.error('2. Bot token has extra spaces, newlines, or hidden characters');
      console.error('3. Multiple bots - using token from wrong bot');
    } else {
      console.log('✅ HMAC verification SUCCEEDED');
    }

    return isValid;
  } catch (error) {
    console.error('💥 Exception during verification:', error);
    return false;
  }
}

function verifyLoginWidget(data: Record<string, string>, botToken: string): boolean {
  const { hash, ...fields } = data;

  if (!hash) return false;

  const checkString = Object.keys(fields)
    .sort()
    .map(k => `${k}=${fields[k]}`)
    .join('\n');

  const secretKey = createHash('sha256')
    .update(botToken)
    .digest();

  const computedHash = createHmac('sha256', secretKey)
    .update(checkString)
    .digest('hex');

  return timingSafeEqual(
    Buffer.from(computedHash, 'hex'),
    Buffer.from(hash, 'hex')
  );
}

function parseWebAppInitData(initData: string): TelegramUser | null {
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
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const { type, data, initData }: VerifyRequest = await req.json();
    console.log('📱 Telegram verify request:', { type, hasData: !!data, hasInitData: !!initData });

    let botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      console.error('❌ TELEGRAM_BOT_TOKEN environment variable not set');
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'TELEGRAM_BOT_TOKEN not configured on server'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    botToken = botToken.trim();

    if (botToken.includes(' ') || botToken.includes('\n') || botToken.includes('\r')) {
      console.warn('⚠️ WARNING: Bot token contains whitespace characters! Trimming...');
      botToken = botToken.replace(/[\s\n\r]/g, '');
    }

    if (botToken.length < 40) {
      console.warn('⚠️ WARNING: Bot token seems too short. Expected ~45 characters.');
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Bot token appears invalid (too short)'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let isValid = false;
    let user: TelegramUser | null = null;

    if (type === 'loginWidget' && data) {
      isValid = verifyLoginWidget(data, botToken);
      if (isValid) {
        user = {
          id: parseInt(data.id || '0'),
          first_name: data.first_name || '',
          last_name: data.last_name,
          username: data.username,
          photo_url: data.photo_url,
          auth_date: parseInt(data.auth_date || '0')
        };
      }
    } else if (type === 'webapp' && initData) {
      isValid = verifyTelegramWebApp(initData, botToken);
      if (isValid) {
        user = parseWebAppInitData(initData);
      }
    }

    if (!isValid || !user) {
      console.log('❌ Telegram verification failed');
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Invalid signature',
          will_use_fallback: true
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Telegram verification succeeded for user:', user.id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const telegramIdStr = user.id.toString();
    const usernameNormalized = normalizeUsername(user.username);
    const fullName = user.first_name + (user.last_name ? ` ${user.last_name}` : '');

    const APP_OWNER_TELEGRAM_ID = Deno.env.get('APP_OWNER_TELEGRAM_ID');
    const isPlatformOwner = APP_OWNER_TELEGRAM_ID && telegramIdStr === APP_OWNER_TELEGRAM_ID;
    const defaultRole = isPlatformOwner ? 'owner' : 'manager';

    // Find or create user in users table
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

      if (userByUsername) {
        existingUser = userByUsername;
        console.log(`🔄 Found user by username, updating telegram_id from ${userByUsername.telegram_id} to ${telegramIdStr}`);
      }
    }

    let userId: string;
    let userRole: string = defaultRole;

    if (existingUser) {
      userId = existingUser.id;
      userRole = existingUser.role;
      console.log(`✅ User exists: ${usernameNormalized} (role: ${userRole})`);

      if (existingUser.telegram_id !== telegramIdStr) {
        await supabase
          .from('users')
          .update({ telegram_id: telegramIdStr })
          .eq('id', userId);
      }

      if (isPlatformOwner && userRole !== 'owner') {
        await supabase
          .from('users')
          .update({ role: 'owner' })
          .eq('id', userId);
        userRole = 'owner';
        console.log(`👑 Auto-promoted user to owner: ${telegramIdStr}`);
      }
    } else {
      const { data: newUser, error: insertError } = await supabase
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

      if (insertError || !newUser) {
        console.error('Failed to create user in users table:', insertError);
        throw new Error('Failed to create user');
      }

      userId = newUser.id;
      userRole = defaultRole;
      console.log(`✅ Created user: ${usernameNormalized} (role: ${userRole})`);
    }

    // Get complete user data
    const { data: completeUser } = await supabase
      .from('users')
      .select('id, telegram_id, username, name, role, photo_url')
      .eq('id', userId)
      .single();

    const finalUserRole = completeUser?.role || userRole;

    // Get business associations for workspace_id
    const { data: businessAssociations } = await supabase
      .from('business_users')
      .select('business_id, role, is_primary')
      .eq('user_id', userId)
      .eq('active', true)
      .order('is_primary', { ascending: false })
      .limit(1);

    let workspaceId = null;
    let businessRole = finalUserRole;

    if (businessAssociations && businessAssociations.length > 0) {
      workspaceId = businessAssociations[0].business_id;
      businessRole = businessAssociations[0].role;
      console.log(`User has business association: workspace=${workspaceId}, business_role=${businessRole}`);
    }

    // Generate custom JWT with claims
    console.log('🔐 Generating custom JWT with claims');

    const jwtSecretKey = new TextEncoder().encode(jwtSecret);
    const now = Math.floor(Date.now() / 1000);

    const payload = {
      aud: 'authenticated',
      exp: now + (7 * 24 * 60 * 60), // 7 days
      iat: now,
      iss: supabaseUrl,
      sub: userId,
      email: `${telegramIdStr}@telegram.auth`,
      phone: '',
      app_metadata: {
        provider: 'telegram',
        providers: ['telegram']
      },
      user_metadata: {
        telegram_id: telegramIdStr,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        photo_url: user.photo_url
      },
      role: 'authenticated',
      aal: 'aal1',
      amr: [{ method: 'telegram', timestamp: now }],
      session_id: crypto.randomUUID(),
      // Custom claims for RLS and frontend
      user_id: userId,
      telegram_id: telegramIdStr,
      user_role: finalUserRole,
      app_role: businessRole,
      workspace_id: workspaceId
    };

    const access_token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .sign(jwtSecretKey);

    console.log('✅ Custom JWT generated with claims:', {
      user_id: userId,
      telegram_id: telegramIdStr,
      user_role: finalUserRole,
      app_role: businessRole,
      workspace_id: workspaceId
    });

    return new Response(
      JSON.stringify({
        ok: true,
        valid: true,
        user: {
          id: userId,
          telegram_id: telegramIdStr,
          username: usernameNormalized,
          name: fullName,
          role: finalUserRole,
          photo_url: user.photo_url,
          first_name: user.first_name,
          last_name: user.last_name,
          workspace_id: workspaceId,
          app_role: businessRole
        },
        session: {
          access_token,
          refresh_token: '', // No refresh for now - client can re-verify with Telegram
          expires_in: 604800, // 7 days
          expires_at: now + 604800,
          token_type: 'bearer',
          user: {
            id: userId,
            aud: 'authenticated',
            role: 'authenticated',
            email: `${telegramIdStr}@telegram.auth`,
            app_metadata: payload.app_metadata,
            user_metadata: payload.user_metadata,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        },
        claims: {
          user_id: userId,
          telegram_id: telegramIdStr,
          role: finalUserRole,
          app_role: businessRole,
          workspace_id: workspaceId
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
