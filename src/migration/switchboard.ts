import { migrationFlags } from './flags';

export async function resolveProfilePage() {
  const useNew = migrationFlags.unifiedApp || migrationFlags.profile;
  if (useNew) {
    const mod = await import('../pages_migration/ProfilePage.new.tsx');
    return (mod as any).default || (mod as any).ProfilePageNew;
  } else {
    const mod = await import('../pages/Profile.tsx');
    return (mod as any).default || (mod as any).Profile;
  }
}

export async function resolveCatalogPage() {
  const useNew = migrationFlags.unifiedApp || migrationFlags.catalog;
  if (useNew) {
    const mod = await import('../pages_migration/CatalogPage.new.tsx');
    return (mod as any).default || (mod as any).CatalogPageNew;
  } else {
    const mod = await import('../pages/Catalog.tsx');
    return (mod as any).default || (mod as any).Catalog;
  }
}

export async function resolveKYCRoute() {
  const useNew = migrationFlags.unifiedApp || migrationFlags.kyc;
  if (useNew) {
    const mod = await import('../pages_migration/KYCFlow.new.tsx');
    return (mod as any).default || (mod as any).KYCFlowNew;
  } else {
    const mod = await import('../pages/kyc/KYCFlow.tsx');
    return (mod as any).default;
  }
}

export async function resolveBusinessDashboard() {
  const useNew = migrationFlags.unifiedApp || migrationFlags.businessDashboard;
  if (useNew) {
    const mod = await import('../pages_migration/BusinessDashboard.new.tsx');
    return (mod as any).default || (mod as any).BusinessDashboardNew;
  } else {
    const mod = await import('../pages/Dashboard.tsx');
    return (mod as any).default || (mod as any).Dashboard;
  }
}

export async function resolveDriverHome() {
  const useNew = migrationFlags.unifiedApp || migrationFlags.driverHome;
  if (useNew) {
    const mod = await import('../pages_migration/DriverHome.new.tsx');
    return (mod as any).default || (mod as any).DriverHomeNew;
  } else {
    const mod = await import('../pages/DriverDashboard.tsx');
    return (mod as any).default || (mod as any).DriverDashboard;
  }
}

export async function resolveHeader() {
  if (migrationFlags.header) {
    const mod = await import('../components/navigation/NavHeader');
    return (mod as any).default || (mod as any).NavHeader;
  }
  const mod = await import('../components/Header');
  return (mod as any).default || (mod as any).Header;
}

export async function resolveModal() {
  if (migrationFlags.modal) {
    const mod = await import('../components/primitives/Modal');
    return (mod as any).Modal;
  }
  const mod = await import('../components/legacy/LegacyModal');
  return (mod as any).default || (mod as any).LegacyModal;
}

export async function resolveDrawer() {
  if (migrationFlags.drawer) {
    const mod = await import('../components/primitives/Drawer');
    return (mod as any).Drawer;
  }
  const mod = await import('../components/legacy/LegacyDrawer');
  return (mod as any).default || (mod as any).LegacyDrawer;
}

export async function resolveCreateBusinessModal() {
  if (migrationFlags.modal) {
    const mod = await import('../migration/modals/CreateBusinessModal.migration');
    return (mod as any).default;
  }
  const mod = await import('../components/CreateBusinessModal');
  return (mod as any).default || (mod as any).CreateBusinessModal;
}

export async function resolveDriverAssignmentModal() {
  if (migrationFlags.modal) {
    const mod = await import('../migration/modals/DriverAssignmentModal.migration');
    return (mod as any).default;
  }
  const mod = await import('../components/DriverAssignmentModal');
  return (mod as any).default || (mod as any).DriverAssignmentModal;
}

export async function resolveProfitDistributionModal() {
  if (migrationFlags.modal) {
    const mod = await import('../migration/modals/ProfitDistributionModal.migration');
    return (mod as any).default;
  }
  const mod = await import('../components/ProfitDistributionModal');
  return (mod as any).default || (mod as any).ProfitDistributionModal;
}

export async function resolveRoleSelectionModal() {
  if (migrationFlags.modal) {
    const mod = await import('../migration/modals/RoleSelectionModal.migration');
    return (mod as any).default;
  }
  const mod = await import('../components/RoleSelectionModal');
  return (mod as any).default || (mod as any).RoleSelectionModal;
}

export async function resolveNotificationPreferencesModal() {
  if (migrationFlags.modal) {
    const mod = await import('../migration/modals/NotificationPreferences.migration');
    return (mod as any).default;
  }
  const mod = await import('../components/NotificationPreferences');
  return (mod as any).default || (mod as any).NotificationPreferences;
}

