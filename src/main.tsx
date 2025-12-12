import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppServicesProvider } from './context/AppServicesContext';
import { SupabaseReadyProvider } from './context/SupabaseReadyContext';
import { SxtAuthProvider } from './context/SxtAuthProvider';
import { LanguageProvider } from './context/LanguageContext';
import { GlobalErrorBoundary } from './components/ErrorBoundary';
import { initSupabase } from './lib/supabaseClient';
import { sessionManager } from './lib/sessionManager';
import './lib/diagnostics';
import './lib/errorHandler'; // Initialize global error handler
import './styles/containment.css';
import './styles/canonical-tokens.css';
import './theme/responsive.css';
import './shells/layout/layout.css';
import { runtimeEnvironment } from './lib/runtimeEnvironment';

// Detect runtime environment
runtimeEnvironment.detect();

console.log('🚀 Starting app...');
console.log('🌍 Environment:', runtimeEnvironment.env.type);

// FORCE CLEAR ALL CACHES AND UNREGISTER SERVICE WORKERS
(async () => {
  try {
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('🗑️ Unregistered service worker');
      }
    }

    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log(`🗑️ Deleted cache: ${cacheName}`);
      }
    }

    // Clear localStorage (except critical session data)
    const keysToPreserve = [
      'user_session',
      'twa-undergroundlab-session-backup',
      'twa-undergroundlab-session-v2', // New session manager key
      'twa-session-metadata',
      'twa-user-context',
      'twa-device-id',
      'hasVisitedBefore',
      // Preserve SxT / wallet sessions so refresh does not log users out
      'sxt_session',
      'sxt.wallet.session'
    ];

    const preservedData: Record<string, string> = {};
    keysToPreserve.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        preservedData[key] = value;
      }
    });

    localStorage.clear();

    // Restore preserved data
    Object.entries(preservedData).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });

    console.log('✅ All caches cleared');
  } catch (error) {
    console.error('⚠️ Failed to clear caches:', error);
  }
})();

// Note: ErrorBoundary moved to components/ErrorBoundary.tsx for better reusability

// Loading component
function LoadingScreen() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      padding: '20px',
      textAlign: 'center',
      direction: 'rtl',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e0e0e0;
          border-top-color: #007aff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 24px;
        }
      `}</style>
      <div className="loading-spinner" />
      <h1 style={{ fontSize: '20px', marginBottom: '16px', fontWeight: '600' }}>טוען את האפליקציה...</h1>
      <p style={{ fontSize: '14px', color: '#666' }}>אנא המתן</p>
    </div>
  );
}

// Initialize React app with async config loading
(async () => {
  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    console.log('✅ Root element found, creating React root...');
    const root = ReactDOM.createRoot(rootElement);

    // Show loading screen
    root.render(<LoadingScreen />);

    // Initialize Supabase (skipped in SxT mode)
    try {
      const useSXTRaw = (import.meta as any)?.env?.VITE_USE_SXT;
      const useSXT = (() => {
        if (useSXTRaw === undefined || useSXTRaw === null || useSXTRaw === '') return true; // default to SxT
        return ['1', 'true', 'yes'].includes(String(useSXTRaw).toLowerCase());
      })();

      let supabase: any = null;
      let restoredSession: any = null;

      if (useSXT) {
        console.log('SxT mode active — skipping Supabase initialization completely');
      } else {
        console.log('🔄 Initializing Supabase...');
        console.log('🔄 Fetching runtime configuration...');

        const buildTimeUrl = import.meta.env.VITE_SUPABASE_URL;
        const buildTimeKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (buildTimeUrl && buildTimeKey) {
          console.log('✅ Build-time config available:', {
            url: buildTimeUrl.substring(0, 30) + '...',
            keyLength: buildTimeKey.length
          });
        } else {
          console.log('⚠️ Build-time config not available, will fetch runtime config');
        }

        console.log('⏱️ [TIMING] Starting Supabase initialization at', new Date().toISOString());
        const startTime = performance.now();
        supabase = await initSupabase();
        const endTime = performance.now();
        console.log(`✅ Supabase initialized successfully in ${(endTime - startTime).toFixed(2)}ms`);

        console.log('🔄 Attempting session restoration...');
        const sessionStartTime = performance.now();
        restoredSession = await sessionManager.restoreSession(supabase);
        const sessionEndTime = performance.now();

        if (restoredSession) {
          console.log(`✅ Session restored successfully in ${(sessionEndTime - sessionStartTime).toFixed(2)}ms`);
          console.log('👤 User:', restoredSession.user.id);
        } else {
          console.log(`ℹ️ No existing session found (${(sessionEndTime - sessionStartTime).toFixed(2)}ms)`);
        }
      }

      // Mark as initialized globally
      if (typeof window !== 'undefined') {
        (window as any).__INIT_COMPLETE__ = true;
        (window as any).__INIT_TIMESTAMP__ = Date.now();
        (window as any).__SESSION_RESTORED__ = !!restoredSession;
      }
    } catch (error) {
      console.error('❌ Failed to initialize Supabase:', error);
      throw new Error('Failed to load configuration. Please check your environment variables or runtime config endpoint.');
    }

    // Render the actual app
    console.log('✅ Rendering App component...');
    const useSXTRaw = (import.meta as any)?.env?.VITE_USE_SXT;
    const useSXT = useSXTRaw === undefined || useSXTRaw === null || useSXTRaw === '' || ['1', 'true', 'yes'].includes(String(useSXTRaw).toLowerCase());

    root.render(
      <React.StrictMode>
        <GlobalErrorBoundary>
          <LanguageProvider>
            <BrowserRouter>
              {useSXT ? (
                <SxtAuthProvider>
                  <AuthProvider>
                    <AppServicesProvider>
                      <App />
                    </AppServicesProvider>
                  </AuthProvider>
                </SxtAuthProvider>
              ) : (
                <AuthProvider>
                  <SupabaseReadyProvider>
                    <AppServicesProvider>
                      <App />
                    </AppServicesProvider>
                  </SupabaseReadyProvider>
                </AuthProvider>
              )}
            </BrowserRouter>
          </LanguageProvider>
        </GlobalErrorBoundary>
      </React.StrictMode>
    );
    console.log('✅ App rendered successfully');
  } catch (error) {
    console.error('❌ Fatal error initializing app:', error);
    const rootElement = document.getElementById('root');
    if (rootElement) {
      const errorMessage = error instanceof Error ? error.message : 'שגיאה לא ידועה';
      const diagnostics = sessionManager.getDiagnostics();
      console.log('🔍 Session Diagnostics:', diagnostics);

      rootElement.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 20px; text-align: center; direction: rtl; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="font-size: 64px; margin-bottom: 24px;">⚠️</div>
          <h1 style="font-size: 24px; margin-bottom: 16px;">שגיאה בטעינת האפליקציה</h1>
          <p style="font-size: 16px; color: #666; margin-bottom: 24px; max-width: 400px;">
            ${errorMessage}
          </p>
          <button
            onclick="window.location.reload()"
            style="padding: 12px 24px; background-color: #1D9BF0; color: #fff; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; font-family: inherit;"
          >
            רענן דף
          </button>
          <details style="margin-top: 24px; max-width: 400px; text-align: left;">
            <summary style="cursor: pointer; color: #666; font-size: 14px;">Show technical details</summary>
            <pre style="font-size: 12px; color: #666; margin-top: 12px; overflow: auto;">${JSON.stringify(diagnostics, null, 2)}</pre>
          </details>
        </div>
      `;
    }
  }
})();

