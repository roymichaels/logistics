import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { ErrorDisplay } from './components/ErrorDisplay';
import { OrderCreationWizard } from './components/OrderCreationWizard';
import { DualModeOrderEntry } from './components/DualModeOrderEntry';
import { BusinessManager } from './components/BusinessManager';
import { SuperadminSetup } from './components/SuperadminSetup';
import { SecurityGate } from './components/SecurityGate';
import { LoginPage } from './pages/LoginPage';
import { LandingPage } from './pages/LandingPage';
import { OnboardingHub } from './components/OnboardingHub';
import { BusinessOwnerOnboarding } from './components/BusinessOwnerOnboarding';
import { SearchBusinessModal } from './components/SearchBusinessModal';
import { BecomeDriverModal } from './components/BecomeDriverModal';
import { ToastContainer } from './components/EnhancedToast';
import { PageLoadingSkeleton } from './components/LoadingSkeleton';
import { debugLog } from './components/DebugPanel';
import { hebrew } from './lib/i18n';
import './lib/diagnostics';
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
import { useNavigate, useLocation } from 'react-router-dom';
import { ShellProvider } from './shells/ShellProvider';
import MigrationRouter from './migration/MigrationRouter';
import UnifiedShellRouter from './migration/UnifiedShellRouter';

// All page components are now lazy-loaded in MigrationRouter

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
    return !hasVisited;
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingPathway, setOnboardingPathway] = useState<'business_owner' | 'team_member' | null>(null);
  const [showSearchBusiness, setShowSearchBusiness] = useState(false);
  const [showBecomeDriver, setShowBecomeDriver] = useState(false);
  const [showCreateBusiness, setShowCreateBusiness] = useState(false);

  // Derived state for login status
  const isLoggedIn = user !== null;

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

  // Unified shell routing - single source of truth
  const appShell = (
    <>
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

      {/* Legacy modals - TODO: migrate to unified modal controller in Phase 2 */}
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

      {showSearchBusiness && (
        <SearchBusinessModal
          onClose={() => setShowSearchBusiness(false)}
          onBusinessSelected={(businessId) => {
            setShowSearchBusiness(false);
          }}
        />
      )}

      {showBecomeDriver && (
        <BecomeDriverModal
          onClose={() => setShowBecomeDriver(false)}
          onSuccess={() => {
            refreshUserRole({ forceRefresh: true });
          }}
        />
      )}

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

