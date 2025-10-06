import { getSupabase } from './supabaseClient';

export type TwaAuthResult =
  | { ok: true }
  | { ok: false; reason: 'no_init_data' | 'verify_failed' | 'tokens_missing' | 'set_session_failed'; details?: string };

export async function ensureTwaSession(): Promise<TwaAuthResult> {
  const supabase = getSupabase();

  console.log('🔐 ensureTwaSession: Starting authentication check');

  // Check existing session
  const { data: sessionCheck } = await supabase.auth.getSession();
  if (sessionCheck?.session) {
    const hasCustomClaims = !!(sessionCheck.session as any).user_id ||
                            !!(sessionCheck.session as any).telegram_id;
    const provider = sessionCheck.session.user.app_metadata?.provider;

    console.log('✅ ensureTwaSession: Session exists', {
      user_id: sessionCheck.session.user.id,
      provider,
      has_custom_claims: hasCustomClaims,
      role: sessionCheck.session.user.app_metadata?.role,
    });

    // If session exists with telegram provider and custom claims, we're good
    if (provider === 'telegram' && hasCustomClaims) {
      return { ok: true };
    }

    // If we have an email-based session without custom claims, try to upgrade it
    console.log('⚠️ Session exists but missing custom claims, attempting upgrade...');
  }

  console.log('🔑 ensureTwaSession: No valid session found, creating new one');

  const initData = (window as any)?.Telegram?.WebApp?.initData || '';
  if (!initData) {
    console.error('❌ ensureTwaSession: No Telegram initData available');
    return { ok: false, reason: 'no_init_data' };
  }

  console.log('📱 ensureTwaSession: Found Telegram initData, calling backend');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    console.error('❌ ensureTwaSession: No SUPABASE_URL configured');
    return { ok: false, reason: 'verify_failed', details: 'Missing SUPABASE_URL' };
  }

  try {
    console.log('📡 Calling telegram-verify:', {
      url: `${supabaseUrl}/functions/v1/telegram-verify`,
      hasInitData: initData.length > 0,
      initDataPreview: initData.substring(0, 50) + '...'
    });

    const response = await fetch(`${supabaseUrl}/functions/v1/telegram-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'webapp', initData }),
    });

    console.log('📥 telegram-verify response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }

      console.error('❌ ensureTwaSession: Backend verification failed', {
        status: response.status,
        statusText: response.statusText,
        error: errorData.error
      });

      // Signature verification should work - treat as fatal
      return {
        ok: false,
        reason: 'verify_failed',
        details: `Signature verification failed: ${errorData.error}`
      };
    }

    const result = await response.json();
    console.log('📦 ensureTwaSession: Backend response received', {
      ok: result.ok,
      has_session: !!result.session,
      has_access_token: !!result.session?.access_token,
      has_claims: !!result.claims,
    });

    const { access_token } = result.session || {};

    if (!access_token) {
      console.error('❌ ensureTwaSession: Missing access_token in response');
      return { ok: false, reason: 'tokens_missing' };
    }

    console.log('🔑 ensureTwaSession: Setting session with received JWT token');
    console.log('📋 Claims included:', result.claims);
    console.log('🔐 Access token preview:', access_token.substring(0, 20) + '...');

    // Decode and verify JWT before setting session
    try {
      const jwtPayload = JSON.parse(atob(access_token.split('.')[1]));
      console.log('🔍 JWT Payload decoded:', {
        sub: jwtPayload.sub,
        user_id: jwtPayload.user_id,
        telegram_id: jwtPayload.telegram_id,
        user_role: jwtPayload.user_role,
        provider: jwtPayload.app_metadata?.provider,
        exp: jwtPayload.exp ? new Date(jwtPayload.exp * 1000).toISOString() : 'none'
      });
    } catch (e) {
      console.error('⚠️ Could not decode JWT for verification:', e);
    }

    // Set session with the JWT from backend
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token: access_token, // Use same token for refresh to maintain claims
    });

    if (sessionError || !sessionData?.session) {
      console.error('❌ ensureTwaSession: Failed to set session', sessionError);
      return { ok: false, reason: 'set_session_failed', details: sessionError?.message };
    }

    // Decode the actual JWT from the session to verify claims
    let decodedClaims = {};
    try {
      const sessionToken = sessionData.session.access_token;
      const payload = JSON.parse(atob(sessionToken.split('.')[1]));
      decodedClaims = {
        user_id: payload.user_id,
        telegram_id: payload.telegram_id,
        user_role: payload.user_role,
        provider: payload.app_metadata?.provider
      };

      console.log('✅ ensureTwaSession: Session established successfully', {
        user_id: sessionData.session.user.id,
        provider: payload.app_metadata?.provider,
        decoded_claims: decodedClaims,
        has_all_claims: !!(payload.user_id && payload.telegram_id && payload.user_role)
      });

      // Verify the JWT has required claims
      if (!payload.user_id || !payload.telegram_id || !payload.user_role) {
        console.error('⚠️ WARNING: JWT is missing required custom claims!', {
          has_user_id: !!payload.user_id,
          has_telegram_id: !!payload.telegram_id,
          has_user_role: !!payload.user_role
        });
      }
    } catch (e) {
      console.error('❌ Failed to decode session JWT:', e);
    }

    // Store session and claims for debugging
    if (typeof window !== 'undefined') {
      (window as any).__SUPABASE_SESSION__ = sessionData.session;
      (window as any).__JWT_CLAIMS__ = decodedClaims;
      (window as any).__JWT_RAW_PAYLOAD__ = JSON.parse(atob(sessionData.session.access_token.split('.')[1]));
      console.log('📊 Debug: Access window.__SUPABASE_SESSION__, window.__JWT_CLAIMS__, and window.__JWT_RAW_PAYLOAD__ for inspection');
    }

    return { ok: true };
  } catch (error) {
    console.error('❌ ensureTwaSession: Exception during backend authentication', error);

    // Fail explicitly without fallback
    return {
      ok: false,
      reason: 'verify_failed',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}