// Handle Telegram WebApp lifecycle
function initTelegramWebApp() {
  console.log('🎬 Checking Telegram WebApp...');
  console.log('📊 Environment Check:', {
    hasTelegram: !!window.Telegram,
    hasWebApp: !!window.Telegram?.WebApp,
    userAgent: navigator.userAgent,
    location: window.location.href
  });

  if (!window.Telegram?.WebApp) {
    console.log('⚠️ Telegram WebApp not available yet, will retry...');
    return false;
  }

  const tg = window.Telegram.WebApp;

  // CRITICAL DEBUG INFO
  console.log('🔍 TELEGRAM WEBAPP DEBUG:', {
    version: tg.version,
    platform: tg.platform,
    colorScheme: tg.colorScheme,
    isExpanded: tg.isExpanded,
    viewportHeight: tg.viewportHeight,
    viewportStableHeight: tg.viewportStableHeight,
    hasInitData: !!tg.initData,
    initDataLength: tg.initData?.length || 0,
    initData: tg.initData || 'EMPTY',
    hasInitDataUnsafe: !!tg.initDataUnsafe,
    initDataUnsafe: tg.initDataUnsafe,
    hasUser: !!tg.initDataUnsafe?.user,
    user: tg.initDataUnsafe?.user || 'NO USER',
    themeParams: tg.themeParams
  });

  // Check if initData is empty (warning, not error - TelegramAuth will handle gracefully)
  if (!tg.initData || tg.initData.length === 0) {
    console.warn('⚠️ initData is EMPTY - This is expected when:');
    console.warn('   1. Opening app in regular browser (not Telegram)');
    console.warn('   2. Bot not configured in BotFather');
    console.warn('   3. App URL doesn\'t match BotFather settings');
    console.warn('   TelegramAuth component will handle this gracefully');

    // Don't block the app - let TelegramAuth component handle fallback
    // It will show the Telegram Login Widget or browser mode
  }

  // Check if user data exists (info only)
  if (!tg.initDataUnsafe?.user) {
    console.info('ℹ️ No user in initDataUnsafe - TelegramAuth will handle authentication');
  }

  // Initialize Telegram WebApp
  tg.ready();
  tg.expand();
  console.log('✅ Telegram WebApp ready and expanded');

  // Set theme colors
  if (tg.themeParams) {
    const root = document.documentElement;
    Object.entries(tg.themeParams).forEach(([key, value]) => {
      if (value) {
        root.style.setProperty(`--tg-theme-${key.replace(/_/g, '-')}`, value);
      }
    });
    console.log('✅ Theme colors applied');
  }

  // Handle viewport changes
  const handleViewportChange = () => {
    const vh = tg.viewportStableHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  handleViewportChange();
  window.addEventListener('resize', handleViewportChange, { passive: true });

  // Handle theme changes
  tg.onEvent('themeChanged', () => {
    if (tg.themeParams) {
      const root = document.documentElement;
      Object.entries(tg.themeParams).forEach(([key, value]) => {
        if (value) {
          root.style.setProperty(`--tg-theme-${key.replace(/_/g, '-')}`, value);
        }
      });
    }
  });

  return true;
}

// Try to initialize immediately
if (!initTelegramWebApp()) {
  // If not available, wait for script to load
  console.log('⏳ Waiting for Telegram SDK to load...');
  let retries = 0;
  const maxRetries = 10;
  const retryInterval = setInterval(() => {
    retries++;
    console.log(`🔄 Retry ${retries}/${maxRetries}...`);

    if (initTelegramWebApp()) {
      clearInterval(retryInterval);
      console.log('✅ Telegram SDK loaded successfully');
    } else if (retries >= maxRetries) {
      clearInterval(retryInterval);
      console.warn('⚠️ Telegram SDK failed to load after max retries - app will run in browser mode');
    }
  }, 100);
}
