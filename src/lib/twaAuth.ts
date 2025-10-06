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
        error: errorData.error,
        will_use_fallback: errorData.will_use_fallback
      });

      // Only use fallback if backend explicitly says it's ok
      if (errorData.will_use_fallback) {
        console.log('🔄 Backend allows fallback, switching to client-side authentication...');
        return await clientSideAuth();
      }

      // Otherwise, treat as fatal - signature verification should work
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

    // Set session with the JWT from backend
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token: access_token, // Use same token for refresh to maintain claims
    });

    if (sessionError || !sessionData?.session) {
      console.error('❌ ensureTwaSession: Failed to set session', sessionError);
      return { ok: false, reason: 'set_session_failed', details: sessionError?.message };
    }

    // Verify the session was set correctly with custom claims
    const customClaims = {
      user_id: (sessionData.session as any).user_id || result.claims?.user_id,
      telegram_id: (sessionData.session as any).telegram_id || result.claims?.telegram_id,
      role: (sessionData.session as any).user_role || sessionData.session.user.app_metadata?.role,
      workspace_id: (sessionData.session as any).workspace_id || result.claims?.workspace_id
    };

    console.log('✅ ensureTwaSession: Session established successfully', {
      user_id: sessionData.session.user.id,
      provider: sessionData.session.user.app_metadata?.provider,
      custom_claims: customClaims,
    });

    // Store session and claims for debugging
    if (typeof window !== 'undefined') {
      (window as any).__SUPABASE_SESSION__ = sessionData.session;
      (window as any).__JWT_CLAIMS__ = customClaims;
      console.log('📊 Debug: Access window.__SUPABASE_SESSION__ and window.__JWT_CLAIMS__ for inspection');
    }

    return { ok: true };
  } catch (error) {
    console.error('❌ ensureTwaSession: Exception during backend authentication', error);

    // Only use fallback for network errors, not for validation failures
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.log('🔄 Network error detected, switching to client-side fallback...');
      return await clientSideAuth();
    }

    // For other errors, fail explicitly
    return {
      ok: false,
      reason: 'verify_failed',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}
