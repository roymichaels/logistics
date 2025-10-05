import { getSupabase } from './supabaseClient';

export type TwaAuthResult =
  | { ok: true }
  | { ok: false; reason: 'no_init_data' | 'verify_failed' | 'tokens_missing' | 'set_session_failed'; details?: string };

export async function ensureTwaSession(): Promise<TwaAuthResult> {
  const supabase = getSupabase();

  console.log('🔐 ensureTwaSession: Starting authentication check');

  const { data: sessionCheck } = await supabase.auth.getSession();
  if (sessionCheck?.session) {
    console.log('✅ ensureTwaSession: Session already exists', {
      user_id: sessionCheck.session.user.id,
      has_app_metadata: !!sessionCheck.session.user.app_metadata,
      role: sessionCheck.session.user.app_metadata?.role,
    });
    return { ok: true };
  }

  console.log('⚠️ ensureTwaSession: No session found, attempting to create one');

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
    const response = await fetch(`${supabaseUrl}/functions/v1/telegram-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'webapp', initData }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ ensureTwaSession: Backend verification failed', {
        status: response.status,
        error: errorText,
      });
      return { ok: false, reason: 'verify_failed', details: errorText };
    }

    const result = await response.json();
    console.log('📦 ensureTwaSession: Backend response received', {
      ok: result.ok,
      has_session: !!result.session,
      has_tokens: !!(result.session?.access_token && result.session?.refresh_token),
    });

    const { access_token, refresh_token } = result.session || {};

    if (!access_token || !refresh_token) {
      console.error('❌ ensureTwaSession: Missing tokens in response');
      return { ok: false, reason: 'tokens_missing' };
    }

    console.log('🔑 ensureTwaSession: Setting session with received tokens');

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (sessionError || !sessionData?.session) {
      console.error('❌ ensureTwaSession: Failed to set session', sessionError);
      return { ok: false, reason: 'set_session_failed', details: sessionError?.message };
    }

    console.log('✅ ensureTwaSession: Session established successfully', {
      user_id: sessionData.session.user.id,
      role: sessionData.session.user.app_metadata?.role,
      workspace_id: sessionData.session.user.app_metadata?.workspace_id,
    });

    if (typeof window !== 'undefined') {
      (window as any).__SUPABASE_SESSION__ = sessionData.session;
      (window as any).__JWT_CLAIMS__ = sessionData.session.user.app_metadata;
    }

    return { ok: true };
  } catch (error) {
    console.error('❌ ensureTwaSession: Exception during authentication', error);
    return {
      ok: false,
      reason: 'verify_failed',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}
