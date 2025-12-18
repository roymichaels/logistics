import { BootstrapConfig } from '../data/types';

import { logger } from './logger';

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
    // Fallback if DebugPanel not available - use logger
    return {
      info: logger.info.bind(logger),
      warn: logger.warn.bind(logger),
      error: logger.error.bind(logger),
      success: logger.info.bind(logger)
    };
  }
}

export async function bootstrap(userData?: any): Promise<BootstrapResult> {
  const debugLog = await getDebugLog();

  debugLog.info('🔧 Bootstrap: Starting...', {
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
  if (!userData) {
    try {
      const storedSession = localStorage.getItem('user_session');
      if (storedSession) {
        const sessionData = JSON.parse(storedSession);
        const sessionAge = Date.now() - sessionData.timestamp;

        // Session valid for 24 hours
        if (sessionAge < 24 * 60 * 60 * 1000) {
          debugLog.info('📦 Restoring session from localStorage');
          userData = sessionData.user;
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
      userId: userData.id || userData.wallet_address,
      username: userData.username
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
          brand: 'Logistics System',
          accent: '#007aff',
          theme: 'auto',
          language: 'en'
        },
        defaults: {
          mode: 'real' as const,
        },
      },
      user: userData,
    };
  }

  // User needs to authenticate
  if (SUPABASE_URL) {
    debugLog.info('🔑 Authentication required');
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
          brand: 'Logistics System',
          accent: '#007aff',
          theme: 'auto',
          language: 'en'
        },
        defaults: {
          mode: 'real' as const,
        },
      },
      user: null,
    };
  }

  // If no Supabase URL at all, use mock config
  debugLog.error('🚨 CRITICAL: Missing VITE_SUPABASE_URL environment variable!');
  debugLog.error('🚨 Mock mode has limited functionality!');
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
        brand: 'Logistics System',
        accent: '#007aff',
        theme: 'auto',
        language: 'en'
      },
      defaults: {
        mode: 'real' as const,
      },
    },
    user: userData || null,
  };
}