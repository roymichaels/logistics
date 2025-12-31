import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useSafeAppServices } from '../context/AppServicesContext';
import { useAuth } from '../context/AuthContext';
import { PageLoadingSkeleton } from '../components/LoadingSkeleton';
import { LoginPage } from '../pages/LoginPage';
import { RoleSelectionPage } from '../pages/RoleSelectionPage';
import { getEntryPointForRole } from './UnifiedRouter';
import { UserRole } from '../shells/types';
import { PageGuard } from '../components/guards/PageGuard';

const LandingPage = React.lazy(() => import('../pages/LandingPage').then(m => ({ default: m.LandingPage || m.default })));
const Dashboard = React.lazy(() => import('../pages/Dashboard').then(m => ({ default: m.Dashboard || m.default })));
const Orders = React.lazy(() => import('../pages/Orders').then(m => ({ default: m.Orders || m.default })));
const Products = React.lazy(() => import('../pages/Products').then(m => ({ default: m.Products || m.default })));
const BusinessCatalog = React.lazy(() => import('../pages/BusinessCatalog').then(m => ({ default: m.BusinessCatalog || m.default })));
const Chat = React.lazy(() => import('../pages/Chat').then(m => ({ default: m.Chat || m.default })));
const Businesses = React.lazy(() => import('../pages/Businesses').then(m => ({ default: m.Businesses })));
const Inventory = React.lazy(() => import('../pages/Inventory').then(m => ({ default: m.Inventory })));
const DispatchBoard = React.lazy(() => import('../pages/DispatchBoard').then(m => ({ default: m.DispatchBoard })));
const DriversManagement = React.lazy(() => import('../pages/DriversManagement').then(m => ({ default: m.DriversManagement })));
const Reports = React.lazy(() => import('../pages/Reports').then(m => ({ default: m.Reports })));
const UserManagement = React.lazy(() => import('../pages/UserManagement').then(m => ({ default: m.UserManagement || m.default })));
const TeamManagement = React.lazy(() => import('../pages/business/TeamManagement').then(m => ({ default: m.TeamManagement })));
const SalesDashboard = React.lazy(() => import('../pages/sales/SalesDashboard').then(m => ({ default: m.SalesDashboard })));
const ZoneManagement = React.lazy(() => import('../pages/ZoneManagement').then(m => ({ default: m.ZoneManagement })));
const WarehouseDashboard = React.lazy(() => import('../pages/WarehouseDashboard').then(m => ({ default: m.WarehouseDashboard })));
const Incoming = React.lazy(() => import('../pages/Incoming').then(m => ({ default: m.Incoming || m.default })));
const RestockRequests = React.lazy(() => import('../pages/RestockRequests').then(m => ({ default: m.RestockRequests || m.default })));
const Tasks = React.lazy(() => import('../pages/Tasks').then(m => ({ default: m.Tasks })));
const Notifications = React.lazy(() => import('../pages/Notifications').then(m => ({ default: m.Notifications })));
const MyStats = React.lazy(() => import('../pages/MyStats').then(m => ({ default: m.MyStats })));
const Channels = React.lazy(() => import('../pages/Channels').then(m => ({ default: m.Channels })));
const MyDeliveries = React.lazy(() => import('../pages/MyDeliveries').then(m => ({ default: m.MyDeliveries })));
const DriverDashboard = React.lazy(() => import('../pages/DriverDashboard').then(m => ({ default: m.DriverDashboard })));
const DriverEarningsPage = React.lazy(() => import('../pages/DriverEarningsPage').then(m => ({ default: m.default })));
const CatalogPage = React.lazy(() => import('../store/CatalogPage').then(m => ({ default: m.CatalogPage })));
const SearchPage = React.lazy(() => import('../store/SearchPage').then(m => ({ default: m.SearchPage })));
const CartPage = React.lazy(() => import('../store/CartPage').then(m => ({ default: m.CartPage })));
const CheckoutPage = React.lazy(() => import('../store/CheckoutPage').then(m => ({ default: m.CheckoutPage })));
const MyOrdersPage = React.lazy(() => import('../store/MyOrdersPage').then(m => ({ default: m.MyOrdersPage })));
const OrderDetailPage = React.lazy(() => import('../store/OrderDetailPage').then(m => ({ default: m.OrderDetailPage })));
const UserProfile = React.lazy(() => import('../pages/UserProfile').then(m => ({ default: m.UserProfilePage })));
const PlatformCatalog = React.lazy(() => import('../pages/admin/PlatformCatalog').then(m => ({ default: m.PlatformCatalog })));
const PlatformDashboard = React.lazy(() => import('../pages/admin/PlatformDashboard').then(m => ({ default: m.PlatformDashboard })));
const BusinessCatalogManagement = React.lazy(() => import('../pages/business/BusinessCatalogManagement').then(m => ({ default: m.BusinessCatalogManagement })));
const InfrastructureDashboard = React.lazy(() => import('../pages/infrastructure/InfrastructureDashboard').then(m => ({ default: m.InfrastructureDashboard })));
const AdminBusinesses = React.lazy(() => import('../pages/admin/AdminBusinesses').then(m => ({ default: m.AdminBusinesses })));
const AdminSettings = React.lazy(() => import('../pages/admin/AdminSettings').then(m => ({ default: m.AdminSettings })));
const SupportConsole = React.lazy(() => import('../pages/customer-service/SupportConsole').then(m => ({ default: m.SupportConsole })));
const AdminPermissionManagement = React.lazy(() => import('../pages/admin/PermissionManagement').then(m => ({ default: m.PermissionManagement })));
const InfrastructurePermissionManagement = React.lazy(() => import('../pages/infrastructure/PermissionManagement').then(m => ({ default: m.InfrastructurePermissionManagement })));
const BusinessPermissionManagement = React.lazy(() => import('../pages/business/PermissionManagement').then(m => ({ default: m.BusinessPermissionManagement })));
const InfrastructureCatalogs = React.lazy(() => import('../pages/infrastructure/InfrastructureCatalogs').then(m => ({ default: m.InfrastructureCatalogs })));
const UnauthorizedPage = React.lazy(() => import('../pages/Unauthorized').then(m => ({ default: m.UnauthorizedPage || m.default })));
const Infrastructures = React.lazy(() => import('../pages/admin/Infrastructures').then(m => ({ default: m.default })));
const Superadmins = React.lazy(() => import('../pages/admin/Superadmins').then(m => ({ default: m.default })));
const AuditLogs = React.lazy(() => import('../pages/admin/AuditLogs').then(m => ({ default: m.default })));
const FeatureFlags = React.lazy(() => import('../pages/admin/FeatureFlags').then(m => ({ default: m.default })));
const BusinessSettings = React.lazy(() => import('../pages/business/Settings').then(m => ({ default: m.default })));
const InfrastructureSettings = React.lazy(() => import('../pages/infrastructure/Settings').then(m => ({ default: m.default })));

