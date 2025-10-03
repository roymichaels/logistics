import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log('🚀 Starting app...');

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

    // Clear localStorage (except user session)
    const sessionData = localStorage.getItem('user_session');
    localStorage.clear();
    if (sessionData) {
      localStorage.setItem('user_session', sessionData);
    }

    console.log('✅ All caches cleared');
  } catch (error) {
    console.error('⚠️ Failed to clear caches:', error);
  }
})();

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
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
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>⚠️</div>
          <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>משהו השתבש</h1>
          <p style={{ fontSize: '16px', color: '#666', marginBottom: '24px', maxWidth: '400px' }}>
            {this.state.error?.message || 'שגיאה לא צפויה'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#007aff',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            רענן דף
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Initialize React app
try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  console.log('✅ Root element found, creating React root...');
  const root = ReactDOM.createRoot(rootElement);

  console.log('✅ Rendering App component...');
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
  console.log('✅ App rendered successfully');
} catch (error) {
  console.error('❌ Fatal error initializing app:', error);
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 20px; text-align: center; direction: rtl; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="font-size: 64px; margin-bottom: 24px;">⚠️</div>
        <h1 style="font-size: 24px; margin-bottom: 16px;">שגיאה בטעינת האפליקציה</h1>
        <p style="font-size: 16px; color: #666; margin-bottom: 24px; max-width: 400px;">
          ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}
        </p>
        <button
          onclick="window.location.reload()"
          style="padding: 12px 24px; background-color: #007aff; color: #fff; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; font-family: inherit;"
        >
          רענן דף
        </button>
      </div>
    `;
  }
}

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

  // CRITICAL: Check if initData is empty
  if (!tg.initData || tg.initData.length === 0) {
    console.error('🚨 CRITICAL: initData is EMPTY! This means:');
    console.error('   1. Bot is not configured correctly in BotFather');
    console.error('   2. App URL doesn\'t match BotFather settings');
    console.error('   3. App is opened in wrong context');

    // Show error to user
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 20px; text-align: center; direction: rtl; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a1a; color: #fff;">
          <div style="font-size: 64px; margin-bottom: 24px;">🚨</div>
          <h1 style="font-size: 24px; margin-bottom: 16px; color: #ff3b30;">שגיאת אתחול Telegram</h1>
          <p style="font-size: 16px; color: #999; margin-bottom: 24px; max-width: 400px;">
            initData ריק - הבוט לא מוגדר כראוי ב-BotFather
          </p>
          <details style="background: #2a2a2a; padding: 16px; border-radius: 8px; text-align: left; font-family: monospace; font-size: 12px; max-width: 90%; overflow: auto;">
            <summary style="cursor: pointer; color: #007aff; margin-bottom: 8px;">Debug Info</summary>
            <pre style="white-space: pre-wrap; word-break: break-all;">${JSON.stringify({
              version: tg.version,
              platform: tg.platform,
              initData: tg.initData || 'EMPTY',
              initDataUnsafe: tg.initDataUnsafe,
              location: window.location.href
            }, null, 2)}</pre>
          </details>
        </div>
      `;
    }
    return false;
  }

  // Check if user data exists
  if (!tg.initDataUnsafe?.user) {
    console.error('🚨 CRITICAL: No user in initDataUnsafe!');
    console.error('   initDataUnsafe:', tg.initDataUnsafe);
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
  window.addEventListener('resize', handleViewportChange);

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