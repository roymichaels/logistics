import { createClient } from 'npm:@supabase/supabase-js@2';
import { createHmac, pbkdf2 } from 'node:crypto';
import { promisify } from 'node:util';

const pbkdf2Async = promisify(pbkdf2);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const PBKDF2_ITERATIONS = 100000;
const HASH_LENGTH = 64;
const SALT_LENGTH = 32;

/**
 * Generate salt for PBKDF2
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Hash PIN using PBKDF2
 */
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

/**
 * Generate secure random session token
 */
function generateSessionToken(): string {
  const array = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Calculate progressive lockout duration
 */
function calculateLockoutDuration(failedAttempts: number): string {
  let minutes = 15;
  if (failedAttempts > 8) minutes = 30;
  if (failedAttempts > 12) minutes = 60;
  if (failedAttempts > 15) minutes = 120;
  if (failedAttempts > 20) minutes = 1440; // 24 hours

  const lockoutDate = new Date();
  lockoutDate.setMinutes(lockoutDate.getMinutes() + minutes);
  return lockoutDate.toISOString();
}

/**
 * Log PIN audit event
 */
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

/**
 * Setup PIN for new user
 */
async function setupPin(telegram_id: string, pin: string) {
  console.log(`Setting up PIN for user: ${telegram_id}`);

  // Validate PIN format
  if (!/^\d{4,8}$/.test(pin)) {
    return {
      success: false,
      error: 'PIN must be 4-8 digits',
    };
  }

  // Check if PIN already exists
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

  // Generate salt and hash PIN
  const salt = generateSalt();
  const hashedPin = await hashPin(pin, salt);

  // Store PIN
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
    console.error('Failed to insert PIN:', insertError);
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

/**
 * Verify PIN
 */
async function verifyPin(telegram_id: string, pin: string, business_id?: string) {
  console.log(`Verifying PIN for user: ${telegram_id}`);

  // Get PIN data
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

  // Check if locked out
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
      // Lockout expired, reset
      await supabase
        .from('user_pins')
        .update({ locked_until: null, failed_attempts: 0 })
        .eq('telegram_id', telegram_id);
    }
  }

  // Verify PIN
  const salt = Buffer.from(pinData.salt, 'base64');
  const hashedInput = await hashPin(pin, new Uint8Array(salt));

  if (hashedInput === pinData.hashed_pin) {
    // PIN correct - reset failed attempts
    await supabase
      .from('user_pins')
      .update({
        failed_attempts: 0,
        locked_until: null,
        last_verified_at: new Date().toISOString(),
      })
      .eq('telegram_id', telegram_id);

    // Create PIN session
    const sessionToken = generateSessionToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 4); // 4-hour session

    const { error: sessionError } = await supabase
      .from('pin_sessions')
      .insert({
        telegram_id,
        session_token: sessionToken,
        business_id,
        expires_at: expiresAt.toISOString(),
      });

    if (sessionError) {
      console.error('Failed to create PIN session:', sessionError);
    }

    await logPinAudit(telegram_id, 'verify', true, { business_id });

    return {
      success: true,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
    };
  } else {
    // PIN incorrect - increment failed attempts
    const newFailedAttempts = pinData.failed_attempts + 1;
    const maxAttempts = 5; // TODO: Get from pin_settings

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

    const remainingAttempts = maxAttempts - newFailedAttempts;
    return {
      success: false,
      error: 'Incorrect PIN',
      remaining_attempts: remainingAttempts,
    };
  }
}

/**
 * Change PIN
 */
async function changePin(telegram_id: string, currentPin: string, newPin: string) {
  console.log(`Changing PIN for user: ${telegram_id}`);

  // Verify current PIN first
  const verifyResult = await verifyPin(telegram_id, currentPin);
  if (!verifyResult.success) {
    return {
      success: false,
      error: 'Current PIN is incorrect',
    };
  }

  // Validate new PIN
  if (!/^\d{4,8}$/.test(newPin)) {
    return {
      success: false,
      error: 'New PIN must be 4-8 digits',
    };
  }

  if (currentPin === newPin) {
    return {
      success: false,
      error: 'New PIN must be different from current PIN',
    };
  }

  // Generate new salt and hash
  const salt = generateSalt();
  const hashedPin = await hashPin(newPin, salt);

  // Update PIN
  const { data: pinData } = await supabase
    .from('user_pins')
    .select('pin_version')
    .eq('telegram_id', telegram_id)
    .maybeSingle();

  const { error: updateError } = await supabase
    .from('user_pins')
    .update({
      hashed_pin: hashedPin,
      salt: Buffer.from(salt).toString('base64'),
      last_changed: new Date().toISOString(),
      pin_version: (pinData?.pin_version || 0) + 1,
      failed_attempts: 0,
      locked_until: null,
    })
    .eq('telegram_id', telegram_id);

  if (updateError) {
    console.error('Failed to update PIN:', updateError);
    await logPinAudit(telegram_id, 'change', false, { error: updateError.message });
    return {
      success: false,
      error: 'Failed to change PIN',
    };
  }

  await logPinAudit(telegram_id, 'change', true);

  return {
    success: true,
    message: 'PIN changed successfully',
  };
}

/**
 * Verify PIN session token
 */
async function verifySession(telegram_id: string, sessionToken: string) {
  const { data, error } = await supabase
    .from('pin_sessions')
    .select('*')
    .eq('telegram_id', telegram_id)
    .eq('session_token', sessionToken)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error || !data) {
    return {
      success: false,
      error: 'Invalid or expired session',
    };
  }

  // Extend session on activity
  const newExpiresAt = new Date();
  newExpiresAt.setHours(newExpiresAt.getHours() + 4);

  await supabase
    .from('pin_sessions')
    .update({
      last_activity_at: new Date().toISOString(),
      expires_at: newExpiresAt.toISOString(),
    })
    .eq('id', data.id);

  return {
    success: true,
    session: data,
    expires_at: newExpiresAt.toISOString(),
  };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Get user from JWT
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

    const { operation, pin, currentPin, newPin, business_id, session_token } = await req.json();

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

      case 'change':
        if (!currentPin || !newPin) throw new Error('Current and new PIN are required');
        result = await changePin(telegram_id, currentPin, newPin);
        break;

      case 'verify_session':
        if (!session_token) throw new Error('Session token is required');
        result = await verifySession(telegram_id, session_token);
        break;

      default:
        throw new Error('Invalid operation. Use: setup, verify, change, verify_session');
    }

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('PIN verify error:', err);
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
