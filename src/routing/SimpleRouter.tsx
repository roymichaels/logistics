import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAppServices } from '../context/AppServicesContext';
import { useAuth } from '../context/AuthContext';
import { PageLoadingSkeleton } from '../components/LoadingSkeleton';
import { LoginPage } from '../pages/LoginPage';
import { RoleSelectionPage } from '../pages/RoleSelectionPage';
import { getEntryPointForRole } from './UnifiedRouter';
import { UserRole } from '../shells/types';
import { UnifiedAppShell } from '../shells/AppShell';

const LandingPage = React.lazy(() => import('../pages/LandingPage').then(m => ({ default: m.LandingPage || m.default })));
const Dashboard = React.lazy(() => import('../pages/Dashboard').then(m => ({ default: m.Dashboard || m.default })));
const Orders = React.lazy(() => import('../pages/Orders').then(m => ({ default: m.Orders || m.default })));
const Products = React.lazy(() => import('../pages/Products').then(m => ({ default: m.Products || m.default })));
const Chat = React.lazy(() => import('../pages/Chat').then(m => ({ default: m.Chat || m.default })));
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

      {/* Business routes - wrapped in UnifiedAppShell for navigation */}
      {isBusinessRole && (
        <>
          <Route path="/dashboard" element={<UnifiedAppShell><Suspense fallback={<PageLoadingSkeleton />}><Dashboard /></Suspense></UnifiedAppShell>} />
          <Route path="/business/dashboard" element={<UnifiedAppShell><Suspense fallback={<PageLoadingSkeleton />}><Dashboard /></Suspense></UnifiedAppShell>} />
          <Route path="/orders" element={<UnifiedAppShell><Suspense fallback={<PageLoadingSkeleton />}><Orders /></Suspense></UnifiedAppShell>} />
          <Route path="/business/orders" element={<UnifiedAppShell><Suspense fallback={<PageLoadingSkeleton />}><Orders /></Suspense></UnifiedAppShell>} />
          <Route path="/products" element={<UnifiedAppShell><Suspense fallback={<PageLoadingSkeleton />}><Products /></Suspense></UnifiedAppShell>} />
          <Route path="/business/products" element={<UnifiedAppShell><Suspense fallback={<PageLoadingSkeleton />}><Products /></Suspense></UnifiedAppShell>} />
          <Route path="/chat" element={<UnifiedAppShell><Suspense fallback={<PageLoadingSkeleton />}><Chat /></Suspense></UnifiedAppShell>} />
          <Route path="/business/chat" element={<UnifiedAppShell><Suspense fallback={<PageLoadingSkeleton />}><Chat /></Suspense></UnifiedAppShell>} />
          <Route path="/business/profile" element={<UnifiedAppShell><Suspense fallback={<PageLoadingSkeleton />}><UserProfile /></Suspense></UnifiedAppShell>} />
          <Route path="/store/profile" element={<UnifiedAppShell><Suspense fallback={<PageLoadingSkeleton />}><UserProfile /></Suspense></UnifiedAppShell>} />
        </>
      )}

      {/* Driver routes - wrapped in UnifiedAppShell for navigation */}
      {isDriverRole && (
        <>
          <Route path="/driver/deliveries" element={<UnifiedAppShell><Suspense fallback={<PageLoadingSkeleton />}><div>Driver Deliveries</div></Suspense></UnifiedAppShell>} />
          <Route path="/store/profile" element={<UnifiedAppShell><Suspense fallback={<PageLoadingSkeleton />}><UserProfile /></Suspense></UnifiedAppShell>} />
        </>
      )}

      {/* Customer/Store routes - wrapped in UnifiedAppShell for navigation */}
      {isCustomerRole && (
        <>
          <Route path="/store/catalog" element={<UnifiedAppShell><Suspense fallback={<PageLoadingSkeleton />}><CatalogPage dataStore={dataStore} /></Suspense></UnifiedAppShell>} />
          <Route path="/store/checkout" element={<UnifiedAppShell><Suspense fallback={<PageLoadingSkeleton />}><CheckoutPage dataStore={dataStore} /></Suspense></UnifiedAppShell>} />
          <Route path="/store/orders" element={<UnifiedAppShell><Suspense fallback={<PageLoadingSkeleton />}><MyOrdersPage dataStore={dataStore} /></Suspense></UnifiedAppShell>} />
          <Route path="/store/orders/:orderId" element={<UnifiedAppShell><Suspense fallback={<PageLoadingSkeleton />}><OrderDetailPage dataStore={dataStore} /></Suspense></UnifiedAppShell>} />
          <Route path="/store/profile" element={<UnifiedAppShell><Suspense fallback={<PageLoadingSkeleton />}><UserProfile /></Suspense></UnifiedAppShell>} />
        </>
      )}

      {/* Root and catch-all redirect based on role */}
      <Route path="/" element={<RoleBasedRedirect />} />
      <Route path="*" element={<RoleBasedRedirect />} />
    </Routes>
  );
}
