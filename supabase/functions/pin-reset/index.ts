import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

async function checkResetAuthorization(
  requester_telegram_id: string,
  target_telegram_id: string
): Promise<{ authorized: boolean; reason?: string }> {
  const { data: requester, error: requesterError } = await supabase
    .from('users')
    .select('role')
    .eq('telegram_id', requester_telegram_id)
    .maybeSingle();

  if (requesterError || !requester) {
    return { authorized: false, reason: 'Requester not found' };
  }

  if (requester.role === 'infrastructure_owner') {
    return { authorized: true };
  }

  if (requester.role === 'business_owner') {
    const { data: sharedBusinesses, error: businessError } = await supabase
      .from('business_users')
      .select('business_id')
      .or(`user_id.eq.${requester_telegram_id},user_id.eq.${target_telegram_id}`)
      .eq('active', true);

    if (businessError) {
      return { authorized: false, reason: 'Failed to check business membership' };
    }

    if (sharedBusinesses && sharedBusinesses.length > 0) {
      const requesterBusinesses = sharedBusinesses.filter(
        (b: any) => b.user_id === requester_telegram_id
      ).map((b: any) => b.business_id);

      const targetBusinesses = sharedBusinesses.filter(
        (b: any) => b.user_id === target_telegram_id
      ).map((b: any) => b.business_id);

      const hasSharedBusiness = requesterBusinesses.some((id: string) =>
        targetBusinesses.includes(id)
      );

      if (hasSharedBusiness) {
        return { authorized: true };
      }
    }

    return { authorized: false, reason: 'User not in your businesses' };
  }

  return { authorized: false, reason: 'Insufficient permissions' };
}

async function resetPin(
  requester_telegram_id: string,
  target_telegram_id: string
) {
  console.log(`Reset PIN request: requester=${requester_telegram_id}, target=${target_telegram_id}`);

  const authCheck = await checkResetAuthorization(requester_telegram_id, target_telegram_id);
  if (!authCheck.authorized) {
    await logPinAudit(target_telegram_id, 'admin_reset', false, {
      requester: requester_telegram_id,
      reason: authCheck.reason,
    });
    return {
      success: false,
      error: authCheck.reason || 'Not authorized to reset this PIN',
    };
  }

  const { error: deleteError } = await supabase
    .from('user_pins')
    .delete()
    .eq('telegram_id', target_telegram_id);

  if (deleteError) {
    console.error('Failed to delete PIN:', deleteError);
    await logPinAudit(target_telegram_id, 'admin_reset', false, {
      requester: requester_telegram_id,
      error: deleteError.message,
    });
    return {
      success: false,
      error: 'Failed to reset PIN',
    };
  }

  const { error: sessionError } = await supabase
    .from('pin_sessions')
    .delete()
    .eq('telegram_id', target_telegram_id);

  if (sessionError) {
    console.warn('Failed to invalidate PIN sessions:', sessionError);
  }

  await logPinAudit(target_telegram_id, 'admin_reset', true, {
    requester: requester_telegram_id,
  });

  return {
    success: true,
    message: 'PIN reset successfully. User can set up a new PIN.',
  };
}

async function unlockPin(
  requester_telegram_id: string,
  target_telegram_id: string
) {
  console.log(`Unlock PIN request: requester=${requester_telegram_id}, target=${target_telegram_id}`);

  const authCheck = await checkResetAuthorization(requester_telegram_id, target_telegram_id);
  if (!authCheck.authorized) {
    await logPinAudit(target_telegram_id, 'unlock', false, {
      requester: requester_telegram_id,
      reason: authCheck.reason,
    });
    return {
      success: false,
      error: authCheck.reason || 'Not authorized to unlock this PIN',
    };
  }

  const { error: updateError } = await supabase
    .from('user_pins')
    .update({
      failed_attempts: 0,
      locked_until: null,
    })
    .eq('telegram_id', target_telegram_id);

  if (updateError) {
    console.error('Failed to unlock PIN:', updateError);
    await logPinAudit(target_telegram_id, 'unlock', false, {
      requester: requester_telegram_id,
      error: updateError.message,
    });
    return {
      success: false,
      error: 'Failed to unlock PIN',
    };
  }

  await logPinAudit(target_telegram_id, 'unlock', true, {
    requester: requester_telegram_id,
  });

  return {
    success: true,
    message: 'PIN unlocked successfully',
  };
}

async function getPinStatus(telegram_id: string) {
  const { data: pinData, error } = await supabase
    .from('user_pins')
    .select('created_at, last_changed, failed_attempts, locked_until, last_verified_at, pin_version')
    .eq('telegram_id', telegram_id)
    .maybeSingle();

  if (error) {
    return {
      success: false,
      error: 'Failed to get PIN status',
    };
  }

  if (!pinData) {
    return {
      success: true,
      has_pin: false,
    };
  }

  const isLocked = pinData.locked_until && new Date(pinData.locked_until) > new Date();

  return {
    success: true,
    has_pin: true,
    created_at: pinData.created_at,
    last_changed: pinData.last_changed,
    last_verified_at: pinData.last_verified_at,
    failed_attempts: pinData.failed_attempts,
    is_locked: isLocked,
    locked_until: isLocked ? pinData.locked_until : null,
    pin_version: pinData.pin_version,
  };
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

    const requester_telegram_id = user.user_metadata?.telegram_id?.toString();
    if (!requester_telegram_id) {
      throw new Error('Telegram ID not found in user metadata');
    }

    const { operation, target_telegram_id } = await req.json();

    let result;
    switch (operation) {
      case 'reset':
        if (!target_telegram_id) throw new Error('Target telegram_id is required');
        result = await resetPin(requester_telegram_id, target_telegram_id);
        break;

      case 'unlock':
        if (!target_telegram_id) throw new Error('Target telegram_id is required');
        result = await unlockPin(requester_telegram_id, target_telegram_id);
        break;

      case 'status':
        const check_telegram_id = target_telegram_id || requester_telegram_id;
        if (check_telegram_id !== requester_telegram_id) {
          const authCheck = await checkResetAuthorization(requester_telegram_id, check_telegram_id);
          if (!authCheck.authorized) {
            throw new Error('Not authorized to view this PIN status');
          }
        }
        result = await getPinStatus(check_telegram_id);
        break;

      default:
        throw new Error('Invalid operation. Use: reset, unlock, status');
    }

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('PIN reset error:', err);
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