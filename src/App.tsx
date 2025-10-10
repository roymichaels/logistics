import React, { Suspense, lazy, useEffect, useState } from 'react';
import { telegram } from './lib/telegram';
import { BottomNavigation } from './components/BottomNavigation';
// TelegramAuth component removed - authentication now handled by ensureTwaSession() in initializeApp()
import { OrderCreationWizard } from './components/OrderCreationWizard';
import { DualModeOrderEntry } from './components/DualModeOrderEntry';
import { BusinessManager } from './components/BusinessManager';
import { SuperadminSetup } from './components/SuperadminSetup';
import { FloatingActionMenu } from './components/FloatingActionButton';
import { Header } from './components/Header';
import { SecurityGate } from './components/SecurityGate';
import { RightSidebarMenu } from './components/RightSidebarMenu';
import { SidebarToggleButton } from './components/SidebarToggleButton';
import { debugLog } from './components/DebugPanel';
import { hebrew } from './lib/hebrew';
import './lib/authDiagnostics'; // Load auth diagnostics for console debugging
import { useAppServices } from './context/AppServicesContext';
import { offlineStore } from './utils/offlineStore';

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
  | 'zone-management';

export default function App() {
  const { user, userRole, dataStore, config, loading, error, refreshUserRole, logout } =
    useAppServices();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [showOrderWizard, setShowOrderWizard] = useState(false);
  const [showBusinessManager, setShowBusinessManager] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);
  const [initialPageRole, setInitialPageRole] = useState<string | null>(null);
  const [showSuperadminSetup, setShowSuperadminSetup] = useState(false);

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
      customer_service: 'orders'
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

  const handleLogout = () => {
    logout();
    telegram.showAlert('התנתקת בהצלחה');
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
    const [errorMessage, errorHint] = error.split('\n');
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
          textAlign: 'center',
          direction: 'rtl'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>⚠️</div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '600',
            marginBottom: '12px',
            color: theme.text_color
          }}>
            {errorMessage || 'שגיאה באתחול'}
          </h1>
          {errorHint && (
            <p style={{
              fontSize: '16px',
              marginBottom: '24px',
              color: theme.hint_color,
              lineHeight: '1.6',
              maxWidth: '400px'
            }}>
              {errorHint}
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              backgroundColor: theme.button_color,
              color: theme.button_text_color,
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            נסה שוב
          </button>
      </div>
    );
  }

  // Show loading while authentication is in progress
  // ensureTwaSession() handles all authentication - no separate login component needed
  if (!isLoggedIn) {
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
        <div style={{
          fontSize: '48px',
          marginBottom: '20px',
          animation: 'pulse 2s ease-in-out infinite'
        }}>
          🔐
        </div>
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>
          מאמת זהות...
        </div>
        <div style={{ fontSize: '14px', opacity: 0.7 }}>
          Authenticating via Telegram
        </div>
      </div>
    );
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
      case 'businesses':
        if (!isAdmin) break;
        return <Businesses dataStore={dataStore} onNavigate={handleNavigate} />;
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
      case 'notifications':
        return <Notifications dataStore={dataStore} onNavigate={handleNavigate} />;
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

  // SecurityGate temporarily disabled to fix DOM manipulation errors
  // Will be re-enabled after fixing the component's rendering logic
  return (
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
            businessId={currentBusinessId || undefined}
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

