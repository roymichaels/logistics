import { BootstrapConfig } from '../../data/types';
import { telegram } from '../../lib/telegram';

interface BootstrapResult {
  config: BootstrapConfig;
  user: any | null;
}

// Import debugLog - use lazy import inside function
async function getDebugLog() {
  try {
    const module = await import('../components/DebugPanel');
    return module.debugLog;
  } catch (e) {
    // Fallback if DebugPanel not available
    return {
      info: console.log,
      warn: console.warn,
      error: console.error,
      success: console.log
    };
  }
}

export async function bootstrap(userData?: any): Promise<BootstrapResult> {
  const debugLog = await getDebugLog();

  debugLog.info('🔧 Bootstrap: Starting...', {
    isTelegramEnv: telegram.isTelegramEnv,
    hasUserData: !!userData
  });

  // Clear all caches on startup to force fresh data
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      debugLog.info('🗑️ Cleared all caches');
    }
  } catch (error) {
    debugLog.warn('⚠️ Failed to clear caches', error);
  }

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  // Check for stored session first (for page refreshes)
  // NOTE: We only restore telegram_id for session continuity, NOT the role
  // The role will be fetched fresh from the database by the DataStore
  let storedTelegramId: string | null = null;
  if (!userData) {
    try {
      const storedSession = localStorage.getItem('user_session');
      if (storedSession) {
        const sessionData = JSON.parse(storedSession);
        const sessionAge = Date.now() - sessionData.timestamp;

        // Session valid for 24 hours
        if (sessionAge < 24 * 60 * 60 * 1000) {
          debugLog.info('📦 Restoring session from localStorage');
          storedTelegramId = sessionData.user?.telegram_id || null;
          // Only restore basic user data, role will be fetched fresh
          userData = {
            telegram_id: sessionData.user?.telegram_id,
            username: sessionData.user?.username,
            first_name: sessionData.user?.first_name,
            last_name: sessionData.user?.last_name,
            photo_url: sessionData.user?.photo_url,
            language_code: sessionData.user?.language_code,
            auth_date: sessionData.user?.auth_date,
            // Explicitly DO NOT restore role - let DataStore fetch it fresh
          };
        } else {
          debugLog.info('⏰ Stored session expired, clearing');
          localStorage.removeItem('user_session');
        }
      }
    } catch (error) {
      debugLog.warn('⚠️ Failed to restore session', error);
      localStorage.removeItem('user_session');
    }
  }

  // If we have userData from stored session and Supabase is available, use it
  if (userData && SUPABASE_URL) {
    debugLog.info('✅ Using stored session with Supabase', {
      telegram_id: userData.telegram_id,
      note: 'Role will be fetched fresh from database'
    });
    return {
      config: {
        app: 'miniapp',
        adapters: { data: 'supabase' },
        features: {
          offline_mode: true,
          photo_upload: true,
          gps_tracking: true,
          route_optimization: false,
        },
        ui: {
          brand: 'מערכת לוגיסטיקה',
          accent: '#007aff',
          theme: 'auto',
          language: 'he'
        },
        defaults: {
          mode: 'real' as const,
        },
      },
      user: userData,
    };
  }

  // 🧪 BROWSER FALLBACK MODE FOR DEBUGGING
  // If not in Telegram environment, create a test user
  if (!telegram.isTelegramEnv && SUPABASE_URL) {
    debugLog.warn('🌐 Running in BROWSER MODE - using test user', {
      isTelegramEnv: telegram.isTelegramEnv,
      hasSupabaseUrl: !!SUPABASE_URL,
      note: 'This is for debugging only'
    });

    // Create a test user for browser mode
    const testUser = {
      telegram_id: '999999999', // Test ID
      username: 'test_browser_user',
      first_name: 'Test',
      last_name: 'User',
      language_code: 'he',
      auth_date: Date.now()
    };

    return {
      config: {
        app: 'miniapp',
        adapters: { data: 'supabase' },
        features: {
          offline_mode: true,
          photo_upload: true,
          gps_tracking: true,
          route_optimization: false,
        },
        ui: {
          brand: 'מערכת לוגיסטיקה (Browser Mode)',
          accent: '#007aff',
          theme: 'auto',
          language: 'he'
        },
        defaults: {
          mode: 'real' as const,
        },
      },
      user: testUser,
    };
  }

  // If no Supabase URL at all, use mock config
  if (!SUPABASE_URL) {
    debugLog.warn('⚠️ Using mock config - no Supabase URL', {
      isTelegramEnv: telegram.isTelegramEnv,
      hasSupabaseUrl: !!SUPABASE_URL
    });
    return {
      config: {
        app: 'miniapp',
        adapters: { data: 'mock' },
        features: {
          offline_mode: true,
          photo_upload: true,
          gps_tracking: true,
          route_optimization: false,
        },
        ui: {
          brand: 'מערכת לוגיסטיקה',
          accent: '#007aff',
          theme: 'auto',
          language: 'he'
        },
        defaults: {
          mode: 'real' as const,
        },
      },
      user: userData || null,
    };
  }
  
  const initData = telegram.initData;
  const telegramUser = telegram.user;

  // Auto-authenticate users from Telegram app
  if (telegramUser) {
    debugLog.info('👤 Telegram user detected - auto login', {
      id: telegramUser.id,
      username: telegramUser.username
    });

    const directUser = {
      telegram_id: telegramUser.id.toString(),
      username: telegramUser.username?.replace(/^@/, '').toLowerCase(),
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name,
      photo_url: telegramUser.photo_url,
      language_code: telegramUser.language_code,
      auth_date: Math.floor(Date.now() / 1000)
    };

    // Store session for page refreshes
    try {
      localStorage.setItem('user_session', JSON.stringify({
        user: directUser,
        timestamp: Date.now()
      }));
      debugLog.info('💾 Session stored to localStorage');
    } catch (error) {
      debugLog.warn('⚠️ Failed to store session', error);
    }

    debugLog.success('✅ Telegram user authenticated', { username: directUser.username });

    return {
      config: {
        app: 'miniapp',
        adapters: { data: 'supabase' },
        features: {
          offline_mode: true,
          photo_upload: true,
          gps_tracking: true,
          route_optimization: false,
        },
        ui: {
          brand: 'מערכת לוגיסטיקה',
          accent: '#007aff',
          theme: 'auto',
          language: 'he'
        },
        defaults: {
          mode: 'real' as const,
        },
      },
      user: directUser,
    };
  }

  // Web users need to authenticate via Telegram SSO
  debugLog.info('🌐 Web user - authentication required');
  return {
    config: {
      app: 'miniapp',
      adapters: { data: 'supabase' },
      features: {
        offline_mode: true,
        photo_upload: true,
        gps_tracking: true,
        route_optimization: false,
      },
      ui: {
        brand: 'מערכת לוגיסטיקה',
        accent: '#007aff',
        theme: 'auto',
        language: 'he'
      },
      defaults: {
        mode: 'real' as const,
      },
    },
    user: null,
  };

  // Step 1: Verify init data and get session
  try {
    debugLog.info('🔐 Verifying initData with Supabase...');

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    let verifyResponse;
    try {
      verifyResponse = await fetch(`${SUPABASE_URL}/functions/v1/telegram-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'webapp',
          initData
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      debugLog.info(`📥 Verify response: ${verifyResponse.status}`);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        debugLog.error('⏱️ Verification timeout (10s)', { error: 'Request timed out' });
      } else {
        debugLog.error('🌐 Network error during verification', fetchError);
      }
      throw fetchError;
    }

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      debugLog.error('❌ Verification failed', {
        status: verifyResponse.status,
        error: errorText
      });
      return {
        config: {
          app: 'miniapp',
          adapters: { data: 'mock' },
          features: {
            offline_mode: true,
            photo_upload: true,
            gps_tracking: true,
            route_optimization: false,
          },
          ui: {
            brand: 'מערכת לוגיסטיקה',
            accent: '#007aff',
            theme: 'auto',
            language: 'he'
          },
          defaults: {
            mode: 'real' as const,
          },
        },
        user: null,
      };
    }

    const verifyData = await verifyResponse.json();
    debugLog.info('📦 Verify data received', {
      ok: verifyData.ok,
      hasUser: !!verifyData.user,
      username: verifyData.user?.username
    });
    const { ok, user, session, supabase_user } = verifyData;

    if (!ok || !user) {
      debugLog.error('❌ Invalid auth response', verifyData);
      return {
        config: {
          app: 'miniapp',
          adapters: { data: 'mock' },
          features: {
            offline_mode: true,
            photo_upload: true,
            gps_tracking: true,
            route_optimization: false,
          },
          ui: {
            brand: 'מערכת לוגיסטיקה',
            accent: '#007aff',
            theme: 'auto',
            language: 'he'
          },
          defaults: {
            mode: 'real' as const,
          },
        },
        user: null,
      };
    }

    const enrichedUser = {
      ...user,
      supabase_user: supabase_user ?? null,
      auth_token: session?.access_token ?? null,
      refresh_token: session?.refresh_token ?? null,
      auth_session: session
        ? {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_in: session.expires_in ?? null,
            expires_at: session.expires_at ?? null,
            token_type: session.token_type ?? 'bearer'
          }
        : null
    };

    // Step 2: Get bootstrap configuration
    debugLog.info('⚙️ Getting bootstrap config...', {
      telegram_id: user.telegram_id,
      username: user.username
    });
    const bootstrapResponse = await fetch(`${SUPABASE_URL}/functions/v1/bootstrap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        telegram_id: user.telegram_id,
        username: user.username
      }),
    });

    if (!bootstrapResponse.ok) {
      debugLog.warn('⚠️ Bootstrap config failed, using defaults');
      return {
        config: {
          app: 'miniapp',
          adapters: { data: 'mock' },
          features: {
            offline_mode: true,
            photo_upload: true,
            gps_tracking: true,
            route_optimization: false,
          },
          ui: {
            brand: 'מערכת לוגיסטיקה',
            accent: '#007aff',
            theme: 'auto',
            language: 'he'
          },
          defaults: {
            mode: 'real' as const,
          },
        },
        user: enrichedUser,
      };
    }

    const data = await bootstrapResponse.json();
    const config: BootstrapConfig = data.config || data;

    debugLog.success('✅ Bootstrap complete!', {
      adapter: config.adapters.data,
      hasUser: !!enrichedUser
    });

    return {
      config,
      user: enrichedUser,
    };
  } catch (error) {
    debugLog.error('❌ Bootstrap error', error);
    return {
      config: {
        app: 'miniapp',
        adapters: { data: 'mock' },
        features: {
          offline_mode: true,
          photo_upload: true,
          gps_tracking: true,
          route_optimization: false,
        },
        ui: {
          brand: 'מערכת לוגיסטיקה',
          accent: '#007aff',
          theme: 'auto',
          language: 'he'
        },
        defaults: {
          mode: 'real' as const,
        },
      },
      user: null,
    };
  }
}