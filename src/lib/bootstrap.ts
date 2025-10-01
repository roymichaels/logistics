import { BootstrapConfig } from '../../data/types';
import { telegram } from '../../lib/telegram';

interface BootstrapResult {
  config: BootstrapConfig;
  user: any | null;
}

export async function bootstrap(userData?: any): Promise<BootstrapResult> {
  console.log('Bootstrap: isTelegramEnv =', telegram.isTelegramEnv);
  
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  
  // If not in Telegram environment OR no Supabase URL, use mock config
  if (!telegram.isTelegramEnv || !SUPABASE_URL) {
    // Return mock configuration for development/browser environment
    console.log('Bootstrap: Using mock config for development');
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
    console.log('Bootstrap: No initData available, using mock config');
    console.log('Bootstrap: telegram.user =', telegramUser);
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
    console.log('Bootstrap: Verifying with Supabase...', { initData: initData?.substring(0, 50) + '...' });
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
    console.log('Bootstrap: Verify response status:', verifyResponse.status);

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      console.warn('Telegram verification failed:', verifyResponse.status, errorText);
      console.warn('Falling back to mock mode');
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
    console.log('Bootstrap: Verify response data:', { ok: verifyData.ok, hasUser: !!verifyData.user });
    const { ok, user, session, supabase_user } = verifyData;

    if (!ok || !user) {
      console.warn('Invalid authentication response:', verifyData);
      console.warn('Falling back to mock mode');
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
    const bootstrapResponse = await fetch(`${SUPABASE_URL}/functions/v1/bootstrap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        telegram_id: user.telegram_id
      }),
    });

    if (!bootstrapResponse.ok) {
      console.warn('Bootstrap failed, using default config');
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

    return {
      config,
      user: enrichedUser,
    };
  } catch (error) {
    console.warn('Network error during authentication, falling back to mock mode:', error);
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