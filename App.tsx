import React, { useState, useEffect } from 'react';
import { telegram } from './lib/telegram';
import { bootstrap } from './src/lib/bootstrap';
import { createFrontendDataStore } from './src/lib/frontendDataStore';
import { DataStore, BootstrapConfig } from './data/types';
import { BottomNavigation } from './src/components/BottomNavigation';
import { TelegramAuth } from './src/components/TelegramAuth';
import { hebrew } from './src/lib/hebrew';

// Pages
import { Dashboard } from './pages/Dashboard';
import { Orders } from './pages/Orders';
import { Tasks } from './pages/Tasks';
import { Settings } from './pages/Settings';
import { UserManagement } from './pages/UserManagement';

type Page = 'dashboard' | 'orders' | 'tasks' | 'settings' | 'products' | 'deliveries' | 'route' | 'customers' | 'reports' | 'users';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [dataStore, setDataStore] = useState<DataStore | null>(null);
  const [config, setConfig] = useState<BootstrapConfig | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'manager' | 'dispatcher' | 'driver' | 'warehouse' | 'sales' | 'customer_service' | null>(null);

  // Derived state for login status
  const isLoggedIn = user !== null;

  const theme = telegram.themeParams;

  useEffect(() => {
    initializeApp();
  }, []);

  // Apply theme to body
  useEffect(() => {
    document.body.style.backgroundColor = theme.bg_color || '#ffffff';
    document.body.style.color = theme.text_color || '#000000';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  }, [theme]);

  const initializeApp = async () => {
    try {
      // Bootstrap from server
      const result = await bootstrap();
      setConfig(result.config);
      setUser(result.user);
      
      // Create data store in real mode
      const store = createFrontendDataStore(result.config, 'real', result.user);
      setDataStore(store);
      
      // Get user role from store
      if (store) {
        try {
          const profile = await store.getProfile();
          setUserRole(profile.role);
        } catch (error) {
          console.warn('Failed to get user profile:', error);
          setUserRole('manager'); // Default fallback
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('App initialization failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to initialize app');
      setLoading(false);
    }
  };

  const handleLogin = async (userData: any) => {
    try {
      console.log('Authenticating user:', userData);
      
      // Allow all users to log in for now
      // TODO: Re-enable approval system when needed
      // if (!userData.isFirstAdmin && !userData.isApproved) {
      //   setError('חשבונך ממתין לאישור מהמנהל. אנא פנה למנהל המערכת.');
      //   return;
      // }
      
      setUser(userData);
      
      // Create data store in real mode
      const store = createFrontendDataStore(config!, 'real', userData);
      setDataStore(store);
      
      // Get user role from store
      if (store) {
        try {
          const profile = await store.getProfile();
          setUserRole(profile.role);
        } catch (error) {
          console.warn('Failed to get user profile:', error);
          setUserRole('manager'); // Default fallback
        }
      }
    } catch (error) {
      console.error('Login failed:', error);
      setError(error instanceof Error ? error.message : 'שגיאה בהתחברות');
    }
  };

  const handleAuthError = (error: string) => {
    console.error('Authentication error:', error);
    setError(error);
    setLoading(false);
  };

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
    telegram.hapticFeedback('selection');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: theme.bg_color,
        color: theme.text_color,
        fontSize: '16px'
      }}>
        {hebrew.loading}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: theme.bg_color,
        color: theme.text_color,
        padding: '20px',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>⚠️ Error</h1>
        <p style={{ fontSize: '16px', marginBottom: '24px', direction: 'rtl' }}>{error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '12px 24px',
            backgroundColor: theme.button_color,
            color: theme.button_text_color,
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          נסה שוב
        </button>
      </div>
    );
  }

  // Show login screen if not logged in
  if (!isLoggedIn) {
    return <TelegramAuth onAuth={handleLogin} onError={handleAuthError} />;
  }

  if (!dataStore) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: theme.bg_color,
        color: theme.text_color,
        fontSize: '16px'
      }}>
        מכין את המערכת...
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'orders':
        return <Orders dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'tasks':
        return <Tasks dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'products':
        return <div style={{ padding: '20px', textAlign: 'center', direction: 'rtl' }}>עמוד מוצרים - בפיתוח</div>;
      case 'deliveries':
        return <div style={{ padding: '20px', textAlign: 'center', direction: 'rtl' }}>עמוד משלוחים - בפיתוח</div>;
      case 'route':
        return <div style={{ padding: '20px', textAlign: 'center', direction: 'rtl' }}>עמוד מסלול - בפיתוח</div>;
      case 'customers':
        return <div style={{ padding: '20px', textAlign: 'center', direction: 'rtl' }}>עמוד לקוחות - בפיתוח</div>;
      case 'reports':
        return <div style={{ padding: '20px', textAlign: 'center', direction: 'rtl' }}>עמוד דוחות - בפיתוח</div>;
      case 'users':
        return <UserManagement onNavigate={handleNavigate} currentUser={user} />;
      case 'settings':
        return <Settings dataStore={dataStore} onNavigate={handleNavigate} config={config} currentUser={user} />;
      default:
        return <Dashboard dataStore={dataStore} onNavigate={handleNavigate} />;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme.bg_color,
      color: theme.text_color,
      paddingBottom: '80px' // Space for bottom nav
    }}>
      {renderPage()}
      
      {/* Bottom Navigation */}
      {dataStore && userRole && (
        <BottomNavigation
          currentPage={currentPage}
          onNavigate={handleNavigate}
          userRole={userRole}
        />
      )}
    </div>
  );
}