// Role-aware redirect component
function RoleBasedRedirect() {
  const appServices = useSafeAppServices();
  const userRole = appServices?.userRole ?? 'user';
  const location = useLocation();

  // Get the correct entry point for the user's role
  const entryPoint = getEntryPointForRole(userRole as UserRole);

  // Redirect immediately using Navigate component
  return <Navigate to={entryPoint} replace />;
}

// Guarded route wrapper
interface GuardedRouteProps {
  element: React.ReactElement;
  userRole: UserRole | null;
  path: string;
}

function GuardedRoute({ element, userRole, path }: GuardedRouteProps) {
  return (
    <PageGuard userRole={userRole} requiredPath={path}>
      <Suspense fallback={<PageLoadingSkeleton />}>
        {element}
      </Suspense>
    </PageGuard>
  );
}

export function SimpleRouter() {
  const appServices = useSafeAppServices();
  const isAuthenticated = appServices?.isAuthenticated ?? false;
  const userRole = appServices?.userRole ?? 'user';
  const dataStore = appServices?.dataStore ?? null;
  const { authenticateWithEthereum, authenticateWithSolana, authenticateWithTon, authenticate: authenticateWithTelegram } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Redirect first-time customers to role selection
  useEffect(() => {
    if (isAuthenticated && userRole === 'customer' && location.pathname !== '/role-selection' && location.pathname !== '/store/catalog' && !location.pathname.startsWith('/store/')) {
      navigate('/role-selection', { replace: true });
    }
  }, [isAuthenticated, userRole, location.pathname, navigate]);

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route
          path="/auth/login"
          element={
            <Suspense fallback={<PageLoadingSkeleton />}>
              <LoginPage
                onEthereumLogin={authenticateWithEthereum}
                onSolanaLogin={authenticateWithSolana}
                onTelegramLogin={authenticateWithTelegram}
                onTonLogin={authenticateWithTon}
              />
            </Suspense>
          }
        />
        <Route path="/" element={<Suspense fallback={<PageLoadingSkeleton />}><LandingPage /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Role-based routes - STRICT SEPARATION
  const isAdmin = ['admin', 'superadmin'].includes(userRole || '');
  const isInfraOwner = ['infrastructure_owner', 'accountant'].includes(userRole || '');
  const isBusinessRole = ['business_owner', 'manager', 'warehouse', 'dispatcher', 'sales', 'customer_service'].includes(userRole || '');
  const isDriverRole = userRole === 'driver';
  const isCustomerRole = ['customer', 'user'].includes(userRole || '');

  return (
    <Routes>
      {/* Role Selection - accessible to all authenticated users */}
      <Route path="/role-selection" element={<RoleSelectionPage />} />

      {/* Admin/Superadmin routes */}
      {isAdmin && (
        <>
          <Route path="/admin/platform-dashboard" element={<Suspense fallback={<PageLoadingSkeleton />}><PlatformDashboard /></Suspense>} />
          <Route path="/admin/infrastructures" element={<Suspense fallback={<PageLoadingSkeleton />}><Infrastructures /></Suspense>} />
          <Route path="/admin/superadmins" element={<Suspense fallback={<PageLoadingSkeleton />}><Superadmins /></Suspense>} />
          <Route path="/admin/platform-catalog" element={<Suspense fallback={<PageLoadingSkeleton />}><PlatformCatalog /></Suspense>} />
          <Route path="/admin/businesses" element={<Suspense fallback={<PageLoadingSkeleton />}><AdminBusinesses /></Suspense>} />
          <Route path="/admin/users" element={<Suspense fallback={<PageLoadingSkeleton />}><UserManagement /></Suspense>} />
          <Route path="/admin/analytics" element={<Suspense fallback={<PageLoadingSkeleton />}><MyStats dataStore={dataStore} /></Suspense>} />
          <Route path="/admin/orders" element={<Suspense fallback={<PageLoadingSkeleton />}><Orders /></Suspense>} />
          <Route path="/admin/drivers" element={<Suspense fallback={<PageLoadingSkeleton />}><DriversManagement dataStore={dataStore} /></Suspense>} />
          <Route path="/admin/system-settings" element={<Suspense fallback={<PageLoadingSkeleton />}><AdminSettings /></Suspense>} />
          <Route path="/admin/permissions" element={<Suspense fallback={<PageLoadingSkeleton />}><AdminPermissionManagement /></Suspense>} />
          <Route path="/admin/logs" element={<Suspense fallback={<PageLoadingSkeleton />}><AuditLogs /></Suspense>} />
          <Route path="/admin/feature-flags" element={<Suspense fallback={<PageLoadingSkeleton />}><FeatureFlags /></Suspense>} />
          <Route path="/admin/chat" element={<Suspense fallback={<PageLoadingSkeleton />}><Chat /></Suspense>} />
          <Route path="/admin/tasks" element={<Suspense fallback={<PageLoadingSkeleton />}><Tasks dataStore={dataStore} onNavigate={(path) => navigate(path)} /></Suspense>} />
          <Route path="/notifications" element={<Suspense fallback={<PageLoadingSkeleton />}><Notifications dataStore={dataStore} onNavigate={(path) => navigate(path)} /></Suspense>} />
        </>
      )}

      {/* Infrastructure Owner routes */}
      {isInfraOwner && (
        <>
          <Route path="/infrastructure/dashboard" element={<Suspense fallback={<PageLoadingSkeleton />}><InfrastructureDashboard /></Suspense>} />
          <Route path="/infrastructure/businesses" element={<Suspense fallback={<PageLoadingSkeleton />}><Businesses dataStore={dataStore} onNavigate={(path) => navigate(path)} /></Suspense>} />
          <Route path="/infrastructure/business-catalogs" element={<Suspense fallback={<PageLoadingSkeleton />}><BusinessCatalogManagement /></Suspense>} />
          <Route path="/infrastructure/catalogs" element={<Suspense fallback={<PageLoadingSkeleton />}><InfrastructureCatalogs /></Suspense>} />
          <Route path="/infrastructure/permissions" element={<Suspense fallback={<PageLoadingSkeleton />}><InfrastructurePermissionManagement /></Suspense>} />
          <Route path="/infrastructure/reports" element={<Suspense fallback={<PageLoadingSkeleton />}><Reports dataStore={dataStore} onNavigate={(path) => navigate(path)} /></Suspense>} />
          <Route path="/infrastructure/analytics" element={<Suspense fallback={<PageLoadingSkeleton />}><MyStats dataStore={dataStore} /></Suspense>} />
          <Route path="/infrastructure/orders" element={<Suspense fallback={<PageLoadingSkeleton />}><Orders /></Suspense>} />
          <Route path="/infrastructure/drivers" element={<Suspense fallback={<PageLoadingSkeleton />}><DriversManagement dataStore={dataStore} /></Suspense>} />
          <Route path="/infrastructure/team" element={<Suspense fallback={<PageLoadingSkeleton />}><TeamManagement /></Suspense>} />
          <Route path="/infrastructure/settings" element={<Suspense fallback={<PageLoadingSkeleton />}><InfrastructureSettings /></Suspense>} />
        </>
      )}

      {/* Business routes */}
      {isBusinessRole && (
        <>
          <Route path="/dashboard" element={<Suspense fallback={<PageLoadingSkeleton />}><Dashboard /></Suspense>} />
          <Route path="/business/dashboard" element={<Suspense fallback={<PageLoadingSkeleton />}><Dashboard /></Suspense>} />
          <Route path="/business/businesses" element={<Suspense fallback={<PageLoadingSkeleton />}><Businesses dataStore={dataStore} onNavigate={(path) => navigate(path)} /></Suspense>} />
          <Route path="/orders" element={<Suspense fallback={<PageLoadingSkeleton />}><Orders /></Suspense>} />
          <Route path="/business/orders" element={<Suspense fallback={<PageLoadingSkeleton />}><Orders /></Suspense>} />
          <Route path="/products" element={<Suspense fallback={<PageLoadingSkeleton />}><Products /></Suspense>} />
          <Route path="/business/products" element={<Suspense fallback={<PageLoadingSkeleton />}><Products /></Suspense>} />
          <Route path="/business/catalog" element={<Suspense fallback={<PageLoadingSkeleton />}><BusinessCatalogManagement /></Suspense>} />
          <Route path="/chat" element={<Suspense fallback={<PageLoadingSkeleton />}><Chat /></Suspense>} />
          <Route path="/business/chat" element={<Suspense fallback={<PageLoadingSkeleton />}><Chat /></Suspense>} />
          <Route path="/inventory" element={<Suspense fallback={<PageLoadingSkeleton />}><Inventory onNavigate={(path) => navigate(path)} /></Suspense>} />
          <Route path="/business/inventory" element={<Suspense fallback={<PageLoadingSkeleton />}><Inventory onNavigate={(path) => navigate(path)} /></Suspense>} />
          <Route path="/business/dispatch" element={<Suspense fallback={<PageLoadingSkeleton />}><DispatchBoard dataStore={dataStore} /></Suspense>} />
          <Route path="/business/drivers" element={<Suspense fallback={<PageLoadingSkeleton />}><DriversManagement dataStore={dataStore} /></Suspense>} />
          <Route path="/business/reports" element={<Suspense fallback={<PageLoadingSkeleton />}><Reports dataStore={dataStore} onNavigate={(path) => navigate(path)} /></Suspense>} />
          <Route path="/business/sales" element={<Suspense fallback={<PageLoadingSkeleton />}><SalesDashboard /></Suspense>} />
          <Route path="/business/support" element={<Suspense fallback={<PageLoadingSkeleton />}><SupportConsole /></Suspense>} />
          <Route path="/business/team" element={<Suspense fallback={<PageLoadingSkeleton />}><TeamManagement /></Suspense>} />
          <Route path="/business/permissions" element={<Suspense fallback={<PageLoadingSkeleton />}><BusinessPermissionManagement /></Suspense>} />
          <Route path="/business/zones" element={<Suspense fallback={<PageLoadingSkeleton />}><ZoneManagement dataStore={dataStore} onNavigate={(path) => navigate(path)} /></Suspense>} />
          <Route path="/business/warehouse" element={<Suspense fallback={<PageLoadingSkeleton />}><WarehouseDashboard dataStore={dataStore} onNavigate={(path) => navigate(path)} /></Suspense>} />
          <Route path="/business/incoming" element={<Suspense fallback={<PageLoadingSkeleton />}><Incoming dataStore={dataStore} onNavigate={(path) => navigate(path)} /></Suspense>} />
          <Route path="/business/restock" element={<Suspense fallback={<PageLoadingSkeleton />}><RestockRequests dataStore={dataStore} onNavigate={(path) => navigate(path)} /></Suspense>} />
          <Route path="/business/tasks" element={<Suspense fallback={<PageLoadingSkeleton />}><Tasks dataStore={dataStore} onNavigate={(path) => navigate(path)} /></Suspense>} />
          <Route path="/notifications" element={<Suspense fallback={<PageLoadingSkeleton />}><Notifications dataStore={dataStore} onNavigate={(path) => navigate(path)} /></Suspense>} />
          <Route path="/business/analytics" element={<Suspense fallback={<PageLoadingSkeleton />}><MyStats dataStore={dataStore} /></Suspense>} />
          <Route path="/business/channels" element={<Suspense fallback={<PageLoadingSkeleton />}><Channels dataStore={dataStore} onNavigate={(path) => navigate(path)} currentUser={null} /></Suspense>} />
          <Route path="/business/settings" element={<Suspense fallback={<PageLoadingSkeleton />}><BusinessSettings /></Suspense>} />
          <Route path="/business/profile" element={<Suspense fallback={<PageLoadingSkeleton />}><UserProfile /></Suspense>} />
          <Route path="/store/profile" element={<Suspense fallback={<PageLoadingSkeleton />}><UserProfile /></Suspense>} />
        </>
      )}

      {/* Driver routes */}
      {isDriverRole && (
        <>
          <Route path="/driver/deliveries" element={<Suspense fallback={<PageLoadingSkeleton />}><MyDeliveries dataStore={dataStore} /></Suspense>} />
          <Route path="/driver/dashboard" element={<Suspense fallback={<PageLoadingSkeleton />}><DriverDashboard dataStore={dataStore} /></Suspense>} />
          <Route path="/driver/earnings" element={<Suspense fallback={<PageLoadingSkeleton />}><DriverEarningsPage /></Suspense>} />
          <Route path="/driver/profile" element={<Suspense fallback={<PageLoadingSkeleton />}><UserProfile /></Suspense>} />
          <Route path="/driver/chat" element={<Suspense fallback={<PageLoadingSkeleton />}><Chat /></Suspense>} />
          <Route path="/driver/tasks" element={<Suspense fallback={<PageLoadingSkeleton />}><Tasks dataStore={dataStore} onNavigate={(path) => navigate(path)} /></Suspense>} />
          <Route path="/notifications" element={<Suspense fallback={<PageLoadingSkeleton />}><Notifications dataStore={dataStore} onNavigate={(path) => navigate(path)} /></Suspense>} />
          <Route path="/store/profile" element={<Suspense fallback={<PageLoadingSkeleton />}><UserProfile /></Suspense>} />
        </>
      )}

      {/* Customer/Store routes */}
      {isCustomerRole && (
        <>
          <Route path="/store/catalog" element={<Suspense fallback={<PageLoadingSkeleton />}><CatalogPage dataStore={dataStore} onNavigate={(path) => navigate(path)} /></Suspense>} />
          <Route path="/store/search" element={<Suspense fallback={<PageLoadingSkeleton />}><SearchPage dataStore={dataStore} onNavigate={(path) => navigate(path)} /></Suspense>} />
          <Route path="/store/cart" element={<Suspense fallback={<PageLoadingSkeleton />}><CartPage onNavigate={(path) => navigate(path)} /></Suspense>} />
          <Route path="/store/checkout" element={<Suspense fallback={<PageLoadingSkeleton />}><CheckoutPage dataStore={dataStore} /></Suspense>} />
          <Route path="/store/orders" element={<Suspense fallback={<PageLoadingSkeleton />}><MyOrdersPage dataStore={dataStore} /></Suspense>} />
          <Route path="/store/orders/:orderId" element={<Suspense fallback={<PageLoadingSkeleton />}><OrderDetailPage dataStore={dataStore} /></Suspense>} />
          <Route path="/notifications" element={<Suspense fallback={<PageLoadingSkeleton />}><Notifications dataStore={dataStore} onNavigate={(path) => navigate(path)} /></Suspense>} />
          <Route path="/store/profile" element={<Suspense fallback={<PageLoadingSkeleton />}><UserProfile /></Suspense>} />
        </>
      )}

      {/* Unauthorized access */}
      <Route path="/unauthorized" element={<Suspense fallback={<PageLoadingSkeleton />}><UnauthorizedPage /></Suspense>} />

      {/* Root and catch-all redirect based on role */}
      <Route path="/" element={<RoleBasedRedirect />} />
      <Route path="*" element={<RoleBasedRedirect />} />
    </Routes>
  );
}
