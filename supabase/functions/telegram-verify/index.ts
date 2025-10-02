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
  
  const dataCheckString = Object.keys(fields)
    .sort()
    .map(key => `${key}=${fields[key]}`)
    .join("\n");

  const encoder = new TextEncoder();
  const secretBytes = new Uint8Array(
    await crypto.subtle.digest("SHA-256", encoder.encode(botToken))
  );
  
  const secretKey = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const calculatedHash = await hmacSha256(secretKey, dataCheckString);
  
  const authDate = Number(fields.auth_date);
  if (!authDate) {
    return false;
  }
  
  const now = Math.floor(Date.now() / 1000);
  const isRecent = (now - authDate) < (24 * 60 * 60);

  return calculatedHash === hash && isRecent;
}

async function verifyWebApp(initData: string, botToken: string): Promise<{ valid: boolean; user?: TelegramUser }> {
  const encoder = new TextEncoder();
  
  const seedKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(botToken),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const seed = await crypto.subtle.sign("HMAC", seedKey, encoder.encode("WebAppData"));
  
  const webappKey = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(seed),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  
  if (!hash) {
    return { valid: false };
  }
  
  params.delete("hash");

  const sortedParams = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const calculatedHash = await hmacSha256(webappKey, sortedParams);
  
  if (calculatedHash !== hash) {
    return { valid: false };
  }

  const authDateParam = params.get("auth_date");
  if (!authDateParam) {
    return { valid: false };
  }

  const authDate = Number(authDateParam);
  const now = Math.floor(Date.now() / 1000);
  const isRecent = (now - authDate) < (24 * 60 * 60);
  
  if (!isRecent) {
    return { valid: false };
  }

  const userParam = params.get("user");
  if (userParam) {
    try {
      const user = JSON.parse(userParam) as TelegramUser;
      return { valid: true, user };
    } catch (error) {
      console.error("Failed to parse user data:", error);
    }
  }

  return { valid: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const body = await req.json() as VerifyRequest;
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    
    if (!botToken) {
      throw new Error("TELEGRAM_BOT_TOKEN not configured");
    }

    let isValid = false;
    let user: TelegramUser | undefined;

    if (body.type === "loginWidget" && body.data) {
      isValid = await verifyLoginWidget(body.data, botToken);
      if (isValid) {
        user = {
          id: Number(body.data.id),
          first_name: body.data.first_name,
          last_name: body.data.last_name,
          username: body.data.username,
          photo_url: body.data.photo_url,
          auth_date: Number(body.data.auth_date)
        };
      }
    } else if (body.type === "webapp" && body.initData) {
      const result = await verifyWebApp(body.initData, botToken);
      isValid = result.valid;
      user = result.user;
    }

    if (!isValid) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid authentication data" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    let authUser;
    let authSession;

    if (user) {
      const normalizedUsername = normalizeUsername(user.username);
      const email = normalizedUsername ? `${normalizedUsername}@telegram.local` : `${user.id}@telegram.local`;
      
      const metadata = {
        telegram_id: user.id.toString(),
        username: normalizedUsername,
        first_name: user.first_name,
        last_name: user.last_name,
        photo_url: user.photo_url,
        provider: 'telegram'
      };

      const { error: createError } = await supabase.auth.admin.createUser({
        email,
        user_metadata: metadata,
        email_confirm: true
      });

      if (createError && !createError.message.includes('already registered')) {
        console.error("Error creating user:", createError);
        throw createError;
      }

      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email
      });

      if (linkError) {
        console.error('Failed to generate magic link session:', linkError);
        throw linkError;
      }

      authUser = linkData.user ?? null;
      const actionLink = linkData.properties?.action_link;
      let magicLinkToken: string | null = null;

      if (typeof actionLink === 'string') {
        try {
          const linkUrl = new URL(actionLink);
          magicLinkToken = linkUrl.searchParams.get('token');
        } catch (parseError) {
          console.warn('Failed to parse magic link URL:', parseError);
        }
      }

      if (!magicLinkToken) {
        magicLinkToken = linkData.properties?.email_otp ?? null;
      }

      if (authUser?.id) {
        const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
          user_metadata: metadata
        });

        if (updateError) {
          console.warn('Failed to sync user metadata:', updateError);
        }
      }

      if (!magicLinkToken) {
        throw new Error('Unable to mint Supabase session');
      }

      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        type: 'magiclink',
        email,
        token: magicLinkToken
      });

      if (verifyError) {
        console.error('Failed to verify OTP for session:', verifyError);
        throw verifyError;
      }

      authSession = verifyData.session;
      if (!authUser && verifyData.user) {
        authUser = verifyData.user;
      }
    }

    const sessionPayload = authSession
      ? {
          access_token: authSession.access_token,
          refresh_token: authSession.refresh_token,
          expires_in: authSession.expires_in ?? null,
          expires_at: authSession.expires_at ?? null,
          token_type: authSession.token_type ?? 'bearer'
        }
      : null;

    const sessionData = {
      telegram_id: user?.id.toString(),
      username: normalizeUsername(user?.username),
      first_name: user?.first_name,
      last_name: user?.last_name,
      photo_url: user?.photo_url,
      auth_date: user?.auth_date,
      verified_at: new Date().toISOString()
    };

    if (user && authUser?.id) {
      const telegramIdStr = user.id.toString();
      const usernameNormalized = normalizeUsername(user.username);
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');

      const { data: existingUser } = await supabase
        .from('users')
        .select('id, role')
        .eq('telegram_id', telegramIdStr)
        .single();

      if (!existingUser) {
        const firstAdminUsername = Deno.env.get("FIRST_ADMIN_USERNAME")?.toLowerCase().replace(/^@/, '') || 'dancohen';
        const isFirstAdmin = usernameNormalized === firstAdminUsername;

        const { error: insertError } = await supabase
          .from('users')
          .insert({
            telegram_id: telegramIdStr,
            username: usernameNormalized,
            name: fullName,
            role: isFirstAdmin ? 'owner' : 'user',
            photo_url: user.photo_url
          });

        if (insertError) {
          console.error('Failed to create user in users table:', insertError);
        } else {
          console.log(`✅ Created user in users table: ${usernameNormalized} (role: ${isFirstAdmin ? 'owner' : 'user'})`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        user: sessionData,
        session: sessionPayload,
        supabase_user: authUser ?? null
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Verification error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});