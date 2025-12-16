// Unified routing switchboard - All feature flags are now permanently enabled
// This file provides direct imports to the new unified implementations

export async function resolveProfilePage() {
  const mod = await import('../pages_migration/ProfilePage.new.tsx');
  return (mod as any).default || (mod as any).ProfilePageNew;
}

export async function resolveCatalogPage() {
  const mod = await import('../pages_migration/CatalogPage.new.tsx');
  return (mod as any).default || (mod as any).CatalogPageNew;
}

export async function resolveKYCRoute() {
  const mod = await import('../pages_migration/KYCFlow.new.tsx');
  return (mod as any).default || (mod as any).KYCFlowNew;
}

export async function resolveBusinessDashboard() {
  const mod = await import('../pages_migration/BusinessDashboard.new.tsx');
  return (mod as any).default || (mod as any).BusinessDashboardNew;
}

export async function resolveDriverHome() {
  const mod = await import('../pages_migration/DriverHome.new.tsx');
  return (mod as any).default || (mod as any).DriverHomeNew;
}

export async function resolveHeader() {
  const mod = await import('../components/navigation/NavHeader');
  return (mod as any).default || (mod as any).NavHeader;
}

export async function resolveModal() {
  const mod = await import('../components/primitives/Modal');
  return (mod as any).Modal;
}

export async function resolveDrawer() {
  const mod = await import('../components/primitives/Drawer');
  return (mod as any).Drawer;
}

export async function resolveCreateBusinessModal() {
  const mod = await import('../migration/modals/CreateBusinessModal.migration');
  return (mod as any).default;
}

export async function resolveDriverAssignmentModal() {
  const mod = await import('../migration/modals/DriverAssignmentModal.migration');
  return (mod as any).default;
}

export async function resolveProfitDistributionModal() {
  const mod = await import('../migration/modals/ProfitDistributionModal.migration');
  return (mod as any).default;
}

export async function resolveRoleSelectionModal() {
  const mod = await import('../migration/modals/RoleSelectionModal.migration');
  return (mod as any).default;
}

export async function resolveNotificationPreferencesModal() {
  const mod = await import('../migration/modals/NotificationPreferences.migration');
  return (mod as any).default;
}

export async function resolveCartDrawer() {
  const mod = await import('../components/cart/CartDrawer.new');
  return (mod as any).default;
}

export async function resolveAddProductDrawer() {
  const mod = await import('../migration/drawers/AddProductDrawer.migration');
  return (mod as any).default;
}

// Shell resolvers - always return UnifiedShellRouter
export async function resolveStoreShell() {
  const mod = await import('../migration/UnifiedShellRouter');
  return (mod as any).default || (mod as any).UnifiedShellRouter;
}

export async function resolveBusinessShell() {
  const mod = await import('../migration/UnifiedShellRouter');
  return (mod as any).default || (mod as any).UnifiedShellRouter;
}

export async function resolveDriverShell() {
  const mod = await import('../migration/UnifiedShellRouter');
  return (mod as any).default || (mod as any).UnifiedShellRouter;
}

// Popover resolvers
export async function resolveUserMenuPopover() {
  const mod = await import('../components/migration/popovers/UserMenuPopover.migration');
  return (mod as any).default;
}

export async function resolveBusinessContextPopover() {
  const mod = await import('../components/migration/popovers/BusinessContextPopover.migration');
  return (mod as any).default;
}

export async function resolveStoreAvatarPopover() {
  const mod = await import('../components/migration/popovers/StoreAvatarPopover.migration');
  return (mod as any).default;
}

// Navigation page resolvers
export async function resolveNavProductPage() {
  const mod = await import('../migration/routes/ProductPage.migration');
  return (mod as any).default;
}

export async function resolveNavProfileMenuPage() {
  const mod = await import('../migration/routes/ProfileMenuPage.migration');
  return (mod as any).default;
}

export async function resolveNavMetricsPage() {
  const mod = await import('../migration/routes/MetricsPage.migration');
  return (mod as any).default;
}

export async function resolveNavDeliveryPage() {
  const mod = await import('../migration/routes/DeliveryPage.migration');
  return (mod as any).default;
}

// Search resolvers
export async function resolveSearchBarNew() {
  const mod = await import('../components/search/SearchBar.new');
  return (mod as any).default;
}

export async function resolveFilterChipsNew() {
  const mod = await import('../components/search/FilterChips.new');
  return (mod as any).default;
}

// Product detail page
export async function resolveProductDetailPage() {
  const mod = await import('../pages_migration/ProductDetailPage.new.tsx');
  return (mod as any).default;
}

// Search page
export async function resolveSearchPage() {
  const mod = await import('../pages_migration/SearchPage.new.tsx');
  return (mod as any).default || (mod as any).SearchPageNew;
}

// Modal and drawer resolvers
export async function resolveProfileMenuModal() {
  const mod = await import('../migration/modals/ProfileMenuModal.migration');
  return (mod as any).default;
}

export async function resolveProductDrawer() {
  const mod = await import('../migration/drawers/ProductDrawer.migration');
  return (mod as any).default;
}

export async function resolveMetricsPopover() {
  const mod = await import('../migration/popovers/MetricsPopover.migration');
  return (mod as any).default;
}

// Feature flag helper (kept for backward compatibility)
export function isDataSandboxActive() {
  return true;
}
