import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
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
import { OnboardingHub } from './components/OnboardingHub';
import { BusinessOwnerOnboarding } from './components/BusinessOwnerOnboarding';
import { TeamMemberOnboarding } from './components/TeamMemberOnboarding';
import { SearchBusinessModal } from './components/SearchBusinessModal';
import { BecomeDriverModal } from './components/BecomeDriverModal';
import { ToastContainer } from './components/EnhancedToast';
import { PageLoadingSkeleton } from './components/LoadingSkeleton';
import { debugLog } from './components/DebugPanel';
import { hebrew } from './lib/i18n';
import './lib/diagnostics'; // Load diagnostics for console debugging
import './styles/transitions.css';
import './styles/animations.css';
import './styles/telegramx-vars.css';
import { logger } from './lib/logger';
import { useAppServices } from './context/AppServicesContext';
import { useAuth } from './context/AuthContext';
import { offlineStore } from './utils/offlineStore';
import { platformDetection } from './lib/platformDetection';
import {
  isCircuitBreakerActive,
  getAuthLoopDiagnostics,
  resetAuthLoopDetection
} from './lib/authLoopDetection';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { StoreLayout } from './layouts/StoreLayout';
import { BusinessLayout } from './layouts/BusinessLayout';
import { DriverLayout } from './layouts/DriverLayout';
import { ShellProvider } from './shells/ShellProvider';
import { TelegramXPage } from './components/ui/TelegramXPage';
import MigrationRouter, {
  ProfileRoute,
  CatalogRoute,
  KYCRoute,
  BusinessDashboardRoute,
  DriverHomeRoute,
  ProductDetailRoute
} from './migration/MigrationRouter';
import UnifiedShellRouter from './migration/UnifiedShellRouter';
import { migrationFlags } from './migration/flags';

