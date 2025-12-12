import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { RightSidebarMenu } from '../components/RightSidebarMenu';
import { FloatingActionMenu } from '../components/FloatingActionButton';
import { useAppServices } from '../context/AppServicesContext';
import { useShell } from '../context/ShellContext';
import { useAuth } from '../context/AuthContext';
import { canView } from '../lib/auth/canView';
import { migrationFlags } from '../migration/flags';

/**
 * Wrapper for business/ops experience.
 * The operational shell (header, nav, sidebars) should wrap the children upstream.
 */
export function BusinessLayout({ children }: { children?: React.ReactNode }) {
  const { userRole } = useAppServices();
  const shell = useShell();
  const auth = useAuth();
  const role = (auth?.user as any)?.role || userRole || 'user';

  if (migrationFlags.unifiedShell || migrationFlags.unifiedApp) {
    return null;
  }

  // Redirect drivers to driver layout, clients to storefront
  if (role === 'driver') {
    return <Navigate to="/driver/dashboard" replace />;
  }
  if (!canView('dashboard', role)) {
    return <Navigate to="/store/catalog" replace />;
  }

  return (
    <div style={{ width: '100vw', minHeight: '100vh', overflowX: 'hidden' }}>
      <Header
        onNavigate={shell.handleNavigate}
        onLogout={shell.handleLogout}
        onCreateBusiness={shell.openCreateBusiness}
        onBecomeDriver={shell.openBecomeDriver}
        onSearchBusiness={shell.openSearchBusiness}
      />

      <div style={{ width: '100%', padding: '0 clamp(14px, 3vw, 26px)', boxSizing: 'border-box' }}>
        <Outlet />
      </div>

      <BottomNavigation
        currentPage={shell.currentPage}
        onNavigate={shell.handleNavigate}
        userRole={role as any}
        onShowActionMenu={() => shell.setShowActionMenu(true)}
        onOpenSidebar={() => shell.setShowSidebar(true)}
        onShowCreateOrder={shell.openOrderWizard}
        onShowCreateTask={shell.handleShowCreateTask}
        onShowScanBarcode={shell.handleShowScanBarcode}
        onShowContactCustomer={shell.handleShowContactCustomer}
        onShowCheckInventory={shell.handleShowCheckInventory}
        onShowCreateRoute={shell.handleShowCreateRoute}
        onShowCreateUser={shell.handleShowCreateUser}
        onShowCreateProduct={shell.handleShowCreateProduct}
      />

      <RightSidebarMenu
        isOpen={shell.showSidebar}
        onClose={() => shell.setShowSidebar(false)}
        userRole={role as any}
        currentPage={shell.currentPage}
        onNavigate={shell.handleNavigate}
      />

      <FloatingActionMenu
        onNavigate={shell.handleNavigate}
        onShowModeSelector={shell.openOrderWizard}
        isOpen={shell.showActionMenu}
        onClose={() => shell.setShowActionMenu(false)}
      />
    </div>
  );
}
