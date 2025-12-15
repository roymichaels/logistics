import React, { useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppShell, AppHeader } from '../layouts/AppShell';
import { HeaderRoute, ModalRoute, DrawerRoute, PopoverRoute } from './MigrationRouter';
import { useShell } from '../context/ShellContext';
import { usePageTitle, PageTitleProvider } from '../context/PageTitleContext';
import { usePopoverResolver } from './MigrationRouter';
import { usePopoverController } from '../hooks/usePopoverController';
import { useDrawerResolver } from './MigrationRouter';
import { useDrawerController } from '../hooks/useDrawerController';
import { NavControllerProvider, useNavController, NavLayer } from './controllers/navController';
import { migrationFlags } from './flags';
import { DataSandboxProvider } from './data/DataSandboxContext';
import { UIControllerProvider, UIControllerRenderer } from './controllers/uiController';
import { DrawerControllerProvider } from './useDrawerController';
import { DevMigrationPanel } from './DevMigrationPanel';
import { getNavigationConfig } from '../config/navigation';
import { useAppServices } from '../context/AppServicesContext';

function UnifiedShellRouterContent(props: any) {
  const shell = useShell();
  const { title, subtitle } = usePageTitle();
  const { userRole } = useAppServices();
  const location = useLocation();
  const { UserMenuPopover, BusinessContextPopover, StoreAvatarPopover } = usePopoverResolver();
  const userMenu = usePopoverController(UserMenuPopover);
  const businessMenu = usePopoverController(BusinessContextPopover);
  const avatarMenu = usePopoverController(StoreAvatarPopover);
  const { CartDrawer } = useDrawerResolver();
  const cartDrawer = useDrawerController(CartDrawer);
  const nav = (() => {
    try {
      return useNavController();
    } catch {
      return null;
    }
  })();

  const resolvedTitle = title || 'UndergroundLab';
  const resolvedSubtitle = subtitle;

  const compact = useMemo(() => {
    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 480 : false;
    const isTelegram = typeof window !== 'undefined' && (window as any).Telegram?.WebApp;
    return isMobile || !!isTelegram;
  }, []);

  const navigationConfig = useMemo(() => {
    return getNavigationConfig(userRole, location.pathname, (path: string) => {
      if (shell?.handleNavigate) {
        const pageMap: Record<string, string> = {
          '/business/dashboard': 'dashboard',
          '/business/products': 'products',
          '/business/orders': 'orders',
          '/business/inventory': 'inventory',
          '/business/drivers': 'drivers-management',
          '/business/zones': 'zone-management',
          '/business/reports': 'reports',
          '/driver/dashboard': 'driver-status',
          '/driver/routes': 'my-deliveries',
          '/driver/my-inventory': 'my-inventory',
          '/driver/my-zones': 'my-zones',
          '/store/catalog': 'catalog',
          '/store/profile': 'profile',
          '/store/orders': 'orders',
        };
        const page = pageMap[path];
        if (page) {
          shell.handleNavigate(page as any);
        }
      }
    });
  }, [userRole, location.pathname, shell]);

  const header = (
    <AppHeader
      title={navigationConfig.headerTitle || resolvedTitle}
      right={
        <HeaderRoute
          title={resolvedTitle}
          subtitle={resolvedSubtitle}
          onNavigate={shell?.handleNavigate}
          onLogout={shell?.handleLogout}
          dataStore={props?.dataStore}
          actions={props?.headerActions}
          showBackButton={migrationFlags.navigation && !!nav?.canGoBack}
          onBack={() => {
            if (migrationFlags.navigation) {
              nav?.back();
            }
          }}
          onMenuClick={(anchor) =>
            userMenu.open({
              open: true,
              anchorEl: anchor,
              onClose: () => userMenu.close(),
              children: props?.menuContent || null
            })
          }
          onAvatarClick={() =>
            avatarMenu.open({ open: true, anchorEl: null, onClose: () => avatarMenu.close(), children: null })
          }
          onBusinessContextClick={(anchor) =>
            businessMenu.open({
              open: true,
              anchorEl: anchor,
              onClose: () => businessMenu.close(),
              children: null
            })
          }
        />
      }
    />
  );

  return (
    <DataSandboxProvider>
      <div style={{ ['--compact-enabled' as any]: compact ? '1' : '0' }}>
        <AppShell
          header={header}
          sidebar={navigationConfig.sidebar}
          bottomNav={navigationConfig.bottomNav}
        >
          {props?.children ? props.children : <Outlet />}
        </AppShell>
        <ModalRoute />
        <DrawerRoute />
        <PopoverRoute />
        <UIControllerRenderer />
        <NavLayer />
        <userMenu.Render />
        <businessMenu.Render />
        <avatarMenu.Render />
        <cartDrawer.Render />
        {process.env.NODE_ENV === 'development' && <DevMigrationPanel />}
      </div>
    </DataSandboxProvider>
  );
}

export default function UnifiedShellRouter(props: any) {
  return (
    <PageTitleProvider>
      <NavControllerProvider>
        <UIControllerProvider>
          <DrawerControllerProvider>
            <UnifiedShellRouterContent {...props} />
          </DrawerControllerProvider>
        </UIControllerProvider>
      </NavControllerProvider>
    </PageTitleProvider>
  );
}
