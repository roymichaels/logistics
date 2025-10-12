import { createClient } from 'npm:@supabase/supabase-js@2';
import { createHmac, pbkdf2 } from 'node:crypto';
import { promisify } from 'node:util';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const pbkdf2Async = promisify(pbkdf2);

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
  return hash.toString('base64');
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
  if (!/^\d{4,8}$/.test(pin)) {
    return {
      success: false,
      error: 'PIN must be 4-8 digits',
    };
  }

  const { data: existingPin } = await supabase
    .from('user_pins')
    .select('telegram_id')
    .eq('telegram_id', telegram_id)
    .maybeSingle();

  if (existingPin) {
    await logPinAudit(telegram_id, 'setup', false, { reason: 'pin_already_exists' });
    return {
      success: false,
      error: 'PIN already set up. Use change operation to update.',
    };
  }

  const salt = generateSalt();
  const hashedPin = await hashPin(pin, salt);

  const { error: insertError } = await supabase
    .from('user_pins')
    .insert({
      telegram_id,
      hashed_pin: hashedPin,
      salt: Buffer.from(salt).toString('base64'),
      pin_version: 1,
      failed_attempts: 0,
    });

  if (insertError) {
    await logPinAudit(telegram_id, 'setup', false, { error: insertError.message });
    return {
      success: false,
      error: 'Failed to setup PIN',
    };
  }

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

  const salt = Buffer.from(pinData.salt, 'base64');
  const hashedInput = await hashPin(pin, new Uint8Array(salt));

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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const telegram_id = user.user_metadata?.telegram_id?.toString();
    if (!telegram_id) {
      throw new Error('Telegram ID not found in user metadata');
    }

    const { operation, pin, business_id } = await req.json();

    let result;
    switch (operation) {
      case 'setup':
        if (!pin) throw new Error('PIN is required');
        result = await setupPin(telegram_id, pin);
        break;

      case 'verify':
        if (!pin) throw new Error('PIN is required');
        result = await verifyPin(telegram_id, pin, business_id);
        break;

      default:
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