// Pages (lazy loaded)
const Dashboard = lazy(() =>
  import('./pages/Dashboard').then((module) => ({ default: module.Dashboard }))
);
const Orders = lazy(() => import('./pages/Orders').then((module) => ({ default: module.Orders })));
const Tasks = lazy(() => import('./pages/Tasks').then((module) => ({ default: module.Tasks })));
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
const CatalogPage = lazy(() =>
  import('./pages/Catalog').then((module) => ({ default: module.Catalog }))
);
const SandboxPage = lazy(() =>
  import('./pages/Sandbox').then((module) => ({ default: module.Sandbox }))
);
const StartNewPage = lazy(() =>
  import('./pages/StartNew').then((module) => ({ default: module.StartNew }))
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
const SocialFeed = lazy(() =>
  import('./pages/SocialFeed').then((module) => ({ default: module.SocialFeed }))
);
const UserProfilePage = lazy(() =>
  import('./pages/UserProfile').then((module) => ({ default: module.UserProfilePage }))
);
const SocialAnalytics = lazy(() =>
  import('./pages/SocialAnalytics').then((module) => ({ default: module.SocialAnalytics }))
);
const KYCFlow = lazy(() => import('./pages/kyc/KYCFlow'));

type Page =
  | 'dashboard'
  | 'demo'
  | 'orders'
  | 'tasks'
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
  | 'user-homepage'
  | 'social-feed'
  | 'social-profile'
  | 'social-analytics'
  | 'catalog'
  | 'sandbox'
  | 'start-new'
  | 'kyc';

export default function App() {
  const useSXTRaw = (import.meta as any)?.env?.VITE_USE_SXT;
  const useSXT = (() => {
    if (useSXTRaw === undefined || useSXTRaw === null || useSXTRaw === '') return true;
    return ['1', 'true', 'yes'].includes(String(useSXTRaw).toLowerCase());
  })();
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
  const [currentPage, setCurrentPage] = useState<Page>('catalog');
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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingPathway, setOnboardingPathway] = useState<'business_owner' | 'team_member' | null>(null);
  const [showSearchBusiness, setShowSearchBusiness] = useState(false);
  const [showBecomeDriver, setShowBecomeDriver] = useState(false);
  const [showCreateBusiness, setShowCreateBusiness] = useState(false);

  // Derived state for login status
  const isLoggedIn = user !== null;

  const theme = telegram.themeParams;
  const navigate = useNavigate();
  const location = useLocation();

  const pageToPath: Record<Page, string> = {
    dashboard: '/business/dashboard',
    demo: '/demo',
    orders: '/business/orders',
    tasks: '/business/tasks',
    profile: '/store/profile',
    products: '/business/products',
    customers: '/business/customers',
    reports: '/business/analytics',
    users: '/admin/users',
    channels: '/business/channels',
    businesses: '/admin/businesses',
    'my-stats': '/business/analytics',
    'my-role': '/business/roles',
    inventory: '/business/inventory',
    incoming: '/business/incoming',
    'restock-requests': '/business/restock',
    logs: '/admin/logs',
    'my-deliveries': '/driver/routes',
    'my-inventory': '/driver/inventory',
    'my-zones': '/driver/zones',
    'driver-status': '/driver/dashboard',
    'dispatch-board': '/driver/routes',
    'warehouse-dashboard': '/business/warehouse',
    'manager-inventory': '/business/inventory/manager',
    'zone-management': '/business/zones',
    'drivers-management': '/business/drivers',
    'user-homepage': '/store/profile',
    'social-feed': '/store/social',
    'social-profile': '/store/social/profile',
    'social-analytics': '/store/social/analytics',
    catalog: '/store/catalog',
    sandbox: '/sandbox',
    'start-new': '/start-new',
    kyc: '/store/kyc',
    // Chat aliases
    chat: '/business/chat',
  };

  const pathToPage = useMemo(() => {
    const entries = Object.entries(pageToPath).map(([page, path]) => [path, page as Page]);
    const map = new Map<string, Page>(entries);
    return map;
  }, []);

  // Listen for role refresh events (after manager promotion or business creation)
  useEffect(() => {
    const handleRoleRefresh = async () => {

      try {
        // Small delay to ensure DB transaction is complete
        await new Promise(resolve => setTimeout(resolve, 500));
        await refreshUserRole({ forceRefresh: true });

        // Check if we need to force navigation to dashboard
        const forceDashboard = localStorage.getItem('force_dashboard_navigation');
        if (forceDashboard === 'true') {
          localStorage.removeItem('force_dashboard_navigation');

          // Navigate to dashboard after a short delay to ensure state is updated
          setTimeout(() => {
            setCurrentPage('dashboard');
          }, 500);
        }
      } catch (error) {
        logger.error('Failed to refresh user role', error as Error);
        debugLog.error('Role refresh failed', error);
      }
    };

    // Listen for custom role refresh event
    const handleCustomRefresh = () => {
      handleRoleRefresh();
    };

    window.addEventListener('role-refresh', handleCustomRefresh, { passive: true });

    // Check URL for refresh parameter (legacy support)
    const params = new URLSearchParams(window.location.search);
    if (params.has('refresh') && dataStore) {
      handleRoleRefresh();
      // Clean up URL parameter
      window.history.replaceState({}, '', window.location.pathname);
    }

    return () => {
      window.removeEventListener('role-refresh', handleCustomRefresh);
    };
  }, [dataStore, refreshUserRole]);

  // Apply Twitter's authentic dark theme to body
  useEffect(() => {
    document.body.style.backgroundColor = '#15202B'; // Twitter's exact dark background
    document.body.style.color = '#E7E9EA'; // Twitter's primary text color
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    document.body.style.fontSize = '15px'; // Twitter's base font size
    document.body.style.WebkitFontSmoothing = 'antialiased';
    document.body.style.MozOsxFontSmoothing = 'grayscale';
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

          logger.error('Failed to replay offline order mutation, discarding', error as Error);
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

          logger.error('Failed to replay offline restock mutation, discarding', error as Error);
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

    const roleDefaultPageMap: Record<string, Page> = useSXT ? {
      client: 'catalog',
      business: 'dashboard',
      driver: 'my-deliveries',
      admin: 'dashboard',
      user: 'catalog',
    } : {
      owner: 'dashboard',
      manager: 'dashboard',
      business_owner: 'dashboard',
      infrastructure_owner: 'dashboard',
      warehouse: 'inventory',
      driver: 'my-deliveries',
      sales: 'dashboard',
      dispatcher: 'dispatch-board',
      customer_service: 'dashboard',
      user: 'user-homepage'
    };

    const defaultPage: Page | null = roleDefaultPageMap[userRole] ?? null;

    // Role-based redirect using router
    if (defaultPage) {
      const targetPath = pageToPath[defaultPage];
      const roleChanged = initialPageRole !== userRole;
      const hasRole = userRole !== null;

      if (roleChanged && hasRole && targetPath) {
        navigate(targetPath, { replace: true });
        setCurrentPage(defaultPage);
      }
    }

    setInitialPageRole(userRole);
  }, [userRole, initialPageRole, pageToPath, navigate, useSXT]);

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
    logger.error('Authentication error', new Error(error));
  };
  */

  // Sync currentPage with router path
  useEffect(() => {
    const path = location.pathname;
    const matched = [...pathToPage.entries()].find(([routePath]) => path.startsWith(routePath));
    if (matched) {
      setCurrentPage(matched[1]);
    }
  }, [location.pathname, pathToPage]);

  const handleNavigate = (page: Page) => {
    const path = pageToPath[page] || '/';
    navigate(path);
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
    telegram.showAlert('פונקציונליות סריקת ברקוד תתווסף בקרוב');
  };

  const handleShowContactCustomer = () => {
    // Show contact customer interface
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

  const handleShowSearchBusiness = () => {
    setShowSearchBusiness(true);
    telegram.hapticFeedback('selection');
  };

  const handleShowBecomeDriver = () => {
    setShowBecomeDriver(true);
    telegram.hapticFeedback('selection');
  };

  const handleShowCreateBusiness = () => {
    setShowCreateBusiness(true);
    telegram.hapticFeedback('selection');
  };

  // Business owners with no active business -> sandbox selector
  useEffect(() => {
    if (useSXT && isAuthenticated && userRole === 'business' && !currentBusinessId) {
      navigate('/sandbox', { replace: true });
    }
  }, [useSXT, isAuthenticated, userRole, currentBusinessId, navigate]);

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
        backgroundColor: '#15202B',
        color: '#E7E9EA',
        fontSize: '15px'
      }}>
        {hebrew.loading}
      </div>
    );
  }

  // Show landing page first for new web visitors
  if (showLandingPage && !loading && !error) {
    return (
      <LandingPage
        onGetStarted={() => {
          localStorage.setItem('hasVisitedBefore', 'true');
          setShowLandingPage(false);
        }}
      />
    );
  }

  // Show onboarding flow for authenticated users with 'user' role
  if (!useSXT && isLoggedIn && userRole === 'user' && !loading && !error) {
    // Check if user wants to see onboarding
    const hasCompletedOnboarding = localStorage.getItem(`onboarding_completed_${user?.id}`);

    if (!hasCompletedOnboarding || showOnboarding) {
      // Onboarding Hub - pathway selection
      if (!onboardingPathway) {
        return (
          <OnboardingHub
            onSelectPathway={(pathway) => {
              if (pathway) {
                setOnboardingPathway(pathway);
                setShowOnboarding(true);
              }
            }}
            onSkip={() => {
              if (user?.id) {
                localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
              }
              setShowOnboarding(false);
              setOnboardingPathway(null);
            }}
          />
        );
      }

      // Business Owner Onboarding
      if (onboardingPathway === 'business_owner' && dataStore) {
        return (
          <BusinessOwnerOnboarding
            dataStore={dataStore}
            onComplete={() => {
              if (user?.id) {
                localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
              }
              setShowOnboarding(false);
              setOnboardingPathway(null);
              refreshUserRole({ forceRefresh: true });
            }}
            onBack={() => {
              setOnboardingPathway(null);
            }}
          />
        );
      }

      // Team Member Onboarding (Driver Application)
      if (onboardingPathway === 'team_member') {
        // For now, team_member pathway goes to driver application
        // Can be expanded to handle other team roles later
        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: '#15202B',
            zIndex: 9999
          }}>
            <BecomeDriverModal
              onClose={() => {
                setOnboardingPathway(null);
              }}
              onSuccess={() => {
                if (user?.id) {
                  localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
                }
                setShowOnboarding(false);
                setOnboardingPathway(null);
                refreshUserRole({ forceRefresh: true });
              }}
            />
          </div>
        );
      }
    }
  }

  if (error) {
    return <ErrorDisplay error={error} theme={theme} />;
  }

  // Show LoginPage when not authenticated (for web users)
  // Telegram users will auto-authenticate via the telegram service
  if (!isLoggedIn || !isAuthenticated) {
    // Check if circuit breaker is active
    if (isCircuitBreakerActive()) {
      const diagnostics = getAuthLoopDiagnostics();
      const cooldownMinutes = Math.ceil(diagnostics.cooldownRemaining / 60000);

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#15202B',
          color: '#E7E9EA',
          padding: '40px 20px',
          textAlign: 'center'
        }}>
          <div style={{ maxWidth: '500px' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
            <h1 style={{ fontSize: '23px', marginBottom: '12px', fontWeight: '700', letterSpacing: '-0.5px' }}>
              זוהה בעיה באימות
            </h1>
            <p style={{ fontSize: '18px', marginBottom: '32px', opacity: 0.8, lineHeight: '1.6' }}>
              זוהו ניסיונות רבים מדי להתחבר. אנא המתן {cooldownMinutes} דקות ונסה שוב.
            </p>
            <div style={{
              padding: '16px',
              backgroundColor: 'rgba(255, 152, 0, 0.1)',
              borderRadius: '12px',
              marginBottom: '32px',
              fontSize: '14px',
              opacity: 0.7
            }}>
              אם הבעיה חוזרת על עצמה, אנא פנה לתמיכה טכנית.
            </div>
            <button
              onClick={() => {
                resetAuthLoopDetection();
                window.location.reload();
              }}
              style={{
                padding: '12px 32px',
                fontSize: '15px',
                fontWeight: '700',
                backgroundColor: '#1DA1F2',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                minHeight: '44px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
                transition: 'all 200ms ease-in-out'
              }}
            >
              איפוס וניסיון מחדש
            </button>
          </div>
        </div>
      );
    }

    // Detect platform and decide whether to show login page
    const platform = platformDetection.detect();

    // If in Telegram and auto-auth should happen, show loading
    if (platform.isTelegram && telegram.isAvailable) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#15202B',
          color: '#E7E9EA',
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
              border: 4px solid #536471;
              border-top-color: #1D9BF0;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }
          `}</style>
          <div className="spinner" style={{ marginBottom: '16px' }} />
          <div style={{ fontSize: '17px', marginBottom: '8px', fontWeight: '700' }}>
            מאמת זהות...
          </div>
          <div style={{ fontSize: '13px', color: '#8899A6' }}>
            Authenticating via Telegram
          </div>
        </div>
      );
    }

    // Show login page for web users
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
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#15202B',
        color: '#E7E9EA',
        fontSize: '16px'
      }}>
        מכין את המערכת...
      </div>
    );
  }

  const useUnifiedShell = migrationFlags.unifiedShell || migrationFlags.unifiedApp;

  // Unified shell path (flag-gated)
  if (useUnifiedShell) {
    const unifiedRoutes = (
      <Suspense fallback={<PageLoadingSkeleton />}>
        <ShellProvider
          value={{
            currentPage,
            handleNavigate,
            showSidebar,
            setShowSidebar,
            showActionMenu,
            setShowActionMenu,
            showOrderWizard,
            openOrderWizard: handleShowCreateOrder,
            closeOrderWizard: () => setShowOrderWizard(false),
            showBusinessManager,
            openBusinessManager: handleShowBusinessManager,
            closeBusinessManager: () => setShowBusinessManager(false),
            showSearchBusiness,
            openSearchBusiness: handleShowSearchBusiness,
            closeSearchBusiness: () => setShowSearchBusiness(false),
            showBecomeDriver,
            openBecomeDriver: handleShowBecomeDriver,
            closeBecomeDriver: () => setShowBecomeDriver(false),
            showCreateBusiness,
            openCreateBusiness: handleShowCreateBusiness,
            closeCreateBusiness: () => setShowCreateBusiness(false),
            handleLogout,
            handleShowCreateTask,
            handleShowScanBarcode,
            handleShowContactCustomer,
            handleShowCheckInventory,
            handleShowCreateRoute,
            handleShowCreateUser,
            handleShowCreateProduct
          }}
        >
          <UnifiedShellRouter dataStore={dataStore}>
            <MigrationRouter dataStore={dataStore} onNavigate={handleNavigate} />
          </UnifiedShellRouter>
        </ShellProvider>
      </Suspense>
    );

    if (useSXT) {
      return unifiedRoutes;
    }

    return (
      <SecurityGate
        userId={user?.id || ''}
        telegramId={user?.telegram_id || ''}
        onSecurityError={(error) => {
          logger.error('Security error', new Error(error));
          telegram.showAlert('שגיאת אבטחה: ' + error);
        }}
      >
        {unifiedRoutes}
      </SecurityGate>
    );
  }

  const effectiveRole = useSXT ? (userRole || 'client') : userRole;
  const isSxtClient = useSXT && (!effectiveRole || effectiveRole === 'client' || effectiveRole === 'user');
  const isSxtBusiness = useSXT && effectiveRole === 'business';
  const isSxtDriver = useSXT && effectiveRole === 'driver';
  const isSxtAdmin = useSXT && effectiveRole === 'admin';

  const renderPage = (pageOverride?: Page) => {
    const page = pageOverride ?? currentPage;
    // 🔐 MILITARIZED ROLE-BASED ACCESS CONTROL
    const isAdmin = isSxtAdmin || isSxtBusiness || effectiveRole === 'infrastructure_owner' || effectiveRole === 'business_owner' || effectiveRole === 'manager';
    const isOperational = isAdmin || isSxtDriver || effectiveRole === 'warehouse' || effectiveRole === 'sales';

    // 👤 USER (unassigned): Keep on user homepage
    // Exception: Don't redirect if they just became a business owner (check localStorage flag)
    const isDashboardForced = localStorage.getItem('force_dashboard_navigation') === 'true';
    if (userRole === 'user' && !isDashboardForced &&
      currentPage !== 'catalog' && currentPage !== 'sandbox' && currentPage !== 'start-new') {
      return <Navigate to="/store/catalog" replace />;
    }

    // In SxT client storefront mode, force allowed pages only
    if (isSxtClient) {
      // Allow storefront + chat for SxT clients
      if (!['catalog', 'notifications', 'profile', 'chat'].includes(page)) {
        return <Navigate to="/store/catalog" replace />;
      }
    }

    switch (page) {
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
        // Allow chat for any authenticated user when dataStore is available
        return <Chat dataStore={dataStore} onNavigate={handleNavigate} currentUser={user} />;
      case 'notifications':
        return <Notifications dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'channels':
        if (!isOperational) break;
        return <Channels dataStore={dataStore} onNavigate={handleNavigate} currentUser={user} />;
      case 'reports':
        if (!isAdmin) break;
        return <Reports dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'catalog':
        return <CatalogPage dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'sandbox':
        return <SandboxPage dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'start-new':
        return <StartNewPage dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'customers':
        if (!isOperational) break;
        return <div style={{ padding: '20px', textAlign: 'center', direction: 'rtl' }}>עמוד לקוחות - בפיתוח</div>;
      case 'users':
        if (!isAdmin) break;
        return <UserManagement onNavigate={handleNavigate} currentUser={user} dataStore={dataStore} />;
      case 'profile':
        return <Profile dataStore={dataStore} onNavigate={handleNavigate} />;
      case 'social-feed':
        return <SocialFeed />;
      case 'social-profile':
        return <UserProfilePage />;
      case 'social-analytics':
        return <SocialAnalytics />;
      case 'kyc':
        return <KYCFlow />;
      default:
        return useSXT
          ? <CatalogPage dataStore={dataStore} onNavigate={handleNavigate} />
          : <Dashboard dataStore={dataStore} onNavigate={handleNavigate} />;
    }

    // Fallback if no case matched (unauthorized access attempt)
    return useSXT
      ? <CatalogPage dataStore={dataStore} onNavigate={handleNavigate} />
      : <Dashboard dataStore={dataStore} onNavigate={handleNavigate} />;
  };

  const appShell = (
    <>
      <Suspense fallback={<PageLoadingSkeleton />}>
        <ShellProvider value={{
          currentPage,
          handleNavigate,
          showSidebar,
          setShowSidebar,
          showActionMenu,
          setShowActionMenu,
          showOrderWizard,
          openOrderWizard: handleShowCreateOrder,
          closeOrderWizard: () => setShowOrderWizard(false),
          showBusinessManager,
          openBusinessManager: handleShowBusinessManager,
          closeBusinessManager: () => setShowBusinessManager(false),
          showSearchBusiness,
          openSearchBusiness: handleShowSearchBusiness,
          closeSearchBusiness: () => setShowSearchBusiness(false),
          showBecomeDriver,
          openBecomeDriver: handleShowBecomeDriver,
          closeBecomeDriver: () => setShowBecomeDriver(false),
          showCreateBusiness,
          openCreateBusiness: handleShowCreateBusiness,
          closeCreateBusiness: () => setShowCreateBusiness(false),
          handleLogout,
          handleShowCreateTask,
          handleShowScanBarcode,
          handleShowContactCustomer,
          handleShowCheckInventory,
          handleShowCreateRoute,
          handleShowCreateUser,
          handleShowCreateProduct,
        }}>
          <Routes>
            {/* Storefront */}
            <Route element={<StoreLayout />}>
              <Route path="/store" element={<Navigate to="/store/catalog" replace />} />
              <Route
                path="/store/catalog"
                element={
                  <TelegramXPage>
                    <CatalogRoute dataStore={dataStore} onNavigate={handleNavigate} />
                  </TelegramXPage>
                }
              />
              <Route
                path="/store/cart"
                element={<TelegramXPage><div style={{ padding: 20 }}>Cart (placeholder)</div></TelegramXPage>}
              />
              <Route
                path="/store/checkout"
                element={<TelegramXPage><div style={{ padding: 20 }}>Checkout (placeholder)</div></TelegramXPage>}
              />
              <Route path="/store/orders" element={<TelegramXPage>{renderPage('orders')}</TelegramXPage>} />
              <Route
                path="/store/profile"
                element={<TelegramXPage><ProfileRoute dataStore={dataStore} onNavigate={handleNavigate} /></TelegramXPage>}
              />
              <Route path="/store/product/:id" element={renderPage('catalog')} />
              <Route path="/store/kyc/*" element={<KYCFlow />} />
              <Route path="kyc/*" element={<KYCFlow />} />
              <Route path="kyc" element={<Navigate to="kyc/start" replace />} />
            </Route>

            {/* Business */}
            <Route element={<BusinessLayout />}>
              <Route path="/business" element={<Navigate to="/business/dashboard" replace />} />
              <Route path="/business/dashboard" element={renderPage('dashboard')} />
              <Route path="/business/products" element={renderPage('products')} />
              <Route path="/business/orders" element={renderPage('orders')} />
              <Route path="/business/restock" element={renderPage('restock-requests')} />
              <Route path="/business/inventory" element={renderPage('inventory')} />
              <Route path="/business/incoming" element={renderPage('incoming')} />
              <Route path="/business/reports" element={renderPage('reports')} />
              <Route path="/business/drivers" element={renderPage('drivers-management')} />
              <Route path="/business/zones" element={renderPage('zone-management')} />
              <Route path="/business/manager-inventory" element={renderPage('manager-inventory')} />
              <Route path="/business/warehouse" element={renderPage('warehouse-dashboard')} />
              <Route path="/business/dispatch" element={renderPage('dispatch-board')} />
              <Route path="/sandbox" element={renderPage('sandbox')} />
              <Route path="/start-new" element={renderPage('start-new')} />
              <Route path="/admin/logs" element={renderPage('logs')} />
              <Route path="/channels" element={renderPage('channels')} />
              <Route path="/notifications" element={renderPage('notifications')} />
              <Route path="/chat" element={renderPage('chat')} />
            </Route>

            {/* Driver */}
            <Route element={<DriverLayout />}>
              <Route path="/driver" element={<Navigate to="/driver/dashboard" replace />} />
              <Route path="/driver/dashboard" element={renderPage('driver-status')} />
              <Route path="/driver/tasks" element={renderPage('tasks')} />
              <Route path="/driver/routes" element={renderPage('my-deliveries')} />
              <Route path="/driver/my-deliveries" element={renderPage('my-deliveries')} />
              <Route path="/driver/my-inventory" element={renderPage('my-inventory')} />
              <Route path="/driver/my-zones" element={renderPage('my-zones')} />
              <Route path="/driver/status" element={renderPage('driver-status')} />
            </Route>

            {/* Admin */}
            <Route path="/admin/analytics" element={renderPage('reports')} />
            <Route path="/admin/businesses" element={renderPage('businesses')} />
            <Route path="/admin/users" element={renderPage('users')} />

            {/* Legacy/default */}
            <Route path="*" element={<Navigate to={pageToPath[currentPage] || '/store/catalog'} replace />} />
          </Routes>
        </ShellProvider>
      </Suspense>

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

        {/* Search Business Modal */}
        {showSearchBusiness && (
          <SearchBusinessModal
            onClose={() => setShowSearchBusiness(false)}
            onBusinessSelected={(businessId) => {
              setShowSearchBusiness(false);
            }}
          />
        )}

        {/* Become Driver Modal */}
        {showBecomeDriver && (
          <BecomeDriverModal
            onClose={() => setShowBecomeDriver(false)}
            onSuccess={() => {
              refreshUserRole({ forceRefresh: true });
            }}
          />
        )}

        {/* Create Business Modal (reuses BusinessOwnerOnboarding) */}
        {showCreateBusiness && dataStore && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px'
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowCreateBusiness(false);
              }
            }}
          >
            <div style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
              <BusinessOwnerOnboarding
                dataStore={dataStore}
                onComplete={() => {
                  setShowCreateBusiness(false);
                  refreshUserRole({ forceRefresh: true });
                  telegram.showAlert('העסק נוצר בהצלחה!');
                }}
                onBack={() => setShowCreateBusiness(false)}
              />
            </div>
          </div>
        )}

        {/* Enhanced Toast Notifications */}
        <ToastContainer />
    </>
  );

  if (useSXT) {
    return appShell;
  }

  return (
    <SecurityGate
      userId={user?.id || ''}
      telegramId={user?.telegram_id || ''}
      onSecurityError={(error) => {
        logger.error('Security error', new Error(error));
        telegram.showAlert('שגיאת אבטחה: ' + error);
      }}
    >
      {appShell}
    </SecurityGate>
  );
}

