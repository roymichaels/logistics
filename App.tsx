import React, { Suspense, lazy, useEffect, useState } from 'react';
import { telegram } from './lib/telegram';
import { bootstrap } from './src/lib/bootstrap';
import { createFrontendDataStore } from './src/lib/frontendDataStore';
import { DataStore, BootstrapConfig } from './data/types';
import { BottomNavigation } from './src/components/BottomNavigation';
import { TelegramAuth } from './src/components/TelegramAuth';
import { OrderCreationWizard } from './src/components/OrderCreationWizard';
import { BusinessManager } from './src/components/BusinessManager';
import { SecurityGate } from './src/components/SecurityGate';
import { debugLog } from './src/components/DebugPanel';
import { hebrew } from './src/lib/hebrew';

// Pages (lazy loaded)
const Dashboard = lazy(() =>
  import('./pages/Dashboard').then((module) => ({ default: module.Dashboard }))
);
const Orders = lazy(() => import('./pages/Orders').then((module) => ({ default: module.Orders })));
const Tasks = lazy(() => import('./pages/Tasks').then((module) => ({ default: module.Tasks })));
const Settings = lazy(() =>
  import('./pages/Settings').then((module) => ({ default: module.Settings }))
);
const UserManagement = lazy(() =>
  import('./pages/UserManagement').then((module) => ({ default: module.UserManagement }))
);
const Chat = lazy(() => import('./pages/Chat').then((module) => ({ default: module.Chat })));
const Channels = lazy(() =>
  import('./pages/Channels').then((module) => ({ default: module.Channels }))
);
const Products = lazy(() =>
  import('./pages/Products').then((module) => ({ default: module.Products }))
);
const Reports = lazy(() =>
  import('./pages/Reports').then((module) => ({ default: module.Reports }))
);
const Stats = lazy(() => import('./pages/Stats').then((module) => ({ default: module.Stats })));
const Partners = lazy(() =>
  import('./pages/Partners').then((module) => ({ default: module.Partners }))
);
const MyStats = lazy(() =>
  import('./pages/MyStats').then((module) => ({ default: module.MyStats }))
);
const Inventory = lazy(() =>
  import('./pages/Inventory').then((module) => ({ default: module.Inventory }))
);
const Incoming = lazy(() =>
  import('./pages/Incoming').then((module) => ({ default: module.Incoming }))
);
const RestockRequests = lazy(() =>
  import('./pages/RestockRequests').then((module) => ({ default: module.RestockRequests }))
);
const Logs = lazy(() => import('./pages/Logs').then((module) => ({ default: module.Logs })));
const MyDeliveries = lazy(() =>
  import('./pages/MyDeliveries').then((module) => ({ default: module.MyDeliveries }))
);
const MyInventory = lazy(() =>
  import('./pages/MyInventory').then((module) => ({ default: module.MyInventory }))
);
const MyZones = lazy(() =>
  import('./pages/MyZones').then((module) => ({ default: module.MyZones }))
);
const DriverStatus = lazy(() =>
  import('./pages/DriverStatus').then((module) => ({ default: module.DriverStatus }))
);
const DispatchBoard = lazy(() =>
  import('./pages/DispatchBoard').then((module) => ({ default: module.DispatchBoard }))
);
const WarehouseDashboard = lazy(() =>
  import('./pages/WarehouseDashboard').then((module) => ({ default: module.WarehouseDashboard }))
);
const ManagerInventory = lazy(() =>
  import('./pages/ManagerInventory').then((module) => ({ default: module.ManagerInventory }))
);

