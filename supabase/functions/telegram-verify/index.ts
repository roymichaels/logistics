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

  const calculatedHash = await hmacSha256(secretKey, checkString);
  return calculatedHash === hash;
}

async function verifyWebAppInitData(initData: string, botToken: string): Promise<boolean> {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) {
      console.error('No hash in initData');
      return false;
    }

    urlParams.delete('hash');
    
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    console.log('Data check string length:', dataCheckString.length);

    const encoder = new TextEncoder();
    const secretKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const tokenHash = await crypto.subtle.sign(
      "HMAC",
      secretKey,
      encoder.encode(botToken)
    );

    const finalKey = await crypto.subtle.importKey(
      "raw",
      tokenHash,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const calculatedHash = await hmacSha256(finalKey, dataCheckString);
    const isValid = calculatedHash === hash;
    
    console.log('Hash validation result:', isValid);
    return isValid;
  } catch (error) {
    console.error('Error verifying initData:', error);
    return false;
  }
}

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
    const body: VerifyRequest = await req.json();
    const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');

    if (!BOT_TOKEN) {
      console.error('TELEGRAM_BOT_TOKEN not configured');
      return new Response(
        JSON.stringify({ ok: false, error: 'Bot token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let user: TelegramUser | null = null;
    let isValid = false;

    if (body.type === 'loginWidget' && body.data) {
      console.log('Verifying login widget data');
      isValid = await verifyLoginWidget(body.data, BOT_TOKEN);
      
      if (isValid) {
        user = {
          id: parseInt(body.data.id),
          first_name: body.data.first_name,
          last_name: body.data.last_name,
          username: body.data.username,
          photo_url: body.data.photo_url,
          auth_date: parseInt(body.data.auth_date)
        };
      }
    } else if (body.type === 'webapp' && body.initData) {
      console.log('Verifying webapp initData');
      isValid = await verifyWebAppInitData(body.initData, BOT_TOKEN);
      
      if (isValid) {
        const urlParams = new URLSearchParams(body.initData);
        const userJson = urlParams.get('user');
        
        if (userJson) {
          const parsedUser = JSON.parse(userJson);
          user = {
            id: parsedUser.id,
            first_name: parsedUser.first_name,
            last_name: parsedUser.last_name,
            username: parsedUser.username,
            photo_url: parsedUser.photo_url,
            auth_date: parseInt(urlParams.get('auth_date') || '0')
          };
        }
      }
    }

    if (!isValid || !user) {
      console.log('Verification failed');
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid authentication data' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verification successful for user:', user.id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const telegramIdStr = user.id.toString();
    const usernameNormalized = normalizeUsername(user.username);
    const fullName = user.first_name + (user.last_name ? ` ${user.last_name}` : '');

    const sessionData = {
      telegram_id: telegramIdStr,
      username: usernameNormalized,
      first_name: user.first_name,
      last_name: user.last_name,
      name: fullName,
      photo_url: user.photo_url,
      auth_date: user.auth_date
    };

    let sessionPayload = null;

    try {
      const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET');
      
      if (jwtSecret) {
        const payload = {
          sub: telegramIdStr,
          telegram_id: telegramIdStr,
          username: usernameNormalized,
          aud: 'authenticated',
          role: 'authenticated',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)
        };

        sessionPayload = payload;
      }
    } catch (error) {
      console.warn('Failed to create session:', error);
    }

    const FIRST_ADMIN_USERNAME = Deno.env.get('FIRST_ADMIN_USERNAME');
    const firstAdminUsername = normalizeUsername(FIRST_ADMIN_USERNAME);

    if (firstAdminUsername) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('telegram_id')
        .eq('telegram_id', telegramIdStr)
        .maybeSingle();

      if (!existingUser) {
        const isFirstAdmin = usernameNormalized === firstAdminUsername;

        const { error: insertError } = await supabase
          .from('users')
          .insert({
            telegram_id: telegramIdStr,
            username: usernameNormalized,
            name: fullName,
            role: isFirstAdmin ? 'owner' : 'manager',
            photo_url: user.photo_url
          });

        if (insertError) {
          console.error('Failed to create user in users table:', insertError);
        } else {
          console.log(`✅ Created user in users table: ${usernameNormalized} (role: ${isFirstAdmin ? 'owner' : 'manager'})`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        user: sessionData,
        session: sessionPayload,
        supabase_user: null
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});