export async function resolveCartDrawer() {
  if (migrationFlags.drawer && migrationFlags.catalog) {
    const modNew = await import('../components/cart/CartDrawer.new');
    return (modNew as any).default;
  }
  if (migrationFlags.drawer) {
    const mod = await import('../migration/drawers/CartDrawer.migration');
    return (mod as any).default;
  }
  const mod = await import('../store/CartDrawer');
  return (mod as any).default || (mod as any).CartDrawer;
}

export async function resolveAddProductDrawer() {
  if (migrationFlags.drawer) {
    const mod = await import('../migration/drawers/AddProductDrawer.migration');
    return (mod as any).default;
  }
  const mod = await import('../components/AddProductDrawer');
  return (mod as any).default || (mod as any).AddProductDrawer;
}

export async function resolveStoreShell() {
  if (migrationFlags.unifiedShell) {
    const mod = await import('../migration/UnifiedShellRouter');
    return (mod as any).default || (mod as any).UnifiedShellRouter;
  }
  const mod = await import('../shells/StoreShell');
  return (mod as any).default || (mod as any).StoreShell;
}

export async function resolveBusinessShell() {
  if (migrationFlags.unifiedShell) {
    const mod = await import('../migration/UnifiedShellRouter');
    return (mod as any).default || (mod as any).UnifiedShellRouter;
  }
  const mod = await import('../shells/BusinessShell');
  return (mod as any).default || (mod as any).BusinessShell;
}

export async function resolveDriverShell() {
  if (migrationFlags.unifiedShell) {
    const mod = await import('../migration/UnifiedShellRouter');
    return (mod as any).default || (mod as any).UnifiedShellRouter;
  }
  const mod = await import('../shells/DriverShell');
  return (mod as any).default || (mod as any).DriverShell;
}

export async function resolveUserMenuPopover() {
  if (migrationFlags.popover) {
    const mod = await import('../components/migration/popovers/UserMenuPopover.migration');
    return (mod as any).default;
  }
  const mod = await import('../components/organisms/UserMenu');
  return (mod as any).default || (mod as any).UserMenu;
}

export async function resolveBusinessContextPopover() {
  if (migrationFlags.popover) {
    const mod = await import('../components/migration/popovers/BusinessContextPopover.migration');
    return (mod as any).default;
  }
  const mod = await import('../components/BusinessContextSwitcher');
  return (mod as any).default || (mod as any).BusinessContextSwitcher;
}

export async function resolveStoreAvatarPopover() {
  if (migrationFlags.popover) {
    const mod = await import('../components/migration/popovers/StoreAvatarPopover.migration');
    return (mod as any).default;
  }
  return () => null;
}

export async function resolveNavProductPage() {
  if (!migrationFlags.navigation) return null;
  const mod = await import('../migration/routes/ProductPage.migration');
  return (mod as any).default;
}

export async function resolveNavProfileMenuPage() {
  if (!migrationFlags.navigation) return null;
  const mod = await import('../migration/routes/ProfileMenuPage.migration');
  return (mod as any).default;
}

export async function resolveNavMetricsPage() {
  if (!migrationFlags.navigation) return null;
  const mod = await import('../migration/routes/MetricsPage.migration');
  return (mod as any).default;
}

export async function resolveNavDeliveryPage() {
  if (!migrationFlags.navigation) return null;
  const mod = await import('../migration/routes/DeliveryPage.migration');
  return (mod as any).default;
}

export function isDataSandboxActive() {
  return !!migrationFlags.dataSandbox;
}

export async function resolveSearchBarNew() {
  if (!migrationFlags.catalog || !migrationFlags.search) return null;
  const mod = await import('../components/search/SearchBar.new');
  return (mod as any).default;
}

export async function resolveFilterChipsNew() {
  if (!migrationFlags.catalog || !migrationFlags.search) return null;
  const mod = await import('../components/search/FilterChips.new');
  return (mod as any).default;
}

export async function resolveProductDetailPage() {
  const useNew = migrationFlags.unifiedApp || migrationFlags.productDetail;
  if (useNew) {
    const mod = await import('../pages_migration/ProductDetailPage.new.tsx');
    return (mod as any).default;
  }
  // Fallback to legacy catalog page if a dedicated product page does not exist.
  const mod = await import('../store/CatalogPage');
  return (mod as any).default || (mod as any).CatalogPage;
}

export async function resolveProfileMenuModal() {
  if (migrationFlags.modal) {
    const mod = await import('../migration/modals/ProfileMenuModal.migration');
    return (mod as any).default;
  }
  return () => null;
}

export async function resolveProductDrawer() {
  if (migrationFlags.drawer) {
    const mod = await import('../migration/drawers/ProductDrawer.migration');
    return (mod as any).default;
  }
  return () => null;
}

export async function resolveMetricsPopover() {
  if (migrationFlags.popover) {
    const mod = await import('../migration/popovers/MetricsPopover.migration');
    return (mod as any).default;
  }
  return () => null;
}
