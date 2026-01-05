/**
 * Component Registry
 *
 * Central registry for all components that should be tracked by diagnostics.
 * This ensures consistent tracking across the application.
 */

import { useEffect } from 'react';
import { runtimeRegistry } from './runtime-registry';
import { logger } from './logger';

/**
 * Register a component for tracking
 * Use this hook at the top of any component you want to track
 */
export function useComponentTracking(componentName: string) {
  useEffect(() => {
    const startTime = performance.now();
    runtimeRegistry.registerComponentMount(componentName);

    return () => {
      const duration = performance.now() - startTime;
      runtimeRegistry.registerComponentUnmount(componentName);

      if (duration > 5000) {
        logger.debug(`[ComponentTracking] ${componentName} was mounted for ${duration.toFixed(0)}ms`);
      }
    };
  }, [componentName]);

  const trackRender = (renderTime: number) => {
    runtimeRegistry.registerRenderDuration(componentName, renderTime);
  };

  return { trackRender };
}

/**
 * Track component render performance
 */
export function useRenderTracking(componentName: string) {
  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      runtimeRegistry.registerRenderDuration(componentName, duration);
    };
  });
}

/**
 * Register multiple components at once (for batch registration)
 */
export function registerComponents(componentNames: string[]) {
  componentNames.forEach((name) => {
    runtimeRegistry.registerComponentMount(name);
  });

  logger.info(`[ComponentRegistry] Registered ${componentNames.length} components`);
}

/**
 * Auto-register all page components
 */
export const PAGE_COMPONENTS = [
  // Admin
  'PlatformDashboard',
  'AdminBusinesses',
  'AdminAnalytics',
  'AdminSettings',
  'AuditLogs',
  'FeatureFlags',
  'Infrastructures',
  'PlatformCatalog',
  'Superadmins',
  'PermissionManagement',

  // Business
  'BusinessCatalogManagement',
  'BusinessSettings',
  'TeamManagement',
  'BusinessPermissionManagement',

  // Customer Service
  'SupportConsole',
  'SupportDashboard',

  // Dispatcher
  'RoutePlanning',

  // Sales
  'SalesDashboard',

  // Main Pages
  'Dashboard',
  'Businesses',
  'BusinessPage',
  'BusinessCatalog',
  'BusinessPaymentSettings',
  'Channels',
  'Chat',
  'CheckoutPage',
  'DispatchBoard',
  'Incoming',
  'LandingPage',
  'LoginPage',
  'Logs',
  'MyDeliveries',
  'MyRole',
  'MyStats',
  'MyZones',
  'Notifications',
  'PlatformCommissionsPage',
  'Products',
  'Reports',
  'RestockRequests',
  'RoleSelectionPage',
  'StartNew',
  'Tasks',
  'Unauthorized',
  'UserHomepage',
  'UserManagement',
  'UserProfile',
  'WarehouseDashboard',
  'ZoneManagement',

  // Store Pages
  'CatalogPage',
  'CartPage',
  'CheckoutPage',
  'MyOrdersPage',
  'OrderDetailPage',
  'SearchPage',

  // Module Pages
  'UnifiedDriversPage',
  'UnifiedInventoryPage',
  'DriverInventoryPage',
  'InventoryPage',
  'UnifiedOrdersPage',
  'OrdersPage',
  'OrderDetailPage',
] as const;

/**
 * Layout components
 */
export const LAYOUT_COMPONENTS = [
  'AppShell',
  'UnifiedAppShell',
  'AdminShell',
  'BusinessShell',
  'DriverShell',
  'StoreShell',
  'BaseShell',
  'UnifiedAppFrame',
  'AppViewport',
  'AppContainer',
  'BusinessLayout',
  'DriverLayout',
  'StoreLayout',
  'RoleBasedLayout',
  'PageContainer',
  'PageWrapper',
  'Surface',
] as const;

/**
 * UI Components
 */
