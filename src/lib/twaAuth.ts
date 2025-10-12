import { getSupabase, loadConfig, isSupabaseInitialized, initSupabase } from './supabaseClient';

export type TwaAuthResult =
  | { ok: true }
  | { ok: false; reason: 'no_init_data' | 'verify_failed' | 'tokens_missing' | 'set_session_failed'; details?: string };

// Global deduplication for ensureTwaSession to prevent double calls in React StrictMode
let authInProgress: Promise<TwaAuthResult> | null = null;

export async function ensureTwaSession(): Promise<TwaAuthResult> {
  // Deduplicate concurrent calls (critical for React StrictMode double render)
  if (authInProgress) {
    console.log('⏳ ensureTwaSession: Authentication already in progress, waiting for existing call...');
    return authInProgress;
  }

  // Start new authentication and store promise for deduplication
  authInProgress = (async (): Promise<TwaAuthResult> => {
    try {
      console.log('🔐 ensureTwaSession: Starting authentication check');

      // Wait for Supabase client to be initialized (should already be done by main.tsx)
      // This is a safety check with timeout
      const maxWaitTime = 5000; // 5 seconds max wait
      const startWait = Date.now();

      while (!isSupabaseInitialized()) {
        if (Date.now() - startWait > maxWaitTime) {
          console.error('❌ ensureTwaSession: Timeout waiting for Supabase initialization');
          return {
            ok: false,
            reason: 'verify_failed',
            details: 'Supabase initialization timeout. This should not happen - main.tsx should initialize before AppServicesProvider.'
          };
        }

        console.log('⏳ Supabase not yet initialized, waiting...');
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('✅ Supabase client confirmed initialized');

      // Get Supabase client (guaranteed to be initialized now)
      let supabase;
      try {
        supabase = getSupabase();
      } catch (error) {
        console.error('❌ ensureTwaSession: Supabase client not available', error);
        return {
          ok: false,
          reason: 'verify_failed',
          details: 'Supabase client not available. This should not happen after initialization.'
        };
      }

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

      // Load runtime configuration
      let supabaseUrl: string;
      try {
        const config = await loadConfig();
        supabaseUrl = config.supabaseUrl;
      } catch (error) {
        console.error('❌ ensureTwaSession: Failed to load configuration', error);
        return { ok: false, reason: 'verify_failed', details: 'Failed to load configuration' };
      }

      if (!supabaseUrl) {
        console.error('❌ ensureTwaSession: No SUPABASE_URL in configuration');
        return { ok: false, reason: 'verify_failed', details: 'Missing SUPABASE_URL' };
      }

      // Single authentication attempt - no retries on 401 errors
      console.log('📡 Calling telegram-verify:', {
        url: `${supabaseUrl}/functions/v1/telegram-verify`,
        hasInitData: initData.length > 0,
        initDataLength: initData.length,
        initDataPreview: initData.substring(0, 50) + '...'
      });

      let lastError: any = null;

      try {
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

          // Store error details
          lastError = {
            status: response.status,
            statusText: response.statusText,
            error: errorData.error
          };

          // Provide specific error messages based on status code
          if (response.status === 401) {
            const errorMsg = 'אימות Telegram נכשל\n\n' +
                           'הסיבות האפשריות:\n' +
                           '1. טוקן הבוט לא מוגדר ב-Supabase\n' +
                           '2. טוקן הבוט שגוי או לא תואם\n' +
                           '3. נתוני ההתחברות פגו (יותר מ-24 שעות)\n\n' +
                           'פתרון: סגור את האפליקציה ופתח מחדש מטלגרם';
            return { ok: false, reason: 'verify_failed', details: errorMsg };
          } else if (response.status >= 500) {
            return { ok: false, reason: 'verify_failed', details: 'שגיאת שרת. נסה שוב בעוד כמה רגעים' };
          }

          return { ok: false, reason: 'verify_failed', details: errorData.error || 'אימות נכשל' };
        }

          const result = await response.json();
          console.log('📦 ensureTwaSession: Backend response received', {
            ok: result.ok,
            has_session: !!result.session,
            has_access_token: !!result.session?.access_token,
            has_claims: !!result.claims,
            attempt: attempt + 1
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
            refresh_token: access_token,
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

        const errorMsg = 'שגיאת תקשורת\n\n' +
                        'לא הצלחנו להתחבר לשרת.\n' +
                        'בדוק את החיבור לאינטרנט ונסה שוב.';

        return {
          ok: false,
          reason: 'verify_failed',
          details: errorMsg
        };
      }
    } finally {
      // Clear the in-progress flag when done (success or failure)
      authInProgress = null;
    }
  })();

  return authInProgress;
}
