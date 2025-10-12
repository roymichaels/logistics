import { createClient } from 'npm:@supabase/supabase-js@2';
import { pbkdf2 } from 'node:crypto';
import { promisify } from 'node:util';
import { encode as base64Encode, decode as base64Decode } from 'https://deno.land/std@0.224.0/encoding/base64.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const pbkdf2Async = promisify(pbkdf2);

function uint8ArrayToBase64(arr: Uint8Array): string {
  return base64Encode(arr);
}

function base64ToUint8Array(str: string): Uint8Array {
  return base64Decode(str);
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const PBKDF2_ITERATIONS = 100000;
const HASH_LENGTH = 64;
const SALT_LENGTH = 32;

function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

async function hashPin(pin: string, salt: Uint8Array): Promise<string> {
  const hash = await pbkdf2Async(
    pin,
    salt,
    PBKDF2_ITERATIONS,
    HASH_LENGTH,
    'sha256'
  );
  return uint8ArrayToBase64(new Uint8Array(hash));
}

function generateSessionToken(): string {
  const array = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function calculateLockoutDuration(failedAttempts: number): string {
  let minutes = 15;
  if (failedAttempts > 8) minutes = 30;
  if (failedAttempts > 12) minutes = 60;
  if (failedAttempts > 15) minutes = 120;
  if (failedAttempts > 20) minutes = 1440;

  const lockoutDate = new Date();
  lockoutDate.setMinutes(lockoutDate.getMinutes() + minutes);
  return lockoutDate.toISOString();
}

async function logPinAudit(
  telegram_id: string,
  action: string,
  success: boolean,
  metadata: Record<string, any> = {}
) {
  const { error } = await supabase
    .from('pin_audit_log')
    .insert({
      telegram_id,
      action,
      success,
      metadata,
    });

  if (error) {
    console.error('Failed to log PIN audit:', error);
  }
}

async function setupPin(telegram_id: string, pin: string) {
  console.log('[SETUP] setupPin called for telegram_id:', telegram_id);

  if (!/^\d{4,8}$/.test(pin)) {
    console.log('[ERROR] Invalid PIN format');
    return {
      success: false,
      error: 'PIN must be 4-8 digits',
    };
  }

  console.log('[CHECK] Checking for existing PIN...');
  const { data: existingPin, error: checkError } = await supabase
    .from('user_pins')
    .select('telegram_id')
    .eq('telegram_id', telegram_id)
    .maybeSingle();

  if (checkError) {
    console.error('[ERROR] Error checking existing PIN:', checkError);
    await logPinAudit(telegram_id, 'setup', false, { error: checkError.message });
    return {
      success: false,
      error: `Database error: ${checkError.message}`,
    };
  }

  if (existingPin) {
    console.log('[WARN] PIN already exists for this user');
    await logPinAudit(telegram_id, 'setup', false, { reason: 'pin_already_exists' });
    return {
      success: false,
      error: 'PIN already set up. Use change operation to update.',
    };
  }

  console.log('[HASH] Generating salt and hashing PIN...');
  const salt = generateSalt();
  const hashedPin = await hashPin(pin, salt);

  console.log('[DB] Inserting PIN into database...');
  const { error: insertError } = await supabase
    .from('user_pins')
    .insert({
      telegram_id,
      hashed_pin: hashedPin,
      salt: uint8ArrayToBase64(salt),
      pin_version: 1,
      failed_attempts: 0,
    });

  if (insertError) {
    console.error('[ERROR] Insert error:', insertError);
    await logPinAudit(telegram_id, 'setup', false, { error: insertError.message });
    return {
      success: false,
      error: `Failed to setup PIN: ${insertError.message}`,
    };
  }

  console.log('[OK] PIN setup successful');
  await logPinAudit(telegram_id, 'setup', true);

  return {
    success: true,
    message: 'PIN setup successfully',
  };
}

async function verifyPin(telegram_id: string, pin: string, business_id?: string) {
  const { data: pinData, error: pinError } = await supabase
    .from('user_pins')
    .select('*')
    .eq('telegram_id', telegram_id)
    .maybeSingle();

  if (pinError || !pinData) {
    await logPinAudit(telegram_id, 'verify', false, { reason: 'pin_not_found' });
    return {
      success: false,
      error: 'PIN not set up',
    };
  }

  if (pinData.locked_until) {
    const lockoutTime = new Date(pinData.locked_until);
    if (lockoutTime > new Date()) {
      const remainingMinutes = Math.ceil((lockoutTime.getTime() - Date.now()) / 60000);
      await logPinAudit(telegram_id, 'verify', false, { reason: 'locked_out' });
      return {
        success: false,
        error: `Account locked. Try again in ${remainingMinutes} minutes`,
        locked_until: pinData.locked_until,
      };
    } else {
      await supabase
        .from('user_pins')
        .update({ locked_until: null, failed_attempts: 0 })
        .eq('telegram_id', telegram_id);
    }
  }

  const salt = base64ToUint8Array(pinData.salt);
  const hashedInput = await hashPin(pin, salt);  

  if (hashedInput === pinData.hashed_pin) {
    await supabase
      .from('user_pins')
      .update({
        failed_attempts: 0,
        locked_until: null,
        last_verified_at: new Date().toISOString(),
      })
      .eq('telegram_id', telegram_id);

    const sessionToken = generateSessionToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 4);

    await supabase
      .from('pin_sessions')
      .insert({
        telegram_id,
        session_token: sessionToken,
        business_id,
        expires_at: expiresAt.toISOString(),
      });

    await logPinAudit(telegram_id, 'verify', true, { business_id });

    return {
      success: true,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
    };
  } else {
    const newFailedAttempts = pinData.failed_attempts + 1;
    const maxAttempts = 5;

    let updateData: any = {
      failed_attempts: newFailedAttempts,
    };

    if (newFailedAttempts >= maxAttempts) {
      updateData.locked_until = calculateLockoutDuration(newFailedAttempts);
    }

    await supabase
      .from('user_pins')
      .update(updateData)
      .eq('telegram_id', telegram_id);

    await logPinAudit(telegram_id, 'verify', false, {
      failed_attempts: newFailedAttempts,
      locked_out: newFailedAttempts >= maxAttempts,
    });

    if (newFailedAttempts >= maxAttempts) {
      return {
        success: false,
        error: 'Too many failed attempts. Account locked.',
        locked_until: updateData.locked_until,
      };
    }

    return {
      success: false,
      error: 'Incorrect PIN',
      remaining_attempts: maxAttempts - newFailedAttempts,
    };
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('[HASH] PIN verify function called');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[ERROR] Missing authorization header');
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('[TOKEN] Token extracted, validating user...');

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError) {
      console.error('[ERROR] Auth error:', authError);
      throw new Error(`Authentication failed: ${authError.message}`);
    }

    if (!user) {
      console.error('[ERROR] No user found in token');
      throw new Error('User not found');
    }

    console.log('[OK] User authenticated:', user.id);
    console.log('[META] User metadata:', JSON.stringify(user.user_metadata));

    let telegram_id = user.user_metadata?.telegram_id;

    if (!telegram_id) {
      console.log('[WARN] telegram_id not in user_metadata, checking app_metadata...');
      telegram_id = user.app_metadata?.telegram_id;
    }

    if (!telegram_id) {
      console.error('[ERROR] Telegram ID not found in metadata');
      throw new Error('Telegram ID not found in user metadata');
    }

    telegram_id = telegram_id.toString();
    console.log('[TELEGRAM] Telegram ID:', telegram_id);

    const body = await req.json();
    console.log('[BODY] Request body:', JSON.stringify(body));

    const { operation, pin, business_id } = body;

    if (!operation) {
      console.error('[ERROR] Operation not specified');
      throw new Error('Operation is required');
    }

    console.log(`[OP] Operation: ${operation}`);

    let result;
    switch (operation) {
      case 'setup':
        if (!pin) {
          console.error('[ERROR] PIN not provided for setup');
          throw new Error('PIN is required');
        }
        console.log('[SETUP] Setting up PIN...');
        result = await setupPin(telegram_id, pin);
        console.log('[OK] Setup result:', JSON.stringify(result));
        break;

      case 'verify':
        if (!pin) {
          console.error('[ERROR] PIN not provided for verify');
          throw new Error('PIN is required');
        }
        console.log('[CHECK] Verifying PIN...');
        result = await verifyPin(telegram_id, pin, business_id);
        console.log('[OK] Verify result:', JSON.stringify({ success: result.success }));
        break;

      default:
        console.error('[ERROR] Invalid operation:', operation);
        throw new Error('Invalid operation. Use: setup, verify');
    }

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('[CRASH] Error in pin-verify function:', err);
    console.error('Stack:', err.stack);

    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Internal Server Error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});