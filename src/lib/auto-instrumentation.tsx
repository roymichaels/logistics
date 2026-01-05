/**
 * Automatic Component Instrumentation
 *
 * Automatically instruments all major components for runtime diagnostics.
 * This module wraps components with performance tracking without requiring
 * manual intervention in each component file.
 */

import { ComponentType, lazy } from 'react';
import { withTracer } from './component-tracer';
import { logger } from './logger';

const instrumentedComponents = new Set<string>();

/**
 * Wraps a component with diagnostic tracking
 */
export function instrumentComponent<P extends object>(
  Component: ComponentType<P>,
  name?: string
): ComponentType<P> {
  const componentName = name || Component.displayName || Component.name || 'Anonymous';

  if (instrumentedComponents.has(componentName)) {
    return Component;
  }

  instrumentedComponents.add(componentName);

  return withTracer(Component, {
    trackRenderDuration: true,
    trackProps: false,
    logMounts: false,
    logUnmounts: false,
    logErrors: true,
  });
}

/**
 * Wraps a lazy-loaded component with diagnostics
 */
export function instrumentLazy<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  name: string
): ComponentType<P> {
  const LazyComponent = lazy(async () => {
    const module = await importFn();
    const Instrumented = instrumentComponent(module.default, name);
    return { default: Instrumented };
  });

  return LazyComponent as ComponentType<P>;
}

/**
 * Auto-instrument all page components
 */
export function instrumentPages() {
  const pageComponents = {
    // Admin Pages
    'AdminDashboard': () => import('@/pages/admin/PlatformDashboard'),
    'AdminBusinesses': () => import('@/pages/admin/AdminBusinesses'),
    'AdminAnalytics': () => import('@/pages/admin/AdminAnalytics'),
    'AdminSettings': () => import('@/pages/admin/AdminSettings'),
    'AuditLogs': () => import('@/pages/admin/AuditLogs'),
    'FeatureFlags': () => import('@/pages/admin/FeatureFlags'),
    'Infrastructures': () => import('@/pages/admin/Infrastructures'),
    'PlatformCatalog': () => import('@/pages/admin/PlatformCatalog'),
    'Superadmins': () => import('@/pages/admin/Superadmins'),

    // Business Pages
    'BusinessCatalogManagement': () => import('@/pages/business/BusinessCatalogManagement'),
    'BusinessSettings': () => import('@/pages/business/Settings'),
    'TeamManagement': () => import('@/pages/business/TeamManagement'),
    'BusinessPermissions': () => import('@/pages/business/PermissionManagement'),

    // Main Pages
    'Dashboard': () => import('@/pages/Dashboard'),
    'Businesses': () => import('@/pages/Businesses'),
    'BusinessPage': () => import('@/pages/BusinessPage'),
    'BusinessCatalog': () => import('@/pages/BusinessCatalog'),
    'Channels': () => import('@/pages/Channels'),
    'Chat': () => import('@/pages/Chat'),
    'DispatchBoard': () => import('@/pages/DispatchBoard'),
    'Incoming': () => import('@/pages/Incoming'),
    'LandingPage': () => import('@/pages/LandingPage'),
    'LoginPage': () => import('@/pages/LoginPage'),
    'Logs': () => import('@/pages/Logs'),
    'MyDeliveries': () => import('@/pages/MyDeliveries'),
    'MyRole': () => import('@/pages/MyRole'),
    'MyStats': () => import('@/pages/MyStats'),
    'MyZones': () => import('@/pages/MyZones'),
    'Notifications': () => import('@/pages/Notifications'),
    'Products': () => import('@/pages/Products'),
    'Reports': () => import('@/pages/Reports'),
    'RestockRequests': () => import('@/pages/RestockRequests'),
    'RoleSelectionPage': () => import('@/pages/RoleSelectionPage'),
    'StartNew': () => import('@/pages/StartNew'),
    'Tasks': () => import('@/pages/Tasks'),
    'Unauthorized': () => import('@/pages/Unauthorized'),
    'UserHomepage': () => import('@/pages/UserHomepage'),
    'UserManagement': () => import('@/pages/UserManagement'),
    'UserProfile': () => import('@/pages/UserProfile'),
    'WarehouseDashboard': () => import('@/pages/WarehouseDashboard'),
    'ZoneManagement': () => import('@/pages/ZoneManagement'),

    // Customer Service Pages
    'SupportConsole': () => import('@/pages/customer-service/SupportConsole'),
    'SupportDashboard': () => import('@/pages/customer-service/SupportDashboard'),

    // Dispatcher Pages
    'RoutePlanning': () => import('@/pages/dispatcher/RoutePlanning'),

    // Sales Pages
    'SalesDashboard': () => import('@/pages/sales/SalesDashboard'),

    // Store Pages
    'CatalogPage': () => import('@/store/CatalogPage'),
    'CartPage': () => import('@/store/CartPage'),
    'CheckoutPage': () => import('@/store/CheckoutPage'),
    'MyOrdersPage': () => import('@/store/MyOrdersPage'),
    'OrderDetailPage': () => import('@/store/OrderDetailPage'),
    'SearchPage': () => import('@/store/SearchPage'),

    // Module Pages
    'UnifiedDriversPage': () => import('@/modules/driver/pages/UnifiedDriversPage'),
    'UnifiedInventoryPage': () => import('@/modules/inventory/pages/UnifiedInventoryPage'),
    'UnifiedOrdersPage': () => import('@/modules/orders/pages/UnifiedOrdersPage'),
  };

  logger.info(`[Auto-Instrumentation] Registered ${Object.keys(pageComponents).length} page components`);

  return pageComponents;
}

