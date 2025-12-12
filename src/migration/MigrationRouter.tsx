import React from 'react';
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

// Consolidated route renderer for unifiedApp flows
export default function MigrationRouter(props: { dataStore?: any; onNavigate?: (path: string) => void }) {
  const { dataStore, onNavigate } = props;

  const UnifiedProductDetail = () => {
    const params = useParams<{ id: string }>();
    return <ProductDetailRoute productId={params.id} dataStore={dataStore} />;
  };

  return (
    <Routes>
      <Route path="/store" element={<Navigate to="/store/catalog" replace />} />
      <Route path="/store/catalog" element={<CatalogRoute dataStore={dataStore} onNavigate={onNavigate} />} />
      <Route path="/store/profile" element={<ProfileRoute dataStore={dataStore} onNavigate={onNavigate} />} />
      <Route path="/store/product/:id" element={<UnifiedProductDetail />} />
      <Route path="/store/kyc/*" element={<KYCRoute />} />
      <Route path="/business/dashboard" element={<BusinessDashboardRoute dataStore={dataStore} />} />
      <Route path="/driver/dashboard" element={<DriverHomeRoute dataStore={dataStore} />} />
      <Route path="*" element={<Navigate to="/store/catalog" replace />} />
    </Routes>
  );
}
