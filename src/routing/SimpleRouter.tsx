import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAppServices } from '../context/AppServicesContext';
import { useAuth } from '../context/AuthContext';
import { PageLoadingSkeleton } from '../components/LoadingSkeleton';
import { LoginPage } from '../pages/LoginPage';
import { RoleSelectionPage } from '../pages/RoleSelectionPage';
import { getEntryPointForRole } from './UnifiedRouter';
import { UserRole } from '../shells/types';

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
const MyStats = React.lazy(() => import('../pages/MyStats').then(m => ({ default: m.MyStats })));
const Channels = React.lazy(() => import('../pages/Channels').then(m => ({ default: m.Channels })));
const MyDeliveries = React.lazy(() => import('../pages/MyDeliveries').then(m => ({ default: m.MyDeliveries })));
const DriverDashboard = React.lazy(() => import('../pages/DriverDashboard').then(m => ({ default: m.DriverDashboard })));
const CatalogPage = React.lazy(() => import('../store/CatalogPage').then(m => ({ default: m.CatalogPage })));
const CheckoutPage = React.lazy(() => import('../store/CheckoutPage').then(m => ({ default: m.CheckoutPage })));
const MyOrdersPage = React.lazy(() => import('../store/MyOrdersPage').then(m => ({ default: m.MyOrdersPage })));
const OrderDetailPage = React.lazy(() => import('../store/OrderDetailPage').then(m => ({ default: m.OrderDetailPage })));
const UserProfile = React.lazy(() => import('../pages/UserProfile').then(m => ({ default: m.UserProfilePage })));

// Role-aware redirect component
function RoleBasedRedirect() {
  const { userRole } = useAppServices();
  const location = useLocation();

  // Get the correct entry point for the user's role
  const entryPoint = getEntryPointForRole(userRole as UserRole);

  // Redirect immediately using Navigate component
  return <Navigate to={entryPoint} replace />;
}

export function SimpleRouter() {
  const { isAuthenticated, userRole, dataStore } = useAppServices();
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

  // Role-based routes
  const isBusinessRole = ['business_owner', 'manager', 'warehouse', 'dispatcher', 'sales', 'customer_service', 'infrastructure_owner'].includes(userRole || '');
  const isDriverRole = userRole === 'driver';
  const isCustomerRole = ['customer', 'user'].includes(userRole || '');

  return (
    <Routes>
      {/* Role Selection - accessible to all authenticated users */}
      <Route path="/role-selection" element={<RoleSelectionPage />} />

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
          <Route path="/business/catalog" element={<Suspense fallback={<PageLoadingSkeleton />}><BusinessCatalog /></Suspense>} />
          <Route path="/chat" element={<Suspense fallback={<PageLoadingSkeleton />}><Chat /></Suspense>} />
          <Route path="/business/chat" element={<Suspense fallback={<PageLoadingSkeleton />}><Chat /></Suspense>} />
          <Route path="/inventory" element={<Suspense fallback={<PageLoadingSkeleton />}><Inventory onNavigate={(path) => navigate(path)} /></Suspense>} />
          <Route path="/business/inventory" element={<Suspense fallback={<PageLoadingSkeleton />}><Inventory onNavigate={(path) => navigate(path)} /></Suspense>} />
          <Route path="/business/dispatch" element={<Suspense fallback={<PageLoadingSkeleton />}><DispatchBoard dataStore={dataStore} /></Suspense>} />
          <Route path="/business/drivers" element={<Suspense fallback={<PageLoadingSkeleton />}><DriversManagement dataStore={dataStore} /></Suspense>} />
          <Route path="/business/reports" element={<Suspense fallback={<PageLoadingSkeleton />}><Reports dataStore={dataStore} onNavigate={(path) => navigate(path)} /></Suspense>} />
          <Route path="/business/sales" element={<Suspense fallback={<PageLoadingSkeleton />}><SalesDashboard /></Suspense>} />
          <Route path="/business/support" element={<Suspense fallback={<PageLoadingSkeleton />}><div style={{ padding: '20px' }}>Support Dashboard - Coming Soon</div></Suspense>} />
          <Route path="/business/team" element={<Suspense fallback={<PageLoadingSkeleton />}><TeamManagement /></Suspense>} />
          <Route path="/business/zones" element={<Suspense fallback={<PageLoadingSkeleton />}><ZoneManagement dataStore={dataStore} onNavigate={(path) => navigate(path)} /></Suspense>} />
          <Route path="/business/warehouse" element={<Suspense fallback={<PageLoadingSkeleton />}><WarehouseDashboard dataStore={dataStore} onNavigate={(path) => navigate(path)} /></Suspense>} />
          <Route path="/business/incoming" element={<Suspense fallback={<PageLoadingSkeleton />}><Incoming dataStore={dataStore} onNavigate={(path) => navigate(path)} /></Suspense>} />
          <Route path="/business/restock" element={<Suspense fallback={<PageLoadingSkeleton />}><RestockRequests dataStore={dataStore} onNavigate={(path) => navigate(path)} /></Suspense>} />
          <Route path="/business/tasks" element={<Suspense fallback={<PageLoadingSkeleton />}><Tasks dataStore={dataStore} onNavigate={(path) => navigate(path)} /></Suspense>} />
          <Route path="/business/analytics" element={<Suspense fallback={<PageLoadingSkeleton />}><MyStats dataStore={dataStore} /></Suspense>} />
          <Route path="/business/channels" element={<Suspense fallback={<PageLoadingSkeleton />}><Channels dataStore={dataStore} onNavigate={(path) => navigate(path)} currentUser={null} /></Suspense>} />
          <Route path="/business/profile" element={<Suspense fallback={<PageLoadingSkeleton />}><UserProfile /></Suspense>} />
          <Route path="/store/profile" element={<Suspense fallback={<PageLoadingSkeleton />}><UserProfile /></Suspense>} />
        </>
      )}

      {/* Driver routes */}
      {isDriverRole && (
        <>
          <Route path="/driver/deliveries" element={<Suspense fallback={<PageLoadingSkeleton />}><MyDeliveries dataStore={dataStore} /></Suspense>} />
          <Route path="/driver/dashboard" element={<Suspense fallback={<PageLoadingSkeleton />}><DriverDashboard dataStore={dataStore} /></Suspense>} />
          <Route path="/store/profile" element={<Suspense fallback={<PageLoadingSkeleton />}><UserProfile /></Suspense>} />
        </>
      )}

      {/* Customer/Store routes */}
      {isCustomerRole && (
        <>
          <Route path="/store/catalog" element={<Suspense fallback={<PageLoadingSkeleton />}><CatalogPage dataStore={dataStore} onNavigate={(path) => navigate(path)} /></Suspense>} />
          <Route path="/store/checkout" element={<Suspense fallback={<PageLoadingSkeleton />}><CheckoutPage dataStore={dataStore} /></Suspense>} />
          <Route path="/store/orders" element={<Suspense fallback={<PageLoadingSkeleton />}><MyOrdersPage dataStore={dataStore} /></Suspense>} />
          <Route path="/store/orders/:orderId" element={<Suspense fallback={<PageLoadingSkeleton />}><OrderDetailPage dataStore={dataStore} /></Suspense>} />
          <Route path="/store/profile" element={<Suspense fallback={<PageLoadingSkeleton />}><UserProfile /></Suspense>} />
        </>
      )}

      {/* Root and catch-all redirect based on role */}
      <Route path="/" element={<RoleBasedRedirect />} />
      <Route path="*" element={<RoleBasedRedirect />} />
    </Routes>
  );
}
