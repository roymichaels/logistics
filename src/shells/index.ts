// Role-specific shells
export { BusinessShell } from './BusinessShell';
export { DriverShell } from './DriverShell';
export { StoreShell } from './StoreShell';
export { AdminShell } from './AdminShell';
export { UnifiedShell } from './UnifiedShell';

// Shell factory and utilities
export { ShellFactory, useShellType, useIsInShell } from './ShellFactory';

// Shell provider and context
export { ShellProvider, useShell, useShellSlots } from './ShellProvider';

// Layout components
export { AppContainer } from './layout/AppContainer';
export { PageContainer } from './layout/PageContainer';

/**
 * Shell System Overview
 *
 * The shell system provides role-specific UI layouts for different user types:
 *
 * - BusinessShell: For business owners, managers, warehouse, dispatchers, sales, customer service
 * - DriverShell: For delivery drivers with mobile-first bottom navigation
 * - StoreShell: For customers shopping in the storefront
 * - AdminShell: For infrastructure owners managing the entire platform
 * - UnifiedShell: Basic shell for non-specific or transitional states
 *
 * Usage:
 *
 * 1. Automatic shell selection:
 *    <ShellFactory>
 *      <YourPage />
 *    </ShellFactory>
 *
 * 2. Explicit shell selection:
 *    <BusinessShell title="Dashboard">
 *      <DashboardContent />
 *    </BusinessShell>
 *
 * 3. Check current shell:
 *    const shellType = useShellType();
 *    const isBusinessShell = useIsInShell('business');
 */
