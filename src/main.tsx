import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppServicesProvider } from './context/AppServicesContext';
import { SxtAuthProvider } from './context/SxtAuthProvider';
import { LanguageProvider } from './context/LanguageContext';
import { GlobalErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './foundation/theme/ThemeProvider';
import './lib/diagnostics';
import './lib/errorHandler';
import { initializeApplicationLayer } from './application/bootstrap';
import './design-system/variables.css';
import './styles/containment.css';
import './styles/canonical-tokens.css';
import './styles/layout-engine.css';
import './theme/responsive.css';
import './shells/layout/layout.css';
import { runtimeEnvironment } from './lib/runtimeEnvironment';

// Detect runtime environment
runtimeEnvironment.detect();

console.log('🚀 Starting app...');
console.log('🌍 Environment:', runtimeEnvironment.env.type);

// Initialize Application Layer (Domain Events, etc.)
initializeApplicationLayer();

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

    // Initialize frontend-only mode (no Supabase)
    try {
      console.log('✅ Frontend-only mode active - no backend required');
      console.log(`🔧 Data Adapter Mode: ${runtimeEnvironment.getDataAdapterMode()}`);

      // Attempt to restore wallet session from localStorage
      const walletSession = localStorage.getItem('wallet_session');
      if (walletSession) {
        console.log('✅ Wallet session restored from localStorage');
      } else {
        console.log('ℹ️ No wallet session found - user will need to connect wallet or authenticate');
      }

      // Mark as initialized globally
      if (typeof window !== 'undefined') {
        (window as any).__INIT_COMPLETE__ = true;
        (window as any).__INIT_TIMESTAMP__ = Date.now();
        (window as any).__SESSION_RESTORED__ = !!walletSession;
      }
    } catch (error) {
      console.error('❌ Failed to initialize app:', error);
      throw new Error('Failed to initialize application. Please refresh the page.');
    }

    // Render the actual app
    console.log('✅ Rendering App component...');
    const useSXT = runtimeEnvironment.isSxtModeEnabled();

    root.render(
      <React.StrictMode>
        <GlobalErrorBoundary>
          <ThemeProvider defaultTheme={{ variant: 'telegramx', mode: 'dark' }}>
            <LanguageProvider>
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true
                }}
              >
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
                    <AppServicesProvider>
                      <App />
                    </AppServicesProvider>
                  </AuthProvider>
                )}
              </BrowserRouter>
            </LanguageProvider>
          </ThemeProvider>
        </GlobalErrorBoundary>
      </React.StrictMode>
    );
    console.log('✅ App rendered successfully');
  } catch (error) {
    console.error('❌ Fatal error initializing app:', error);
    const rootElement = document.getElementById('root');
    if (rootElement) {
      const errorMessage = error instanceof Error ? error.message : 'שגיאה לא ידועה';

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
            <pre style="font-size: 12px; color: #666; margin-top: 12px; overflow: auto;">${errorMessage}</pre>
          </details>
        </div>
      `;
    }
  }
})();

// Initialize viewport for responsive design
function initViewport() {
  const setVh = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  setVh();
  window.addEventListener('resize', setVh, { passive: true });
}

initViewport();
