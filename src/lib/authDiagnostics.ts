/**
 * AUTHENTICATION DIAGNOSTICS
 *
 * Comprehensive diagnostics for Telegram authentication and JWT claims flow.
 * Use this to debug authentication issues in the console.
 */

import { getSupabase } from './supabaseClient';

export interface DiagnosticResult {
  timestamp: string;
  checks: {
    telegramData: { status: 'pass' | 'fail' | 'skip'; details: any };
    session: { status: 'pass' | 'fail'; details: any };
    jwtClaims: { status: 'pass' | 'fail'; details: any };
    userRecord: { status: 'pass' | 'fail' | 'skip'; details: any };
  };
  summary: string;
  recommendations: string[];
}

export async function runAuthDiagnostics(): Promise<DiagnosticResult> {
  console.log('🔍 Running authentication diagnostics...');

  const result: DiagnosticResult = {
    timestamp: new Date().toISOString(),
    checks: {
      telegramData: { status: 'skip', details: {} },
      session: { status: 'fail', details: {} },
      jwtClaims: { status: 'fail', details: {} },
      userRecord: { status: 'skip', details: {} }
    },
    summary: '',
    recommendations: []
  };

  // Check 1: Telegram WebApp data
  console.log('\n📱 Check 1: Telegram WebApp Data');
  try {
    const WebApp = (window as any)?.Telegram?.WebApp;
    if (WebApp) {
      const initData = WebApp.initData || '';
      const user = WebApp.initDataUnsafe?.user;

      result.checks.telegramData = {
        status: initData && user ? 'pass' : 'fail',
        details: {
          hasInitData: !!initData,
          initDataLength: initData.length,
          hasUser: !!user,
          userId: user?.id,
          username: user?.username,
          firstName: user?.first_name
        }
      };

      if (initData && user) {
        console.log('✅ Telegram data available', result.checks.telegramData.details);
      } else {
        console.error('❌ Telegram data missing or incomplete', result.checks.telegramData.details);
        result.recommendations.push('App must be opened from Telegram to access WebApp data');
      }
    } else {
      result.checks.telegramData.status = 'fail';
      result.checks.telegramData.details = { error: 'Telegram WebApp SDK not loaded' };
      console.error('❌ Telegram WebApp SDK not available');
      result.recommendations.push('Ensure app is running inside Telegram Mini App');
    }
  } catch (err) {
    result.checks.telegramData.status = 'fail';
    result.checks.telegramData.details = { error: String(err) };
    console.error('❌ Error checking Telegram data', err);
  }

  // Check 2: Supabase session
  console.log('\n🔐 Check 2: Supabase Session');
  const supabase = getSupabase();
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      result.checks.session = {
        status: 'fail',
        details: { error: error.message }
      };
      console.error('❌ Session error', error);
      result.recommendations.push('Check Supabase configuration and network connectivity');
    } else if (!session) {
      result.checks.session = {
        status: 'fail',
        details: { error: 'No active session' }
      };
      console.error('❌ No active session');
      result.recommendations.push('Authentication may have failed - check browser console for errors');
    } else {
      result.checks.session = {
        status: 'pass',
        details: {
          userId: session.user.id,
          email: session.user.email,
          provider: session.user.app_metadata?.provider,
          expiresAt: session.expires_at
        }
      };
      console.log('✅ Session active', result.checks.session.details);

      // Check 3: JWT Claims
      console.log('\n🎫 Check 3: JWT Custom Claims');
      try {
        const payload = JSON.parse(atob(session.access_token.split('.')[1]));

        const claims = {
          user_id: payload.user_id,
          telegram_id: payload.telegram_id,
          user_role: payload.user_role,
          app_role: payload.app_role,
          workspace_id: payload.workspace_id,
          provider: payload.app_metadata?.provider
        };

        const requiredClaims = ['user_id', 'telegram_id', 'user_role'];
        const missingClaims = requiredClaims.filter(c => !claims[c as keyof typeof claims]);

        result.checks.jwtClaims = {
          status: missingClaims.length === 0 ? 'pass' : 'fail',
          details: {
            claims,
            missingClaims,
            hasAllRequired: missingClaims.length === 0
          }
        };

        if (missingClaims.length === 0) {
          console.log('✅ All required JWT claims present', claims);
        } else {
          console.error('❌ Missing JWT claims:', missingClaims);
          console.log('Available claims:', claims);
          result.recommendations.push('JWT missing custom claims - telegram-verify Edge Function may have failed');
          result.recommendations.push('Check Supabase Edge Function logs for telegram-verify errors');
        }

        // Store for debugging
        if (typeof window !== 'undefined') {
          (window as any).__JWT_PAYLOAD__ = payload;
          (window as any).__JWT_CLAIMS__ = claims;
        }
      } catch (err) {
        result.checks.jwtClaims = {
          status: 'fail',
          details: { error: 'Could not decode JWT', message: String(err) }
        };
        console.error('❌ Failed to decode JWT', err);
        result.recommendations.push('JWT token may be malformed or corrupted');
      }

      // Check 4: User record in database
      console.log('\n👤 Check 4: User Record');
      try {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, telegram_id, username, name, role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (userError) {
          result.checks.userRecord = {
            status: 'fail',
            details: { error: userError.message }
          };
          console.error('❌ Error fetching user record', userError);
          result.recommendations.push('Check RLS policies on users table');
        } else if (!user) {
          result.checks.userRecord = {
            status: 'fail',
            details: { error: 'User record not found in database' }
          };
          console.error('❌ User record not found');
          result.recommendations.push('User record missing - authentication may have failed to create user');
        } else {
          result.checks.userRecord = {
            status: 'pass',
            details: user
          };
          console.log('✅ User record found', user);
        }
      } catch (err) {
        result.checks.userRecord = {
          status: 'fail',
          details: { error: String(err) }
        };
        console.error('❌ Exception fetching user record', err);
      }
    }
  } catch (err) {
    console.error('❌ Error during session check', err);
  }

  // Generate summary
  const statuses = Object.values(result.checks)
    .filter(c => c.status !== 'skip')
    .map(c => c.status);

  const passCount = statuses.filter(s => s === 'pass').length;
  const totalCount = statuses.length;

  if (passCount === totalCount) {
    result.summary = '✅ All checks passed - authentication is working correctly';
  } else if (passCount === 0) {
    result.summary = '❌ All checks failed - authentication is not working';
  } else {
    result.summary = `⚠️ ${passCount}/${totalCount} checks passed - authentication is partially working`;
  }

  console.log('\n' + '='.repeat(60));
  console.log(result.summary);
  console.log('='.repeat(60));

  if (result.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    result.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
  }

  console.log('\n📊 Full diagnostic result stored in window.__AUTH_DIAGNOSTICS__');
  if (typeof window !== 'undefined') {
    (window as any).__AUTH_DIAGNOSTICS__ = result;
  }

  return result;
}

// Export for console access
if (typeof window !== 'undefined') {
  (window as any).runAuthDiagnostics = runAuthDiagnostics;
  console.log('💡 Tip: Run window.runAuthDiagnostics() to check authentication status');
}
