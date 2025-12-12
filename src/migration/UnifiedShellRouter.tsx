import React, { useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { AppContainer } from '../shells/layout/AppContainer';
import { PageContainer } from '../shells/layout/PageContainer';
import { HeaderRoute, ModalRoute, DrawerRoute, PopoverRoute } from './MigrationRouter';
import { useShell } from '../context/ShellContext';
import { usePageTitle } from '../hooks/usePageTitle';
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

export default function UnifiedShellRouter(props: any) {
  const shell = useShell();
  const { title, subtitle } = usePageTitle();
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

  const resolvedTitle = title || 'App';
  const resolvedSubtitle = subtitle;

  const compact = useMemo(() => {
    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 480 : false;
    const isTelegram = typeof window !== 'undefined' && (window as any).Telegram?.WebApp;
    return isMobile || !!isTelegram;
  }, []);

  return (
    <NavControllerProvider>
      <UIControllerProvider>
        <DrawerControllerProvider>
          <AppContainer>
            <DataSandboxProvider>
              <div style={{ ['--compact-enabled' as any]: compact ? '1' : '0' }}>
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
                <PageContainer>{props?.children ? props.children : <Outlet />}</PageContainer>
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
          </AppContainer>
        </DrawerControllerProvider>
      </UIControllerProvider>
    </NavControllerProvider>
  );
}
