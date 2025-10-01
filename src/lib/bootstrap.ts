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

  // If no initData available, fall back to mock
  if (!initData) {
    debugLog.warn('⚠️ No initData - using mock', {
      hasTelegramUser: !!telegramUser,
      userId: telegramUser?.id
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

  // Step 1: Verify init data and get session
  try {
    debugLog.info('🔐 Verifying initData with Supabase...');
    const verifyResponse = await fetch(`${SUPABASE_URL}/functions/v1/telegram-verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'webapp',
        initData
      }),
    });
    debugLog.info(`📥 Verify response: ${verifyResponse.status}`);

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