import React, { useState, useEffect } from 'react';
import { telegram } from './lib/telegram';
import { bootstrap } from './src/lib/bootstrap';
import { createFrontendDataStore } from './src/lib/frontendDataStore';
import { DataStore, BootstrapConfig } from './data/types';
import { BottomNavigation } from './src/components/BottomNavigation';
import { TelegramAuth } from './src/components/TelegramAuth';
import { OrderCreationWizard } from './src/components/OrderCreationWizard';
import { BusinessManager } from './src/components/BusinessManager';
import { SecurityGate } from './src/components/SecurityGate';
import { hebrew } from './src/lib/hebrew';

// Pages
import { Dashboard } from './pages/Dashboard';
import { Orders } from './pages/Orders';
import { Tasks } from './pages/Tasks';
import { Settings } from './pages/Settings';
import { UserManagement } from './pages/UserManagement';
import { Chat } from './pages/Chat';
import { Channels } from './pages/Channels';
import { Products } from './pages/Products';
import { Reports } from './pages/Reports';
import { Stats } from './pages/Stats';
import { Partners } from './pages/Partners';
import { MyStats } from './pages/MyStats';
import { Inventory } from './pages/Inventory';
import { Incoming } from './pages/Incoming';
import { RestockRequests } from './pages/RestockRequests';
import { Logs } from './pages/Logs';
import { MyDeliveries } from './pages/MyDeliveries';
import { MyInventory } from './pages/MyInventory';
import { MyZones } from './pages/MyZones';
import { DriverStatus } from './pages/DriverStatus';

type Page =
  | 'dashboard'
  | 'orders'
  | 'tasks'
  | 'settings'
  | 'products'
  | 'customers'
  | 'reports'
  | 'users'
  | 'chat'
  | 'channels'
  | 'stats'
  | 'partners'
  | 'my-stats'
  | 'inventory'
  | 'incoming'
  | 'restock-requests'
  | 'logs'
  | 'my-deliveries'
  | 'my-inventory'
  | 'my-zones'
  | 'driver-status';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [dataStore, setDataStore] = useState<DataStore | null>(null);
  const [config, setConfig] = useState<BootstrapConfig | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'manager' | 'dispatcher' | 'driver' | 'warehouse' | 'sales' | 'customer_service' | null>(null);
  const [showOrderWizard, setShowOrderWizard] = useState(false);
  const [showBusinessManager, setShowBusinessManager] = useState(false);
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);

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
      const store = await createFrontendDataStore(result.config, 'real', result.user);
      setDataStore(store);
      
      // Get user role from store
      if (store) {
        try {
          const profile = await store.getProfile();
          setUserRole(profile.role);
        } catch (error) {
          console.warn('Failed to get user profile:', error);
          setUserRole('user'); // Default fallback
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
      const store = await createFrontendDataStore(config!, 'real', userData);
      setDataStore(store);
      
      // Get user role from store
      if (store) {
        try {
          const profile = await store.getProfile();
          setUserRole(profile.role);
        } catch (error) {
          console.warn('Failed to get user profile:', error);
          setUserRole('user'); // Default fallback
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

  // Create action handlers
  const handleShowCreateOrder = () => {
    setShowOrderWizard(true);
  };

  const handleShowCreateTask = () => {
    // Navigate to tasks page or show task creation modal
    setCurrentPage('tasks');
  };

  const handleShowScanBarcode = () => {
    // Implement barcode scanning functionality
    console.log('Scan barcode action triggered');
    telegram.showAlert('פונקציונליות סריקת ברקוד תתווסף בקרוב');
  };

  const handleShowContactCustomer = () => {
    // Show contact customer interface
    console.log('Contact customer action triggered');
    telegram.showAlert('פונקציונליות יצירת קשר עם לקוח תתווסף בקרוב');
  };

  const handleShowCheckInventory = () => {
    // Navigate to products/inventory page
    setCurrentPage('inventory');
  };

  const handleShowCreateRoute = () => {
    // Show route planning interface
    console.log('Create route action triggered');
    telegram.showAlert('פונקציונליות תכנון מסלולים תתווסף בקרוב');
    setCurrentPage('my-zones');
  };

  const handleShowCreateUser = () => {
    // Show user management
    setCurrentPage('users');
  };

  const handleShowCreateProduct = () => {
    // Navigate to products page
    setCurrentPage('products');
  };

  const handleShowBusinessManager = () => {
    setShowBusinessManager(true);
  };

  const handleOrderCreated = (order: any) => {
    setShowOrderWizard(false);
    setCurrentPage('orders');
    telegram.showAlert('ההזמנה נוצרה בהצלחה!');
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
    // Regular users go directly to dashboard
    if (userRole === 'user') {
      // Users can access dashboard and basic features
    }
    
    switch (currentPage) {
      case 'orders':
        return <Orders dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'tasks':
        return <Tasks dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'products':
        return <Products dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'stats':
        return <Stats dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'partners':
        return <Partners dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'my-stats':
        return <MyStats dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'inventory':
        return <Inventory dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'incoming':
        return <Incoming dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'restock-requests':
        return <RestockRequests dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'logs':
        return <Logs dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'my-deliveries':
        return <MyDeliveries dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'my-inventory':
        return <MyInventory dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'my-zones':
        return <MyZones dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'driver-status':
        return <DriverStatus dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'chat':
        return <Chat dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'channels':
        return <Channels dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'reports':
        return <Reports dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'customers':
        return <div style={{ padding: '20px', textAlign: 'center', direction: 'rtl' }}>עמוד לקוחות - בפיתוח</div>;
      case 'users':
        return <UserManagement onNavigate={handleNavigate} currentUser={user} />;
      case 'settings':
        return <Settings dataStore={dataStore} onNavigate={handleNavigate} config={config} currentUser={user} />;
      default:
        return <Dashboard dataStore={dataStore} onNavigate={handleNavigate} />;
    }
  };

  return (
    <SecurityGate
      userId={user?.id || user?.telegram_id || 'unknown'}
      telegramId={user?.telegram_id || ''}
      onSecurityError={(error) => setError(`Security Error: ${error}`)}
    >
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
            businessId={currentBusinessId || undefined}
            onShowCreateOrder={handleShowCreateOrder}
            onShowCreateTask={handleShowCreateTask}
            onShowScanBarcode={handleShowScanBarcode}
            onShowContactCustomer={handleShowContactCustomer}
            onShowCheckInventory={handleShowCheckInventory}
            onShowCreateRoute={handleShowCreateRoute}
            onShowCreateUser={handleShowCreateUser}
            onShowCreateProduct={handleShowCreateProduct}
          />
        )}

        {/* Modals */}
        {showOrderWizard && dataStore && (
          <OrderCreationWizard
            dataStore={dataStore}
            businessId={currentBusinessId || undefined}
            onOrderCreated={handleOrderCreated}
            onCancel={() => setShowOrderWizard(false)}
          />
        )}

        {showBusinessManager && dataStore && (
          <BusinessManager
            dataStore={dataStore}
            currentUserId={user?.telegram_id}
            onClose={() => setShowBusinessManager(false)}
          />
        )}
      </div>
    </SecurityGate>
  );
}