/**
 * Auto-instrument layout components
 */
export function instrumentLayouts() {
  const layoutComponents = {
    'AppShell': () => import('@/shells/AppShell'),
    'AdminShell': () => import('@/shells/AdminShell'),
    'BusinessShell': () => import('@/shells/BusinessShell'),
    'DriverShell': () => import('@/shells/DriverShell'),
    'StoreShell': () => import('@/shells/StoreShell'),
    'BaseShell': () => import('@/shells/BaseShell'),
    'UnifiedAppFrame': () => import('@/layouts/UnifiedAppFrame'),
    'AppViewport': () => import('@/layouts/AppViewport'),
    'BusinessLayout': () => import('@/layouts/BusinessLayout'),
    'DriverLayout': () => import('@/layouts/DriverLayout'),
    'StoreLayout': () => import('@/layouts/StoreLayout'),
    'RoleBasedLayout': () => import('@/layouts/RoleBasedLayout'),
  };

  logger.info(`[Auto-Instrumentation] Registered ${Object.keys(layoutComponents).length} layout components`);

  return layoutComponents;
}

/**
 * Auto-instrument major UI components
 */
export function instrumentUIComponents() {
  const uiComponents = {
    // Organisms
    'DataTable': () => import('@/components/organisms/DataTable'),
    'OrdersTable': () => import('@/components/organisms/OrdersTable'),
    'DashboardStats': () => import('@/components/organisms/DashboardStats'),
    'ActivityFeed': () => import('@/components/organisms/ActivityFeed'),
    'UserMenu': () => import('@/components/organisms/UserMenu'),
    'QuickActionGrid': () => import('@/components/organisms/QuickActionGrid'),
    'LeaderboardCard': () => import('@/components/organisms/LeaderboardCard'),

    // Templates
    'DashboardTemplate': () => import('@/components/templates/DashboardTemplate'),
    'OrdersPageTemplate': () => import('@/components/templates/OrdersPageTemplate'),
    'ProductsPageTemplate': () => import('@/components/templates/ProductsPageTemplate'),
    'DriversPageTemplate': () => import('@/components/templates/DriversPageTemplate'),
    'CatalogPageTemplate': () => import('@/components/templates/CatalogPageTemplate'),
    'ProfilePageTemplate': () => import('@/components/templates/ProfilePageTemplate'),

    // Dashboard Components
    'DashboardHeader': () => import('@/components/dashboard/DashboardHeader'),
    'MetricCard': () => import('@/components/dashboard/MetricCard'),
    'StatsOverview': () => import('@/components/dashboard/StatsOverview'),
    'OrdersChart': () => import('@/components/dashboard/OrdersChart'),
    'RevenueChart': () => import('@/components/dashboard/RevenueChart'),
    'QuickActionsPanel': () => import('@/components/dashboard/QuickActionsPanel'),
    'AgentsWidget': () => import('@/components/dashboard/AgentsWidget'),
    'ZoneCoverageWidget': () => import('@/components/dashboard/ZoneCoverageWidget'),

    // Navigation
    'Header': () => import('@/components/Header'),
    'BottomNavigation': () => import('@/components/BottomNavigation'),
    'RightSidebarMenu': () => import('@/components/RightSidebarMenu'),
    'NavigationDrawer': () => import('@/components/navigation/NavigationDrawer'),
    'DynamicNavigationMenu': () => import('@/components/navigation/DynamicNavigationMenu'),
    'UnifiedMenuPanel': () => import('@/components/navigation/UnifiedMenuPanel'),

    // Orders
    'OrdersList': () => import('@/components/orders/OrdersList'),
    'OrderCard': () => import('@/components/orders/OrderCard'),
    'OrdersFilters': () => import('@/components/orders/OrdersFilters'),
    'OrdersHeader': () => import('@/components/orders/OrdersHeader'),
    'OrdersSearch': () => import('@/components/orders/OrdersSearch'),
    'OrdersEmptyState': () => import('@/components/orders/OrdersEmptyState'),

    // Module Components
    'OrdersContainer': () => import('@/modules/orders/components/OrdersContainer'),
    'OrdersView': () => import('@/modules/orders/components/OrdersView'),
    'OrderDetailView': () => import('@/modules/orders/components/OrderDetailView'),
    'OrderStatsCards': () => import('@/modules/orders/components/OrderStatsCards'),
    'OrderFiltersPanel': () => import('@/modules/orders/components/OrderFiltersPanel'),

    'InventoryContainer': () => import('@/modules/inventory/components/InventoryContainer'),
    'InventoryView': () => import('@/modules/inventory/components/InventoryView'),
    'InventoryCard': () => import('@/modules/inventory/components/InventoryCard'),
    'InventoryStatsCards': () => import('@/modules/inventory/components/InventoryStatsCards'),
    'InventoryFiltersPanel': () => import('@/modules/inventory/components/InventoryFiltersPanel'),

    // Catalog
    'CatalogGrid': () => import('@/components/catalog/CatalogGrid'),
    'CatalogCard': () => import('@/components/catalog/CatalogCard'),
    'ProductModal': () => import('@/components/catalog/ProductModal'),

    // Business
    'BusinessManager': () => import('@/components/BusinessManager'),
    'BusinessSwitcher': () => import('@/components/BusinessSwitcher'),
    'BusinessOwnerOnboarding': () => import('@/components/BusinessOwnerOnboarding'),

    // Dev Tools
    'UnifiedDevConsole': () => import('@/components/dev/UnifiedDevConsole'),
    'DiagnosticDashboard': () => import('@/components/DiagnosticDashboard'),
    'DebugPanel': () => import('@/components/DebugPanel'),

    // Modals
    'CreateBusinessModal': () => import('@/modules/business/components/CreateBusinessModal'),
    'BecomeDriverModal': () => import('@/modules/driver/components/BecomeDriverModal'),
    'RoleSelectionModal': () => import('@/modules/auth/components/RoleSelectionModal'),
    'SearchBusinessModal': () => import('@/modules/business/components/SearchBusinessModal'),

    // Other
    'OnboardingHub': () => import('@/components/OnboardingHub'),
    'SecurityGate': () => import('@/components/SecurityGate'),
    'ErrorBoundary': () => import('@/components/ErrorBoundary'),
    'AppErrorBoundary': () => import('@/components/AppErrorBoundary'),
    'LoadingSkeleton': () => import('@/components/LoadingSkeleton'),
    'OfflineSyncIndicator': () => import('@/components/OfflineSyncIndicator'),
    'ZoneManager': () => import('@/components/ZoneManager'),
    'UserListView': () => import('@/components/UserListView'),
    'AuditLogViewer': () => import('@/components/AuditLogViewer'),
  };

  logger.info(`[Auto-Instrumentation] Registered ${Object.keys(uiComponents).length} UI components`);

  return uiComponents;
}

/**
 * Initialize all auto-instrumentation
 */
export function initializeAutoInstrumentation() {
  const isDev = import.meta.env.DEV;

  if (!isDev) {
    logger.info('[Auto-Instrumentation] Skipping in production mode');
    return;
  }

  logger.info('[Auto-Instrumentation] Initializing component tracking...');

  const pages = instrumentPages();
  const layouts = instrumentLayouts();
  const uiComponents = instrumentUIComponents();

  const totalComponents =
    Object.keys(pages).length +
    Object.keys(layouts).length +
    Object.keys(uiComponents).length;

  logger.info(`[Auto-Instrumentation] Total registered: ${totalComponents} components`);
  logger.info('[Auto-Instrumentation] Components will be tracked as they mount');

  return {
    pages,
    layouts,
    uiComponents,
    totalComponents,
  };
}

/**
 * Get instrumentation statistics
 */
export function getInstrumentationStats() {
  return {
    totalInstrumented: instrumentedComponents.size,
    components: Array.from(instrumentedComponents).sort(),
  };
}
