import React, { Suspense, lazy, useEffect, useState } from 'react';
import { telegram } from './lib/telegram';
import { BottomNavigation } from './components/BottomNavigation';
import { ErrorDisplay } from './components/ErrorDisplay';
import { OrderCreationWizard } from './components/OrderCreationWizard';
import { DualModeOrderEntry } from './components/DualModeOrderEntry';
import { BusinessManager } from './components/BusinessManager';
import { SuperadminSetup } from './components/SuperadminSetup';
import { FloatingActionMenu } from './components/FloatingActionButton';
import { Header } from './components/Header';
import { SecurityGate } from './components/SecurityGate';
import { RightSidebarMenu } from './components/RightSidebarMenu';
import { SidebarToggleButton } from './components/SidebarToggleButton';
import { LoginPage } from './pages/LoginPage';
import { LandingPage } from './pages/LandingPage';
import { debugLog } from './components/DebugPanel';
import { hebrew } from './lib/hebrew';
import './lib/authDiagnostics'; // Load auth diagnostics for console debugging
import { useAppServices } from './context/AppServicesContext';
import { useAuth } from './context/AuthContext';
import { offlineStore } from './utils/offlineStore';
import { platformDetection } from './lib/platformDetection';

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
const Notifications = lazy(() =>
  import('./pages/Notifications').then((module) => ({ default: module.Notifications }))
);
const Channels = lazy(() =>
  import('./pages/Channels').then((module) => ({ default: module.Channels }))
);
const Products = lazy(() =>
  import('./pages/Products').then((module) => ({ default: module.Products }))
);
const Reports = lazy(() =>
  import('./pages/Reports').then((module) => ({ default: module.Reports }))
);
const Businesses = lazy(() =>
  import('./pages/Businesses').then((module) => ({ default: module.Businesses }))
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
const Profile = lazy(() =>
  import('./pages/Profile').then((module) => ({ default: module.Profile }))
);
const DriversManagement = lazy(() =>
  import('./pages/DriversManagement').then((module) => ({ default: module.DriversManagement }))
);
const UserHomepage = lazy(() =>
  import('./pages/UserHomepage').then((module) => ({ default: module.UserHomepage }))
);

type Page =
  | 'dashboard'
  | 'demo'
  | 'orders'
  | 'tasks'
  | 'settings'
  | 'profile'
  | 'products'
  | 'customers'
  | 'reports'
  | 'users'
  | 'chat'
  | 'channels'
  | 'businesses'
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
  | 'zone-management'
  | 'drivers-management'
  | 'user-homepage';

export default function App() {
  console.log('🎨 App component rendering...');

  const {
    user,
    userRole,
    dataStore,
    config,
    loading,
    error,
    refreshUserRole,
    logout,
    currentBusinessId
  } = useAppServices();
  const { authenticateWithEthereum, authenticateWithSolana, authenticate: authenticateWithTelegram, isAuthenticated } = useAuth();

  console.log('🎨 App state:', { user: !!user, userRole, loading, error, isAuthenticated });
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [showOrderWizard, setShowOrderWizard] = useState(false);
  const [showBusinessManager, setShowBusinessManager] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [initialPageRole, setInitialPageRole] = useState<string | null>(null);
  const [showSuperadminSetup, setShowSuperadminSetup] = useState(false);
  const [showLandingPage, setShowLandingPage] = useState(() => {
    // Check if user has visited before
    const hasVisited = localStorage.getItem('hasVisitedBefore');
    const platform = platformDetection.detect();
    // Skip landing page for Telegram users (auto-auth)
    return !hasVisited && !platform.isTelegram;
  });

  // Derived state for login status
  const isLoggedIn = user !== null;

  const theme = telegram.themeParams;

  // Listen for role refresh events (after manager promotion)
  useEffect(() => {
    const handleRoleRefresh = async () => {
      console.log('🔄 Role refresh requested, fetching fresh role from database...');

      try {
        // Small delay to ensure DB transaction is complete
        await new Promise(resolve => setTimeout(resolve, 500));
        await refreshUserRole({ forceRefresh: true });
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

    window.addEventListener('role-refresh', handleCustomRefresh, { passive: true });

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
  }, [dataStore, refreshUserRole]);

  // Apply theme to body
  useEffect(() => {
    document.body.style.backgroundColor = theme.bg_color || '#ffffff';
    document.body.style.color = theme.text_color || '#000000';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  }, [theme]);

  useEffect(() => {
    if (!dataStore) {
      return;
    }

    const unregisterHandlers: Array<() => void> = [];

    if (typeof dataStore.createOrder === 'function') {
      const unregisterCreateOrder = offlineStore.registerMutationHandler('createOrder', async mutation => {
        if (!dataStore.createOrder) {
          return { status: 'discard', message: 'createOrder unavailable' };
        }

        try {
          await dataStore.createOrder(mutation.payload.input);
          return { status: 'success' as const };
        } catch (error) {
          if (offlineStore.isOfflineError(error)) {
            return {
              status: 'retry' as const,
              message: error instanceof Error ? error.message : 'Network error'
            };
          }

          console.error('Failed to replay offline order mutation, discarding', error);
          return {
            status: 'discard' as const,
            message: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });

      unregisterHandlers.push(unregisterCreateOrder);
    }

    if (typeof dataStore.submitRestockRequest === 'function') {
      const unregisterRestock = offlineStore.registerMutationHandler('submitRestock', async mutation => {
        if (!dataStore.submitRestockRequest) {
          return { status: 'discard', message: 'submitRestock unavailable' };
        }

        try {
          await dataStore.submitRestockRequest(mutation.payload.input);
          return { status: 'success' as const };
        } catch (error) {
          if (offlineStore.isOfflineError(error)) {
            return {
              status: 'retry' as const,
              message: error instanceof Error ? error.message : 'Network error'
            };
          }

          console.error('Failed to replay offline restock mutation, discarding', error);
          return {
            status: 'discard' as const,
            message: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });

      unregisterHandlers.push(unregisterRestock);
    }

    void offlineStore.flushMutations();

    return () => {
      unregisterHandlers.forEach(unregister => unregister());
    };
  }, [dataStore]);

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

    const roleDefaultPageMap: Record<string, Page> = {
      owner: 'dashboard',
      manager: 'dashboard',
      business_owner: 'dashboard',
      infrastructure_owner: 'dashboard',
      warehouse: 'inventory',
      driver: 'my-deliveries',
      sales: 'orders',
      dispatcher: 'dispatch-board',
      customer_service: 'orders',
      user: 'user-homepage'
    };

    const defaultPage: Page | null = roleDefaultPageMap[userRole] ?? null;

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

  // LEGACY: handleLogin is no longer used - authentication now handled inside AppServicesProvider
  // Kept for reference only - can be deleted in future cleanup
  /*
  const handleLogin = async (userData: any) => {
    ...
  };
  */

  const handleSuperadminSuccess = async () => {
    setShowSuperadminSetup(false);

    // Refresh user role from database
    await refreshUserRole({ forceRefresh: true });
  };

  // LEGACY: handleAuthError is no longer used
  // Errors are now handled by AppServicesProvider during initialization
  /*
  const handleAuthError = (error: string) => {
    console.error('Authentication error:', error);
  };
  */

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
    setShowSidebar(false); // Close sidebar when navigating
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
    } else if (userRole === 'manager' || userRole === 'infrastructure_owner' || userRole === 'business_owner') {
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

  const handleLogout = () => {
    logout();
    telegram.showAlert('התנתקת בהצלחה');
  };

  if (loading) {
    console.log('🎨 App: Rendering loading state');
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

  // Show landing page first for new web visitors
  if (showLandingPage && !loading && !error) {
    console.log('🎨 App: Rendering landing page');
    return (
      <LandingPage
        onGetStarted={() => {
          localStorage.setItem('hasVisitedBefore', 'true');
          setShowLandingPage(false);
        }}
      />
    );
  }

  if (error) {
    console.log('🎨 App: Rendering error display:', error);
    return <ErrorDisplay error={error} theme={theme} />;
  }

  // Show LoginPage when not authenticated (for web users)
  // Telegram users will auto-authenticate via the telegram service
  if (!isLoggedIn && !isAuthenticated) {
    console.log('🎨 App: User not authenticated, showing login flow...');
    console.log('🎨 App: isLoggedIn:', isLoggedIn, 'isAuthenticated:', isAuthenticated);

    // Detect platform and decide whether to show login page
    const platform = platformDetection.detect();
    console.log('🎨 App: Platform detection result:', platform);

    // If in Telegram and auto-auth should happen, show loading
    if (platform.isTelegram && telegram.isAvailable) {
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
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .spinner {
              width: 48px;
              height: 48px;
              border: 4px solid ${theme.hint_color || '#ccc'};
              border-top-color: ${theme.button_color || '#007aff'};
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }
          `}</style>
          <div className="spinner" style={{ marginBottom: '20px' }} />
          <div style={{ fontSize: '18px', marginBottom: '10px', fontWeight: '600' }}>
            מאמת זהות...
          </div>
          <div style={{ fontSize: '14px', opacity: 0.7 }}>
            Authenticating via Telegram
          </div>
        </div>
      );
    }

    // Show login page for web users
    console.log('🎨 App: Rendering LoginPage component');
    return (
      <LoginPage
        onEthereumLogin={authenticateWithEthereum}
        onSolanaLogin={authenticateWithSolana}
        onTelegramLogin={authenticateWithTelegram}
        isLoading={loading}
      />
    );
  }

  // Show superadmin setup only for infrastructure_owner role
  if (showSuperadminSetup && user && userRole === 'infrastructure_owner') {
    return <SuperadminSetup user={user} onSuccess={handleSuperadminSuccess} theme={theme} />;
  }

  if (!dataStore) {
    console.log('🎨 App: No dataStore, showing initialization message');
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
    const isAdmin = userRole === 'infrastructure_owner' || userRole === 'business_owner' || userRole === 'manager';
    const isOperational = isAdmin || userRole === 'warehouse' || userRole === 'sales';

    // 👤 USER (unassigned): Keep on user homepage
    if (userRole === 'user' && currentPage !== 'user-homepage' && currentPage !== 'my-role' && currentPage !== 'settings') {
      setCurrentPage('user-homepage');
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
      case 'businesses':
        if (!isAdmin) break;
        return <Businesses dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'my-stats':
        return <MyStats dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'my-role':
        return <MyRole dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'user-homepage':
        return <UserHomepage dataStore={dataStore} onNavigate={handleNavigate} />;
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
      case 'drivers-management':
        if (!isAdmin) break;
        return <DriversManagement dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'chat':
        if (!isOperational) break;
        return <Chat dataStore={dataStore} onNavigate={handleNavigate} currentUser={user} />;
      case 'notifications':
        return <Notifications dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'channels':
        if (!isOperational) break;
        return <Channels dataStore={dataStore} onNavigate={handleNavigate} currentUser={currentUser} />;
      case 'reports':
        if (!isAdmin) break;
        return <Reports dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'customers':
        if (!isOperational) break;
        return <div style={{ padding: '20px', textAlign: 'center', direction: 'rtl' }}>עמוד לקוחות - בפיתוח</div>;
      case 'users':
        if (!isAdmin) break;
        return <UserManagement onNavigate={handleNavigate} currentUser={user} dataStore={dataStore} />;
      case 'settings':
        return <Settings dataStore={dataStore} onNavigate={handleNavigate} config={config} currentUser={user} />;
      case 'profile':
        return <Profile dataStore={dataStore} onNavigate={handleNavigate} />;
      default:
        return <Dashboard dataStore={dataStore} onNavigate={handleNavigate} />;
    }

    // Fallback if no case matched (unauthorized access attempt)
    return <Dashboard dataStore={dataStore} onNavigate={handleNavigate} />;
  };

  console.log('🎨 App: Rendering main app content with SecurityGate');

  return (
    <SecurityGate
      userId={user?.id || ''}
      telegramId={user?.telegram_id || ''}
      onSecurityError={(error) => {
        console.error('Security error:', error);
        telegram.showAlert('שגיאת אבטחה: ' + error);
      }}
    >
      <div style={{
          minHeight: '100vh',
          backgroundColor: theme.bg_color,
          color: theme.text_color,
          paddingBottom: '80px', // Space for bottom nav
          paddingTop: '60px' // Space for header
        }}>
          {/* Header */}
          <Header onNavigate={handleNavigate} onLogout={handleLogout} />

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

        {/* Bottom Navigation - Hidden for 'user' role */}
        {dataStore && userRole && userRole !== 'user' && (
          <BottomNavigation
            currentPage={currentPage}
            onNavigate={handleNavigate}
            userRole={userRole}
            onShowActionMenu={() => setShowActionMenu(true)}
            onOpenSidebar={() => setShowSidebar(true)}
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

        {/* Right Sidebar Menu */}
        <RightSidebarMenu
          isOpen={showSidebar}
          onClose={() => setShowSidebar(false)}
          userRole={userRole}
          currentPage={currentPage}
          onNavigate={handleNavigate}
        />

        {/* Floating Action Menu */}
        <FloatingActionMenu
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
    </SecurityGate>
  );
}