export const UI_COMPONENTS = [
  // Organisms
  'DataTable',
  'OrdersTable',
  'DashboardStats',
  'ActivityFeed',
  'UserMenu',
  'QuickActionGrid',
  'LeaderboardCard',
  'EmptyState',
  'EditProfileModal',
  'SettingsModal',

  // Templates
  'DashboardTemplate',
  'DashboardLayout',
  'OrdersPageTemplate',
  'ProductsPageTemplate',
  'DriversPageTemplate',
  'CatalogPageTemplate',
  'ProfilePageTemplate',
  'PageTemplate',

  // Dashboard
  'DashboardHeader',
  'MetricCard',
  'StatsOverview',
  'OrdersChart',
  'RevenueChart',
  'QuickActionsPanel',
  'AgentsWidget',
  'ZoneCoverageWidget',
  'Section',
  'LoadingState',

  // Navigation
  'Header',
  'BottomNavigation',
  'RightSidebarMenu',
  'NavigationDrawer',
  'DynamicNavigationMenu',
  'UnifiedMenuPanel',
  'NavHeader',

  // Orders
  'OrdersList',
  'OrderCard',
  'OrdersFilters',
  'OrdersHeader',
  'OrdersSearch',
  'OrdersEmptyState',
  'OrdersContainer',
  'OrdersView',
  'OrderDetailView',
  'OrderStatsCards',
  'OrderFiltersPanel',
  'OrderList',

  // Inventory
  'InventoryContainer',
  'InventoryView',
  'InventoryCard',
  'InventoryStatsCards',
  'InventoryFiltersPanel',
  'StockAdjustmentForm',
  'DriverInventoryContainer',
  'DriverInventoryView',

  // Catalog
  'CatalogGrid',
  'CatalogCard',
  'ProductModal',
  'CatalogAdapter',
  'SandboxQuickAccess',

  // Chat
  'ChatCreateMenu',
  'ChatEmptyState',
  'ChatHeader',
  'ChatSearch',
  'ChatTabs',

  // Product
  'ProductCard',
  'ProductDetailActions',
  'ProductHeroGallery',
  'ProductInfoSection',
  'ProductPriceBlock',

  // Molecules
  'Card',
  'Modal',
  'ListItem',
  'SearchBar',
  'FilterBar',
  'Pagination',
  'FormField',
  'Select',
  'FileUpload',
  'DatePicker',
  'TimeRangePicker',
  'Toast',
  'Accordion',
  'ActivityItem',
  'PageHeader',
  'PageContent',
  'SectionHeader',
  'SettingsCard',
  'EmptyState',
  'LoadingState',
  'NavigationTab',
  'BusinessSidebar',
  'CustomerBottomNav',
  'DriverBottomNav',
  'VisibilityToggle',

  // Atoms
  'Button',
  'Input',
  'Checkbox',
  'Radio',
  'Switch',
  'Badge',
  'Avatar',
  'Icon',
  'Spinner',
  'ProgressBar',
  'Skeleton',
  'Chip',
  'Divider',
  'StatusBadge',
  'StatusIndicator',
  'Tooltip',
  'Typography',
  'Box',
  'Grid',
  'List',
  'Section',
  'ResponsiveContainer',
  'ResponsiveGrid',

  // Business
  'BusinessManager',
  'BusinessSwitcher',
  'BusinessOwnerOnboarding',
  'CreateBusinessModal',
  'SearchBusinessModal',
  'BusinessSettingsModal',
  'ProfitDistributionModal',
  'AddEquityStakeholderModal',

  // Driver
  'BecomeDriverModal',

  // Auth
  'RoleSelectionModal',
  'UserProfileModal',
  'WorkWithUsModal',

  // Dev
  'UnifiedDevConsole',
  'DiagnosticDashboard',
  'DebugPanel',
  'EnhancedDevPanel',
  'UnifiedDevConsole',
  'DevConsoleContent',
  'DevConsoleDrawer',
  'DevConsoleSidebar',

  // Modals/Drawers
  'CartDrawer',
  'AddProductDrawer',
  'NotificationPreferencesModal',
  'GroupChannelCreateModal',

  // Other
  'OnboardingHub',
  'SecurityGate',
  'ErrorBoundary',
  'AppErrorBoundary',
  'DiagnosticErrorBoundary',
  'LoadingSkeleton',
  'PageLoadingSkeleton',
  'OfflineSyncIndicator',
  'ZoneManager',
  'UserListView',
  'AuditLogViewer',
  'KycVerificationFlow',
  'KycAdminReviewPanel',
  'ImageUpload',
  'LanguageToggle',
  'LanguageToggleSwitch',
  'FloatingActionMenu',
  'GlowingPortalLogo',
  'DualModeOrderEntry',
  'OrderCreationWizard',
  'SuperadminSetup',
  'EncryptedChat',
  'NotificationPreferences',
  'PINEntry',

  // Guards
  'ProtectedRoute',
  'RoleGuard',
  'PermissionGuard',
  'ActionGuard',
  'DataGuard',
  'NavigationGuard',
  'PageGuard',

  // Permissions
  'PermissionMatrix',
  'RoleComparisonCard',

  // Social
  'CreatePostBox',
  'PostCard',
  'RecommendedUsers',
  'SimilarPosts',
  'TrendingSidebar',

  // Swiss Design System
  'SwissContainer',
  'SwissFAB',
  'SwissGrid',
  'SwissHUD',
  'SwissList',
  'SwissPanel',
  'SwissRow',
  'SwissSection',
  'SwissSheet',
  'SwissTable',
  'SwissText',

  // Singularity Layout
  'AppFrame',
  'BottomBar',
  'Drawer',
  'LeftSidebar',
  'Panel',
  'RightSidebar',
  'Sheet',
  'Topbar',
  'ViewportContainer',

  // KYC
  'CameraCapture',
  'ChallengeGuide',
  'IDUpload',
  'ResultScreen',
  'KycBadge',
  'SocialLinkInput',
  'SocialUpload',
] as const;

/**
 * All trackable components
 */
export const ALL_COMPONENTS = [
  ...PAGE_COMPONENTS,
  ...LAYOUT_COMPONENTS,
  ...UI_COMPONENTS,
] as const;

export type TrackedComponent = typeof ALL_COMPONENTS[number];

/**
 * Get component registry stats
 */
export function getComponentRegistryStats() {
  return {
    pages: PAGE_COMPONENTS.length,
    layouts: LAYOUT_COMPONENTS.length,
    uiComponents: UI_COMPONENTS.length,
    total: ALL_COMPONENTS.length,
  };
}

/**
 * Initialize component registry
 */
export function initializeComponentRegistry() {
  const isDev = import.meta.env.DEV;

  if (!isDev) {
    return;
  }

  const stats = getComponentRegistryStats();
  logger.info(
    `[ComponentRegistry] Initialized with ${stats.total} trackable components ` +
    `(${stats.pages} pages, ${stats.layouts} layouts, ${stats.uiComponents} UI components)`
  );
}
