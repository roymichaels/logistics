import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import UnifiedShellRouter from './UnifiedShellRouter';
import {
  resolveProfilePage,
  resolveCatalogPage,
  resolveKYCRoute,
  resolveBusinessDashboard,
  resolveDriverHome,
  resolveHeader,
  resolveModal,
  resolveDrawer,
  resolveStoreShell,
  resolveBusinessShell,
  resolveDriverShell,
  resolveUserMenuPopover,
  resolveBusinessContextPopover,
  resolveStoreAvatarPopover,
  resolveCreateBusinessModal,
  resolveDriverAssignmentModal,
  resolveTelegramModal,
  resolveProfitDistributionModal,
  resolveRoleSelectionModal,
  resolveNotificationPreferencesModal,
  resolveCartDrawer,
  resolveAddProductDrawer,
  resolveProductDetailPage
} from './switchboard';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAppServices } from '../context/AppServicesContext';
import { useAuth } from '../context/AuthContext';

// Lazy-loaded pages from App.tsx
const Dashboard = lazy(() => import('../pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const Orders = lazy(() => import('../pages/Orders.new').then((module) => ({ default: module.Orders })));
const Tasks = lazy(() => import('../pages/Tasks').then((module) => ({ default: module.Tasks })));
const UserManagement = lazy(() => import('../pages/UserManagement').then((module) => ({ default: module.UserManagement })));
const Chat = lazy(() => import('../pages/Chat').then((module) => ({ default: module.Chat })));
const Notifications = lazy(() => import('../pages/Notifications').then((module) => ({ default: module.Notifications })));
const Channels = lazy(() => import('../pages/Channels').then((module) => ({ default: module.Channels })));
const Products = lazy(() => import('../pages/Products').then((module) => ({ default: module.Products })));
const SandboxPage = lazy(() => import('../pages/Sandbox').then((module) => ({ default: module.Sandbox })));
const StartNewPage = lazy(() => import('../pages/StartNew').then((module) => ({ default: module.StartNew })));
const Reports = lazy(() => import('../pages/Reports').then((module) => ({ default: module.Reports })));
const Businesses = lazy(() => import('../pages/Businesses').then((module) => ({ default: module.Businesses })));
const MyStats = lazy(() => import('../pages/MyStats').then((module) => ({ default: module.MyStats })));
const Inventory = lazy(() => import('../pages/Inventory').then((module) => ({ default: module.Inventory })));
const Incoming = lazy(() => import('../pages/Incoming').then((module) => ({ default: module.Incoming })));
const RestockRequests = lazy(() => import('../pages/RestockRequests').then((module) => ({ default: module.RestockRequests })));
const Logs = lazy(() => import('../pages/Logs').then((module) => ({ default: module.Logs })));
const MyDeliveries = lazy(() => import('../pages/MyDeliveries').then((module) => ({ default: module.MyDeliveries })));
const MyInventory = lazy(() => import('../pages/MyInventory').then((module) => ({ default: module.MyInventory })));
const MyZones = lazy(() => import('../pages/MyZones').then((module) => ({ default: module.MyZones })));
const DriverStatus = lazy(() => import('../pages/DriverStatus').then((module) => ({ default: module.DriverStatus })));
const DispatchBoard = lazy(() => import('../pages/DispatchBoard').then((module) => ({ default: module.DispatchBoard })));
const WarehouseDashboard = lazy(() => import('../pages/WarehouseDashboard').then((module) => ({ default: module.WarehouseDashboard })));
const ManagerInventory = lazy(() => import('../pages/ManagerInventory').then((module) => ({ default: module.ManagerInventory })));
const ZoneManagement = lazy(() => import('../pages/ZoneManagement').then((module) => ({ default: module.ZoneManagement })));
const MyRole = lazy(() => import('../pages/MyRole').then((module) => ({ default: module.MyRole })));
const DriversManagement = lazy(() => import('../pages/DriversManagement.new').then((module) => ({ default: module.DriversManagement })));
const UserHomepage = lazy(() => import('../pages/UserHomepage').then((module) => ({ default: module.UserHomepage })));
const SocialFeed = lazy(() => import('../pages/SocialFeed').then((module) => ({ default: module.SocialFeed })));
const UserProfilePage = lazy(() => import('../pages/UserProfile').then((module) => ({ default: module.UserProfilePage })));
const SocialAnalytics = lazy(() => import('../pages/SocialAnalytics').then((module) => ({ default: module.SocialAnalytics })));
const KYCFlow = lazy(() => import('../pages/kyc/KYCFlow'));
const CustomerExperienceDemo = lazy(() => import('../pages/modern/CustomerExperienceDemo').then((module) => ({ default: module.CustomerExperienceDemo })));
const BusinessDemoPage = lazy(() => import('../pages/modern/BusinessDemoPage').then((module) => ({ default: module.BusinessDemoPage })));
const PageLoadingSkeleton = () => <div style={{ padding: 20 }}>Loading...</div>;

export function ProfileRoute(props: Record<string, unknown>) {
  const [Component, setComponent] = React.useState<React.ComponentType | null>(null);
  const pageTitle = usePageTitle();

  React.useEffect(() => {
    resolveProfilePage().then((mod) => setComponent(() => mod));
  }, []);

  if (!Component) return null;
  return (
    <UnifiedShellRouter>
      <Component {...props} pageTitle={pageTitle} />
    </UnifiedShellRouter>
  );
}

export function CatalogRoute(props: Record<string, unknown> & { dataStore?: any; onNavigate?: (path: string) => void }) {
  const [Component, setComponent] = React.useState<React.ComponentType | null>(null);
  const { dataStore, onNavigate, ...rest } = props;
  const pageTitle = usePageTitle();

  React.useEffect(() => {
    resolveCatalogPage().then((mod) => setComponent(() => mod));
  }, []);

  const [products, setProducts] = React.useState<any[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    if (dataStore?.listProducts) {
      dataStore
        .listProducts()
        .then((list: any[]) => {
          if (!cancelled) setProducts(list || []);
        })
        .catch(() => {
          if (!cancelled) setProducts([]);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [dataStore]);

  if (!Component) return null;

  // Legacy component still receives rest + dataStore/onNavigate; new component also gets products/onSelect.
  return (
    <UnifiedShellRouter dataStore={dataStore}>
      <Component
        {...rest}
        pageTitle={pageTitle}
        dataStore={dataStore}
        onNavigate={onNavigate}
        products={products}
        onSelect={onNavigate ? (p: any) => onNavigate(`/store/product/${p?.id}`) : undefined}
      />
    </UnifiedShellRouter>
  );
}

export function KYCRoute(props: Record<string, unknown>) {
  const [Component, setComponent] = React.useState<React.ComponentType | null>(null);
  const pageTitle = usePageTitle();

  React.useEffect(() => {
    resolveKYCRoute().then((mod) => setComponent(() => mod));
  }, []);

  if (!Component) return null;
  return (
    <UnifiedShellRouter>
      <Component {...props} pageTitle={pageTitle} />
    </UnifiedShellRouter>
  );
}

export function BusinessDashboardRoute(props: Record<string, unknown>) {
  const [Component, setComponent] = React.useState<React.ComponentType | null>(null);
  const pageTitle = usePageTitle();

  React.useEffect(() => {
    resolveBusinessDashboard().then((mod) => setComponent(() => mod));
  }, []);

  if (!Component) return null;
  return (
    <UnifiedShellRouter>
      <Component {...props} pageTitle={pageTitle} />
    </UnifiedShellRouter>
  );
}

export function DriverHomeRoute(props: Record<string, unknown>) {
  const [Component, setComponent] = React.useState<React.ComponentType | null>(null);
  const pageTitle = usePageTitle();

  React.useEffect(() => {
    resolveDriverHome().then((mod) => setComponent(() => mod));
  }, []);

  if (!Component) return null;
  return (
    <UnifiedShellRouter>
      <Component {...props} pageTitle={pageTitle} />
    </UnifiedShellRouter>
  );
}

export function HeaderRoute(props: Record<string, unknown>) {
  const [Component, setComponent] = React.useState<React.ComponentType | null>(null);

  React.useEffect(() => {
    resolveHeader().then((mod) => setComponent(() => mod));
  }, []);

  if (!Component) return null;
  return (
    <Component {...props} />
  );
}

export function ModalRoute(props: Record<string, unknown>) {
  const [Component, setComponent] = React.useState<React.ComponentType | null>(null);

  React.useEffect(() => {
    resolveModal().then((mod) => setComponent(() => mod));
  }, []);

  if (!Component) return null;
  return <Component {...props} />;
}

export function DrawerRoute(props: Record<string, unknown>) {
  const [Component, setComponent] = React.useState<React.ComponentType | null>(null);

  React.useEffect(() => {
    resolveDrawer().then((mod) => setComponent(() => mod));
  }, []);

  if (!Component) return null;
  return <Component {...props} />;
}

export function useModalResolver() {
  return {
    CreateBusinessModal: resolveCreateBusinessModal,
    DriverAssignmentModal: resolveDriverAssignmentModal,
    TelegramModal: resolveTelegramModal,
    ProfitDistributionModal: resolveProfitDistributionModal,
    RoleSelectionModal: resolveRoleSelectionModal,
    NotificationPreferencesModal: resolveNotificationPreferencesModal,
    CartDrawer: resolveCartDrawer,
    AddProductDrawer: resolveAddProductDrawer
  };
}

export function useShellResolver() {
  return {
    StoreShell: resolveStoreShell,
    BusinessShell: resolveBusinessShell,
    DriverShell: resolveDriverShell
  };
}

export function useDrawerResolver() {
  return {
    CartDrawer: resolveCartDrawer,
    AddProductDrawer: resolveAddProductDrawer
  };
}

export function ProductDetailRoute(props: { productId?: string; dataStore?: any }) {
  const [Component, setComponent] = React.useState<React.ComponentType | null>(null);
  const pageTitle = usePageTitle();

  React.useEffect(() => {
    resolveProductDetailPage().then((mod) => setComponent(() => mod));
  }, []);

  if (!Component) return null;
  return (
    <UnifiedShellRouter dataStore={props?.dataStore}>
      <Component {...props} pageTitle={pageTitle} />
    </UnifiedShellRouter>
  );
}

export function PopoverRoute(props: Record<string, unknown>) {
  const [Component, setComponent] = React.useState<React.ComponentType | null>(null);

  React.useEffect(() => {
    resolveUserMenuPopover().then((mod) => setComponent(() => mod));
  }, []);

  if (!Component) return null;
  return <Component {...props} />;
}

export function usePopoverResolver() {
  return {
    UserMenuPopover: resolveUserMenuPopover,
    BusinessContextPopover: resolveBusinessContextPopover,
    StoreAvatarPopover: resolveStoreAvatarPopover
  };
}

// Consolidated route renderer for unified shell - ALL application routes
export default function MigrationRouter(props: { dataStore?: any; onNavigate?: (path: string) => void }) {
  const { dataStore, onNavigate } = props;
  const { user } = useAuth();

  const UnifiedProductDetail = () => {
    const params = useParams<{ id: string }>();
    return <ProductDetailRoute productId={params.id} dataStore={dataStore} />;
  };

  return (
    <Suspense fallback={<PageLoadingSkeleton />}>
      <Routes>
        {/* Store Routes */}
        <Route path="/store" element={<Navigate to="/store/catalog" replace />} />
        <Route path="/store/catalog" element={<CatalogRoute dataStore={dataStore} onNavigate={onNavigate} />} />
        <Route path="/store/cart" element={<div style={{ padding: 20 }}>Cart (placeholder)</div>} />
        <Route path="/store/checkout" element={<div style={{ padding: 20 }}>Checkout (placeholder)</div>} />
        <Route path="/store/orders" element={<Orders dataStore={dataStore} onNavigate={onNavigate} />} />
        <Route path="/store/profile" element={<ProfileRoute dataStore={dataStore} onNavigate={onNavigate} />} />
        <Route path="/store/product/:id" element={<UnifiedProductDetail />} />
        <Route path="/store/kyc/*" element={<KYCRoute />} />
        <Route path="kyc/*" element={<KYCFlow />} />
        <Route path="kyc" element={<Navigate to="kyc/start" replace />} />

        {/* Modern Customer Experience Demo */}
        <Route path="/customer-demo" element={<CustomerExperienceDemo dataStore={dataStore} />} />

        {/* Modern Business Tools Demo */}
        <Route path="/business-demo" element={<BusinessDemoPage dataStore={dataStore} />} />

        {/* Business Routes */}
        <Route path="/business" element={<Navigate to="/business/dashboard" replace />} />
        <Route path="/business/dashboard" element={<Dashboard dataStore={dataStore} onNavigate={onNavigate} />} />
        <Route path="/business/products" element={<Products dataStore={dataStore} onNavigate={onNavigate} />} />
        <Route path="/business/orders" element={<Orders dataStore={dataStore} onNavigate={onNavigate} />} />
        <Route path="/business/restock" element={<RestockRequests dataStore={dataStore} onNavigate={onNavigate} />} />
        <Route path="/business/inventory" element={<Inventory dataStore={dataStore} onNavigate={onNavigate} />} />
        <Route path="/business/incoming" element={<Incoming dataStore={dataStore} onNavigate={onNavigate} />} />
        <Route path="/business/reports" element={<Reports dataStore={dataStore} onNavigate={onNavigate} />} />
        <Route path="/business/drivers" element={<DriversManagement dataStore={dataStore} onNavigate={onNavigate} />} />
        <Route path="/business/zones" element={<ZoneManagement dataStore={dataStore} onNavigate={onNavigate} />} />
        <Route path="/business/manager-inventory" element={<ManagerInventory dataStore={dataStore} onNavigate={onNavigate} />} />
        <Route path="/business/warehouse" element={<WarehouseDashboard dataStore={dataStore} onNavigate={onNavigate} />} />
        <Route path="/business/dispatch" element={<DispatchBoard dataStore={dataStore} onNavigate={onNavigate} />} />
        <Route path="/sandbox" element={<SandboxPage dataStore={dataStore} onNavigate={onNavigate} />} />
        <Route path="/start-new" element={<StartNewPage dataStore={dataStore} onNavigate={onNavigate} />} />
        <Route path="/admin/logs" element={<Logs dataStore={dataStore} onNavigate={onNavigate} />} />
        <Route path="/channels" element={<Channels dataStore={dataStore} onNavigate={onNavigate} currentUser={user} />} />
        <Route path="/notifications" element={<Notifications dataStore={dataStore} onNavigate={onNavigate} />} />
        <Route path="/chat" element={<Chat dataStore={dataStore} onNavigate={onNavigate} currentUser={user} />} />

        {/* Driver Routes */}
        <Route path="/driver" element={<Navigate to="/driver/dashboard" replace />} />
        <Route path="/driver/dashboard" element={<DriverStatus dataStore={dataStore} onNavigate={onNavigate} />} />
        <Route path="/driver/tasks" element={<Tasks dataStore={dataStore} onNavigate={onNavigate} />} />
        <Route path="/driver/routes" element={<MyDeliveries dataStore={dataStore} onNavigate={onNavigate} />} />
        <Route path="/driver/my-deliveries" element={<MyDeliveries dataStore={dataStore} onNavigate={onNavigate} />} />
        <Route path="/driver/my-inventory" element={<MyInventory dataStore={dataStore} onNavigate={onNavigate} />} />
        <Route path="/driver/my-zones" element={<MyZones dataStore={dataStore} onNavigate={onNavigate} />} />
        <Route path="/driver/status" element={<DriverStatus dataStore={dataStore} onNavigate={onNavigate} />} />

        {/* Admin Routes */}
        <Route path="/admin/analytics" element={<Reports dataStore={dataStore} onNavigate={onNavigate} />} />
        <Route path="/admin/businesses" element={<Businesses dataStore={dataStore} onNavigate={onNavigate} />} />
        <Route path="/admin/users" element={<UserManagement onNavigate={onNavigate} currentUser={user} dataStore={dataStore} />} />

        {/* Social/User Routes */}
        <Route path="/user-homepage" element={<UserHomepage dataStore={dataStore} onNavigate={onNavigate} />} />
        <Route path="/social-feed" element={<SocialFeed />} />
        <Route path="/social-profile" element={<UserProfilePage />} />
        <Route path="/social-analytics" element={<SocialAnalytics />} />
        <Route path="/my-stats" element={<MyStats dataStore={dataStore} onNavigate={onNavigate} />} />
        <Route path="/my-role" element={<MyRole dataStore={dataStore} onNavigate={onNavigate} />} />

        {/* Default Fallback */}
        <Route path="/" element={<Navigate to="/store/catalog" replace />} />
        <Route path="*" element={<Navigate to="/store/catalog" replace />} />
      </Routes>
    </Suspense>
  );
}
