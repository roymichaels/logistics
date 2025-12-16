import React, { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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
      navigate(path);
    });
  }, [userRole, location.pathname, navigate]);

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
          onMenuClick={(anchor) => {
            const menuContent = (
              <div style={{ minWidth: 200, padding: '8px 0' }}>
                <button
                  onClick={() => {
                    userMenu.close();
                    navigate('/store/profile');
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: 'var(--color-text)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-panel)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  👤 Profile
                </button>
                <button
                  onClick={() => {
                    userMenu.close();
                    navigate('/store/orders');
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: 'var(--color-text)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-panel)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  📋 Orders
                </button>
                <div style={{ height: 1, background: 'var(--color-border)', margin: '8px 0' }} />
                <button
                  onClick={() => {
                    userMenu.close();
                    shell?.handleLogout?.();
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: 'var(--color-error)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-panel)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  🚪 Logout
                </button>
              </div>
            );
            userMenu.open({
              open: true,
              anchorEl: anchor,
              onClose: () => userMenu.close(),
              children: menuContent
            });
          }}
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