type Page =
  | 'dashboard'
  | 'demo'
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
  | 'driver-status'
  | 'dispatch-board'
  | 'warehouse-dashboard'
  | 'manager-inventory';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [dataStore, setDataStore] = useState<DataStore | null>(null);
  const [config, setConfig] = useState<BootstrapConfig | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<
    | 'owner'
    | 'manager'
    | 'dispatcher'
    | 'driver'
    | 'warehouse'
    | 'sales'
    | 'customer_service'
    | 'user'
    | null
  >(null);
  const [showOrderWizard, setShowOrderWizard] = useState(false);
  const [showBusinessManager, setShowBusinessManager] = useState(false);
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);
  const [initialPageRole, setInitialPageRole] = useState<string | null>(null);

  // Derived state for login status
  const isLoggedIn = user !== null;

  const theme = telegram.themeParams;

  useEffect(() => {
    debugLog.info('🎬 App component mounted', {
      isTelegram: telegram.isAvailable,
      hasInitData: !!telegram.initData,
      hasUser: !!telegram.user,
      supabaseUrl: !!import.meta.env.VITE_SUPABASE_URL
    });
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

  // Handle role-based page routing
  useEffect(() => {
    if (!userRole) {
      setInitialPageRole(null);
      return;
    }

    if (initialPageRole === userRole) {
      return;
    }

    let defaultPage: Page | null = null;

    if (userRole === 'owner') {
      defaultPage = 'stats';
    } else if (userRole === 'manager') {
      defaultPage = 'manager-inventory';
    } else if (userRole === 'warehouse') {
      defaultPage = 'warehouse-dashboard';
    } else if (userRole === 'driver') {
      defaultPage = 'my-deliveries';
    } else if (userRole === 'sales') {
      defaultPage = 'orders';
    }

    if (defaultPage && currentPage === 'dashboard') {
      setCurrentPage(defaultPage);
    }

    setInitialPageRole(userRole);
  }, [userRole, currentPage, initialPageRole]);

  const initializeApp = async () => {
    try {
      debugLog.info('🚀 Initializing app...');

      // Bootstrap from server
      debugLog.info('📡 Calling bootstrap...');
      const result = await bootstrap();
      debugLog.success('✅ Bootstrap complete', { hasUser: !!result.user, adapter: result.config.adapters.data });

      setConfig(result.config);
      setUser(result.user);

      // Create data store in real mode
      debugLog.info('💾 Creating data store...');
      const store = await createFrontendDataStore(result.config, 'real', result.user);
      setDataStore(store);
      debugLog.success('✅ Data store created');

      // Get user role from store
      if (store) {
        try {
          debugLog.info('👤 Getting user role...');
          const role = (await store.getCurrentRole?.()) ?? (await store.getProfile()).role;
          setUserRole(role ?? 'user');
          debugLog.success(`✅ User role: ${role ?? 'user'}`);
        } catch (error) {
          debugLog.warn('⚠️ Failed to resolve user role', error);
          setUserRole('user');
        }
      }

      setLoading(false);
      debugLog.success('🎉 App initialized successfully!');
    } catch (error) {
      debugLog.error('❌ App initialization failed', error);
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
          const role = (await store.getCurrentRole?.()) ?? (await store.getProfile()).role;
          setUserRole(role ?? 'user');
        } catch (error) {
          console.warn('Failed to resolve user role:', error);
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
    // Navigate to role-specific inventory views
    if (userRole === 'warehouse') {
      setCurrentPage('warehouse-dashboard');
    } else if (userRole === 'manager' || userRole === 'owner') {
      setCurrentPage('manager-inventory');
    } else {
      setCurrentPage('inventory');
    }
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
      case 'dispatch-board':
        return <DispatchBoard dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'warehouse-dashboard':
        return <WarehouseDashboard dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'manager-inventory':
        return <ManagerInventory dataStore={dataStore} onNavigate={handleNavigate} />;
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
        <Suspense
          fallback={
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '50vh',
                color: theme.hint_color
              }}
            >
              {hebrew.loading}
            </div>
          }
        >
          {renderPage()}
        </Suspense>

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

        {/* Debug Panel - Shows logs on screen */}
        
      </div>
    </SecurityGate>
  );
}

