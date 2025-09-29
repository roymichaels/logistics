import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  
  // Create data check string
  const dataCheckString = Object.keys(fields)
    .sort()
    .map(key => `${key}=${fields[key]}`)
    .join("\n");

  // Create secret key: SHA256(bot_token)
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

  // Calculate hash
  const calculatedHash = await hmacSha256(secretKey, dataCheckString);
  
  // Check freshness (within 24 hours)
  const authDate = Number(fields.auth_date);
  const now = Math.floor(Date.now() / 1000);
  const isRecent = (now - authDate) < (24 * 60 * 60);

  return calculatedHash === hash && isRecent;
}

async function verifyWebApp(initData: string, botToken: string): Promise<{ valid: boolean; user?: TelegramUser }> {
  const encoder = new TextEncoder();
  
  // Create WebApp secret key: HMAC_SHA256("WebAppData", bot_token)
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

  // Parse initData
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  
  if (!hash) {
    return { valid: false };
  }
  
  params.delete("hash");

  // Create data check string
  const sortedParams = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  // Calculate hash
  const calculatedHash = await hmacSha256(webappKey, sortedParams);
  
  if (calculatedHash !== hash) {
    return { valid: false };
  }

  // Check freshness
  const authDate = Number(params.get("auth_date") || "0");
  const now = Math.floor(Date.now() / 1000);
  const isRecent = (now - authDate) < (24 * 60 * 60);
  
  if (!isRecent) {
    return { valid: false };
  }

  // Extract user data
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
  // Handle CORS preflight
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

    // Create Supabase client for session management
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create or update user in Supabase Auth
    let authUser;
    if (user) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: `${user.id}@telegram.local`,
        user_metadata: {
          telegram_id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          photo_url: user.photo_url,
          provider: 'telegram'
        },
        email_confirm: true
      });

      if (error && !error.message.includes('already registered')) {
        console.error("Error creating user:", error);
        throw error;
      }

      authUser = data?.user;
    }

    // Generate session token
    const sessionData = {
      telegram_id: user?.id.toString(),
      username: user?.username,
      first_name: user?.first_name,
      last_name: user?.last_name,
      photo_url: user?.photo_url,
      auth_date: user?.auth_date,
      verified_at: new Date().toISOString()
    };

    // Create JWT token (you can also use Supabase Auth session)
    const jwtSecret = Deno.env.get("JWT_SECRET");
    if (jwtSecret) {
      // Import JWT library if needed
      // For now, return session data directly
    }

    return new Response(
      JSON.stringify({
        ok: true,
        user: sessionData,
        session: authUser ? { user: authUser } : null
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