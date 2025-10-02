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
  
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  // If not in Telegram environment OR no Supabase URL, use mock config
  if (!telegram.isTelegramEnv || !SUPABASE_URL) {
    debugLog.warn('⚠️ Using mock config', {
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

  // Use direct Telegram user auth (bypass verification for now)
  if (telegramUser) {
    debugLog.info('👤 Using direct Telegram user', {
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

    debugLog.success('✅ Direct auth bypass', { username: directUser.username });

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

  // DEV MODE: Create test user for browser testing
  debugLog.warn('⚠️ No Telegram user - creating DEV test user');
  const devUser = {
    telegram_id: '999999',
    username: 'dev_manager',
    first_name: 'Dev',
    last_name: 'Manager',
    photo_url: undefined,
    language_code: 'he',
    auth_date: Math.floor(Date.now() / 1000)
  };

  debugLog.info('🧪 DEV MODE: Using test manager account', { username: devUser.username });

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
    user: devUser,
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