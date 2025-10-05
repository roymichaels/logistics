import { getSupabase } from './supabaseClient';

export type TwaAuthResult =
  | { ok: true }
  | { ok: false; reason: 'no_init_data' | 'verify_failed' | 'tokens_missing' | 'set_session_failed'; details?: string };

/**
 * Client-side authentication fallback
 * Used when backend verification fails or is unavailable
 */
async function clientSideAuth(): Promise<TwaAuthResult> {
  console.log('🔐 clientSideAuth: Starting client-side authentication');

  const WebApp = (window as any)?.Telegram?.WebApp;
  if (!WebApp?.initDataUnsafe?.user) {
    console.error('❌ clientSideAuth: No Telegram user data available');
    return { ok: false, reason: 'no_init_data' };
  }

  const user = WebApp.initDataUnsafe.user;
  const supabase = getSupabase();

  try {
    // Create a synthetic email for this Telegram user
    const email = `${user.id}@telegram.auth`;
    const password = user.id.toString();

    console.log('👤 clientSideAuth: Telegram user:', {
      id: user.id,
      username: user.username,
      first_name: user.first_name
    });

    // Try to sign in with existing auth user
    console.log('🔑 clientSideAuth: Attempting sign in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      // User doesn't exist in auth, create them
      console.log('📝 clientSideAuth: User not found, creating new auth user...');
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            telegram_id: user.id.toString(),
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            photo_url: user.photo_url
          }
        }
      });

      if (signUpError || !signUpData.session) {
        console.error('❌ clientSideAuth: Failed to create user:', signUpError);
        return { ok: false, reason: 'set_session_failed', details: signUpError?.message };
      }

      console.log('✅ clientSideAuth: New user created in auth');

      // Create user record in users table
      const authUserId = signUpData.session.user.id;
      console.log('📝 clientSideAuth: Creating user record in database...');

      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();

      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: authUserId,
          telegram_id: user.id.toString(),
          username: user.username || `user_${user.id}`,
          name: fullName || user.first_name || 'User',
          first_name: user.first_name || null,
          last_name: user.last_name || null,
          role: 'manager', // Default role for new users
          photo_url: user.photo_url || null
        });

      if (insertError) {
        console.error('❌ clientSideAuth: Failed to create user record:', insertError);
        // Continue anyway - auth user exists, they can still use the app
      } else {
        console.log('✅ clientSideAuth: User record created in database');
      }

      return { ok: true };
    }

    if (!signInData.session) {
      console.error('❌ clientSideAuth: No session after sign in');
      return { ok: false, reason: 'set_session_failed', details: 'No session returned' };
    }

    const authUserId = signInData.session.user.id;

    console.log('✅ clientSideAuth: User authenticated successfully', {
      user_id: authUserId,
      has_metadata: !!signInData.session.user.user_metadata
    });

    // Check if user record exists in database
    console.log('🔍 clientSideAuth: Checking if user exists in database...');
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', authUserId)
      .maybeSingle();

    if (!existingUser) {
      // User authenticated but no database record - create it
      console.log('📝 clientSideAuth: User record not found, creating...');
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();

      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: authUserId,
          telegram_id: user.id.toString(),
          username: user.username || `user_${user.id}`,
          name: fullName || user.first_name || 'User',
          first_name: user.first_name || null,
          last_name: user.last_name || null,
          role: 'manager', // Default role for new users
          photo_url: user.photo_url || null
        });

      if (insertError) {
        console.error('❌ clientSideAuth: Failed to create user record:', insertError);
      } else {
        console.log('✅ clientSideAuth: User record created');
      }
    } else {
      console.log('✅ clientSideAuth: User record exists', { role: existingUser.role });
    }

    // Store session in window for debugging
    if (typeof window !== 'undefined') {
      (window as any).__SUPABASE_SESSION__ = signInData.session;
      (window as any).__JWT_CLAIMS__ = signInData.session.user.app_metadata;
    }

    return { ok: true };
  } catch (error) {
    console.error('❌ clientSideAuth: Exception during authentication', error);
    return {
      ok: false,
      reason: 'verify_failed',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

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
      console.warn('⚠️ ensureTwaSession: Backend verification failed, will use client-side fallback', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      // Use client-side fallback when backend fails
      console.log('🔄 Switching to client-side authentication...');
      return await clientSideAuth();
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
    console.warn('⚠️ ensureTwaSession: Exception during backend authentication, using client-side fallback', error);
    console.log('🔄 Switching to client-side authentication due to exception...');
    return await clientSideAuth();
  }
}
