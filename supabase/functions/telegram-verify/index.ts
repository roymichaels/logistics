import { createClient } from 'npm:@supabase/supabase-js@2';

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

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

async function hmacSha256(key: CryptoKey, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyLoginWidget(data: Record<string, string>, botToken: string): Promise<boolean> {
  const { hash, ...fields } = data;

  if (!hash) {
    return false;
  }

  const checkString = Object.keys(fields)
    .sort()
    .map(k => `${k}=${fields[k]}`)
    .join('\n');

  const encoder = new TextEncoder();
  const secretKey = await crypto.subtle.importKey(
    "raw",
    await crypto.subtle.digest("SHA-256", encoder.encode(botToken)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const computedHash = await hmacSha256(secretKey, checkString);
  return computedHash === hash;
}

async function verifyWebApp(initData: string, botToken: string): Promise<boolean> {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) return false;

    urlParams.delete('hash');
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const encoder = new TextEncoder();
    const secretKey = await crypto.subtle.importKey(
      "raw",
      await crypto.subtle.digest("SHA-256", encoder.encode(botToken)),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const computedHash = await hmacSha256(secretKey, dataCheckString);
    return computedHash === hash;
  } catch (error) {
    console.error('WebApp verification error:', error);
    return false;
  }
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
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data, initData }: VerifyRequest = await req.json();
    console.log('Telegram verify request:', { type, hasData: !!data, hasInitData: !!initData });

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    let isValid = false;
    let user: TelegramUser | null = null;

    if (type === 'loginWidget' && data) {
      isValid = await verifyLoginWidget(data, botToken);
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
      isValid = await verifyWebApp(initData, botToken);
      if (isValid) {
        user = parseWebAppInitData(initData);
      }
    }

    if (!isValid || !user) {
      console.log('Telegram verification failed');
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Telegram verification succeeded for user:', user.id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const telegramIdStr = user.id.toString();
    const usernameNormalized = normalizeUsername(user.username);
    const fullName = user.first_name + (user.last_name ? ` ${user.last_name}` : '');

    const FIRST_ADMIN_USERNAME = Deno.env.get('FIRST_ADMIN_USERNAME');
    const firstAdminUsername = normalizeUsername(FIRST_ADMIN_USERNAME);
    const isFirstAdmin = usernameNormalized === firstAdminUsername;

    // Check if user is the platform owner
    const APP_OWNER_TELEGRAM_ID = Deno.env.get('APP_OWNER_TELEGRAM_ID');
    const isPlatformOwner = APP_OWNER_TELEGRAM_ID && telegramIdStr === APP_OWNER_TELEGRAM_ID;

    // Default role for new users is 'manager', but platform owner gets 'owner'
    const defaultRole = isPlatformOwner ? 'owner' : 'manager';

    // First, try to find user by telegram_id (this is the primary identifier)
    let { data: existingUser } = await supabase
      .from('users')
      .select('id, telegram_id, username, role')
      .eq('telegram_id', telegramIdStr)
      .maybeSingle();

    // If not found by telegram_id AND we have a username, try to find by username
    // This handles the case where web login and Mini App use different telegram_ids
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

      // Update telegram_id if it changed (web vs Mini App)
      if (existingUser.telegram_id !== telegramIdStr) {
        await supabase
          .from('users')
          .update({ telegram_id: telegramIdStr })
          .eq('id', userId);
      }

      // Auto-promote to owner if they're the designated platform owner
      if (isPlatformOwner && userRole !== 'owner') {
        await supabase
          .from('users')
          .update({ role: 'owner' })
          .eq('id', userId);
        userRole = 'owner';
        console.log(`👑 Auto-promoted user to owner: ${telegramIdStr}`);
      }
    } else {
      // Create new user in users table
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

    // Create or get Supabase Auth user
    const email = `${telegramIdStr}@telegram.auth`;

    // Check if auth user exists
    const { data: { users: authUsers }, error: listError } = await supabase.auth.admin.listUsers();
    const existingAuthUser = authUsers?.find(u => u.email === email);

    let authUserId: string;

    if (existingAuthUser) {
      authUserId = existingAuthUser.id;
      console.log('Auth user exists:', authUserId);
    } else {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          telegram_id: telegramIdStr,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          photo_url: user.photo_url
        }
      });

      if (authError || !authData.user) {
        console.error('Failed to create auth user:', authError);
        throw new Error('Failed to create auth user');
      }

      authUserId = authData.user.id;
      console.log('Created auth user:', authUserId);
    }

    // Fetch the complete user record to ensure we have the latest role
    const { data: completeUser, error: fetchError } = await supabase
      .from('users')
      .select('id, telegram_id, username, name, role, photo_url, department, phone')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('Failed to fetch complete user:', fetchError);
    }

    const finalUserRole = completeUser?.role || userRole;
    console.log(`Final user role being returned: ${finalUserRole}`);

    // Fetch user's business associations to determine workspace_id
    const { data: businessAssociations, error: businessError } = await supabase
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
    } else {
      console.log('No business associations found - user may be infrastructure_owner or needs business assignment');
    }

    // CRITICAL: Update auth user with password AND metadata in ONE operation
    // This ensures JWT claims are present when we sign in
    const { error: updateUserError } = await supabase.auth.admin.updateUserById(
      authUserId,
      {
        password: telegramIdStr,
        email_confirm: true,
        app_metadata: {
          telegram_id: telegramIdStr,
          user_id: userId,
          role: finalUserRole,
          app_role: businessRole,
          workspace_id: workspaceId,
          updated_at: new Date().toISOString()
        },
        user_metadata: {
          telegram_id: telegramIdStr,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          photo_url: user.photo_url
        }
      }
    );

    if (updateUserError) {
      console.error('Failed to update auth user:', updateUserError);
      throw new Error('Failed to update user authentication');
    }

    console.log('Auth user updated with password and JWT claims:', {
      user_id: userId,
      role: finalUserRole,
      app_role: businessRole,
      workspace_id: workspaceId
    });

    // Create a regular (non-admin) supabase client to sign in as the user
    const userSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Sign in as the user to get valid session tokens
    const { data: signInData, error: signInError } = await userSupabase.auth.signInWithPassword({
      email,
      password: telegramIdStr
    });

    if (signInError || !signInData?.session) {
      console.error('Failed to create user session:', signInError);
      throw new Error('Failed to create session: ' + (signInError?.message || 'Unknown error'));
    }

    const session = signInData.session;

    console.log('Session created successfully with JWT claims:', {
      hasAccessToken: !!session.access_token,
      hasRefreshToken: !!session.refresh_token,
      expiresAt: session.expires_at,
      user_id: session.user.id,
      hasAppMetadata: !!session.user.app_metadata,
      appMetadata: session.user.app_metadata
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
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_in: session.expires_in,
          expires_at: session.expires_at,
          token_type: session.token_type || 'bearer'
        },
        supabase_user: {
          id: authUserId,
          email
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
    console.error('Telegram verify error:', error);
    return new Response(
      JSON.stringify({ valid: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});