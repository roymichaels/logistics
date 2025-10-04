import React, { Suspense, lazy, useEffect, useState } from 'react';
import { telegram } from './lib/telegram';
import { bootstrap } from './src/lib/bootstrap';
import { createFrontendDataStore } from './src/lib/frontendDataStore';
import { DataStore, BootstrapConfig } from './data/types';
import { BottomNavigation } from './src/components/BottomNavigation';
import { TelegramAuth } from './src/components/TelegramAuth';
import { OrderCreationWizard } from './src/components/OrderCreationWizard';
import { DualModeOrderEntry } from './src/components/DualModeOrderEntry';
import { BusinessManager } from './src/components/BusinessManager';
import { SuperadminSetup } from './src/components/SuperadminSetup';
import { FloatingActionMenu } from './src/components/FloatingActionButton';
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
const ZoneManagement = lazy(() =>
  import('./pages/ZoneManagement').then((module) => ({ default: module.ZoneManagement }))
);
const MyRole = lazy(() =>
  import('./pages/MyRole').then((module) => ({ default: module.MyRole }))
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
  | 'my-role'
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
  | 'manager-inventory'
  | 'zone-management';

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
    | 'driver'
    | 'warehouse'
    | 'sales'
    | 'dispatcher'
    | 'customer_service'
    | null
  >(null);
  const [showOrderWizard, setShowOrderWizard] = useState(false);
  const [showBusinessManager, setShowBusinessManager] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);
  const [initialPageRole, setInitialPageRole] = useState<string | null>(null);
  const [showSuperadminSetup, setShowSuperadminSetup] = useState(false);

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

  // Listen for role refresh events (after manager promotion)
  useEffect(() => {
    const handleRoleRefresh = async () => {
      console.log('🔄 Role refresh requested, fetching fresh role from database...');

      if (!dataStore) {
        console.log('⚠️ DataStore not ready yet, waiting...');
        return;
      }

      try {
        // Small delay to ensure DB transaction is complete
        await new Promise(resolve => setTimeout(resolve, 500));

        let role: any = null;
        if (dataStore.getCurrentRole) {
          role = await dataStore.getCurrentRole();
          console.log(`📊 Role refresh: getCurrentRole() returned: ${role}`);
        }

        if (!role) {
          const profile = await dataStore.getProfile(true); // Force refresh
          role = profile.role;
          console.log(`📊 Role refresh: getProfile(true).role returned: ${role}`);
        }

        if (role && role !== userRole) {
          console.log(`✅ Role changed from ${userRole} to ${role}, updating app state`);
          setUserRole(role);
          debugLog.success(`User promoted to ${role}!`);
        } else {
          console.log(`ℹ️ Role unchanged: current=${userRole}, fetched=${role}`);
        }
      } catch (error) {
        console.error('❌ Failed to refresh user role:', error);
        debugLog.error('Role refresh failed', error);
      }
    };

    // Listen for custom role refresh event
    const handleCustomRefresh = () => {
      console.log('🎯 Custom role-refresh event received!');
      handleRoleRefresh();
    };

    window.addEventListener('role-refresh', handleCustomRefresh);

    // Check URL for refresh parameter (legacy support)
    const params = new URLSearchParams(window.location.search);
    if (params.has('refresh') && dataStore) {
      console.log('🔄 Detected refresh parameter in URL, triggering role refresh');
      handleRoleRefresh();
      // Clean up URL parameter
      window.history.replaceState({}, '', window.location.pathname);
    }

    return () => {
      window.removeEventListener('role-refresh', handleCustomRefresh);
    };
  }, [dataStore, userRole]);

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

    // Only run this logic once per role change
    if (initialPageRole === userRole) {
      return;
    }

    let defaultPage: Page | null = null;

    // 🔐 MILITARIZED ROLE-BASED INITIAL PAGES
    if (userRole === 'owner') {
      defaultPage = 'dashboard';  // Owner → Dashboard
    } else if (userRole === 'manager') {
      defaultPage = 'dashboard';  // Manager → Dashboard
    } else if (userRole === 'warehouse') {
      defaultPage = 'inventory';  // Warehouse → Inventory
    } else if (userRole === 'driver') {
      defaultPage = 'my-deliveries';  // Driver → My Deliveries
    } else if (userRole === 'sales') {
      defaultPage = 'orders';  // Sales → Orders
    }

    // Navigate to role-specific page on role change
    // Special case: if user role changed, navigate to appropriate page
    if (defaultPage) {
      const roleChanged = initialPageRole !== userRole;
      const hasRole = userRole !== null;

      // Force navigation if role changed
      if (roleChanged && hasRole) {
        console.log(`🔄 User role changed from ${initialPageRole} to ${userRole}, navigating to ${defaultPage}`);
        setCurrentPage(defaultPage);
      }
      // Standard navigation when already on dashboard
      else if (currentPage === 'dashboard') {
        console.log(`🔄 Role changed from ${initialPageRole} to ${userRole}, navigating to ${defaultPage}`);
        setCurrentPage(defaultPage);
      }
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

          // Check if this is a refresh after manager promotion
          const params = new URLSearchParams(window.location.search);
          const isRefresh = params.has('refresh');

          console.log('🔍 URL Check:', {
            href: window.location.href,
            search: window.location.search,
            hasRefresh: isRefresh,
            allParams: Array.from(params.entries())
          });

          // Always call getCurrentRole which fetches fresh from DB
          let role: any = null;
          if (store.getCurrentRole) {
            role = await store.getCurrentRole();
            debugLog.info(`📊 getCurrentRole() returned: ${role}`);
          }

          // Fallback to getProfile if getCurrentRole not available or returned null
          if (!role) {
            debugLog.info('🔄 Falling back to getProfile()');
            const profile = await store.getProfile(true); // Force refresh
            role = profile.role;
            debugLog.info(`📊 getProfile(true).role returned: ${role}`);
          }

          setUserRole(role ?? 'owner');
          debugLog.success(`✅ User role set to: ${role ?? 'owner'}`);

          // Clean up refresh parameter after processing
          if (isRefresh) {
            window.history.replaceState({}, '', window.location.pathname);
            debugLog.info('🧹 Cleaned up refresh parameter from URL');

            // Navigate to appropriate default page for the new role
            if (role === 'manager' || role === 'owner') {
              setCurrentPage('dashboard');
              debugLog.info('📍 Navigated to dashboard for manager/owner role');
            } else if (role === 'dispatcher') {
              setCurrentPage('dispatch-board');
              debugLog.info('📍 Navigated to dispatch-board for dispatcher role');
            } else if (role === 'driver') {
              setCurrentPage('my-deliveries');
              debugLog.info('📍 Navigated to my-deliveries for driver role');
            } else if (role === 'warehouse') {
              setCurrentPage('warehouse-dashboard');
              debugLog.info('📍 Navigated to warehouse-dashboard for warehouse role');
            } else if (role === 'sales') {
              setCurrentPage('orders');
              debugLog.info('📍 Navigated to orders for sales role');
            } else {
              setCurrentPage('my-role');
              debugLog.info('📍 Staying on my-role for unknown role');
            }
          }
        } catch (error) {
          debugLog.warn('⚠️ Failed to resolve user role', error);
          setUserRole('owner');
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
      console.log('🔐 Authenticating user:', userData);
      console.log('📋 userData contains:', {
        telegram_id: userData.telegram_id,
        username: userData.username,
        role: userData.role,
        name: userData.name || userData.first_name
      });

      setUser(userData);

      // Create data store in real mode
      const store = await createFrontendDataStore(config!, 'real', userData);
      setDataStore(store);

      // Get user role from store
      let role: any = null;
      if (store) {
        try {
          // CRITICAL: Check if userData already has a role from edge function
          if (userData.role) {
            console.log(`✨ userData.role from edge function: ${userData.role}`);
            role = userData.role;
          }

          // Always call getCurrentRole which fetches fresh from DB
          if (!role && store.getCurrentRole) {
            role = await store.getCurrentRole();
            console.log(`📊 handleLogin: getCurrentRole() returned: ${role}`);
          }

          // Fallback to getProfile if getCurrentRole not available or returned null
          if (!role) {
            console.log('🔄 handleLogin: Falling back to getProfile()');
            const profile = await store.getProfile();
            role = profile.role;
            console.log(`📊 handleLogin: getProfile().role returned: ${role}`);
          }

          // DEFAULT TO OWNER (not 'user')
          setUserRole(role ?? 'owner');
          console.log(`✅ handleLogin: User role set to: ${role ?? 'owner'}`);
        } catch (error) {
          console.warn('Failed to resolve user role:', error);
          setUserRole('owner');
        }
      }

      // Only show superadmin setup for owner role
      if (role === 'owner') {
        setShowSuperadminSetup(true);
      }
    } catch (error) {
      console.error('Login failed:', error);
      setError(error instanceof Error ? error.message : 'שגיאה בהתחברות');
    }
  };

  const handleSuperadminSuccess = async () => {
    setShowSuperadminSetup(false);

    // Refresh user role from database
    if (dataStore) {
      try {
        // Force refresh by calling getCurrentRole which fetches fresh from DB
        let role: any = null;
        if (dataStore.getCurrentRole) {
          role = await dataStore.getCurrentRole();
          console.log(`📊 handleSuperadminSuccess: getCurrentRole() returned: ${role}`);
        }

        if (!role) {
          const profile = await dataStore.getProfile(true); // Force refresh
          role = profile.role;
          console.log(`📊 handleSuperadminSuccess: getProfile(true).role returned: ${role}`);
        }

        setUserRole(role ?? 'owner');
        console.log(`✅ handleSuperadminSuccess: User role set to: ${role ?? 'owner'}`);
      } catch (error) {
        console.warn('Failed to refresh user role:', error);
      }
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

  // Show superadmin setup only for owner role
  if (showSuperadminSetup && user && userRole === 'owner') {
    return <SuperadminSetup user={user} onSuccess={handleSuperadminSuccess} theme={theme} />;
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
    // 🔐 MILITARIZED ROLE-BASED ACCESS CONTROL
    const isAdmin = userRole === 'owner' || userRole === 'manager';
    const isOperational = isAdmin || userRole === 'warehouse' || userRole === 'sales';

    // 👤 USER (unassigned): Redirect to my-role page
    if (userRole === 'user' && currentPage !== 'my-role' && currentPage !== 'settings') {
      setCurrentPage('my-role');
      return null;
    }

    switch (currentPage) {
      case 'orders':
        if (!isOperational) break;
        return <Orders dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'tasks':
        if (!isOperational) break;
        return <Tasks dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'products':
        if (!isOperational) break;
        return <Products dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'stats':
        if (!isAdmin) break;
        return <Stats dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'partners':
        if (!isAdmin) break;
        return <Partners dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'my-stats':
        return <MyStats dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'my-role':
        return <MyRole dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'inventory':
        if (!isOperational) break;
        return <Inventory dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'incoming':
        if (!isOperational) break;
        return <Incoming dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'restock-requests':
        if (!isOperational) break;
        return <RestockRequests dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'logs':
        if (!isAdmin) break;
        return <Logs dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'my-deliveries':
        if (userRole !== 'driver') break;
        return <MyDeliveries dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'my-inventory':
        if (userRole !== 'driver') break;
        return <MyInventory dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'my-zones':
        if (userRole !== 'driver') break;
        return <MyZones dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'driver-status':
        if (!isAdmin && userRole !== 'dispatcher') break;
        return <DriverStatus dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'dispatch-board':
        if (!isAdmin && userRole !== 'dispatcher') break;
        return <DispatchBoard dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'warehouse-dashboard':
        if (userRole !== 'warehouse' && !isAdmin) break;
        return <WarehouseDashboard dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'manager-inventory':
        if (!isAdmin) break;
        return <ManagerInventory dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'zone-management':
        if (!isAdmin) break;
        return <ZoneManagement dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'chat':
        if (!isOperational) break;
        return <Chat dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'channels':
        if (!isOperational) break;
        return <Channels dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'reports':
        if (!isAdmin) break;
        return <Reports dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'customers':
        if (!isOperational) break;
        return <div style={{ padding: '20px', textAlign: 'center', direction: 'rtl' }}>עמוד לקוחות - בפיתוח</div>;
      case 'users':
        if (!isAdmin) break;
        return <UserManagement onNavigate={handleNavigate} currentUser={user} />;
      case 'settings':
        return <Settings dataStore={dataStore} onNavigate={handleNavigate} config={config} currentUser={user} />;
      default:
        return <Dashboard dataStore={dataStore} onNavigate={handleNavigate} />;
    }

    // Fallback if no case matched (unauthorized access attempt)
    return <Dashboard dataStore={dataStore} onNavigate={handleNavigate} />;
  };

  return (
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
            onShowActionMenu={() => setShowActionMenu(true)}
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

        {/* Floating Action Menu */}
        <FloatingActionMenu
          user={user}
          onNavigate={handleNavigate}
          onShowModeSelector={handleShowCreateOrder}
          isOpen={showActionMenu}
          onClose={() => setShowActionMenu(false)}
        />

        {/* Modals */}
        {showOrderWizard && dataStore && (
          userRole === 'sales' ? (
            <DualModeOrderEntry
              dataStore={dataStore}
              onOrderCreated={handleOrderCreated}
              onCancel={() => setShowOrderWizard(false)}
            />
          ) : (
            <OrderCreationWizard
              dataStore={dataStore}
              businessId={currentBusinessId || undefined}
              onOrderCreated={handleOrderCreated}
              onCancel={() => setShowOrderWizard(false)}
            />
          )
        )}

        {showBusinessManager && dataStore && (
          <BusinessManager
            dataStore={dataStore}
            currentUserId={user?.telegram_id}
            onClose={() => setShowBusinessManager(false)}
          />
        )}


      </div>
  );
}

