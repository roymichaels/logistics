import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppShell as LayoutShell, AppHeader } from '../layouts/AppShell';
import { getNavigationConfig } from '../config/navigation';
import { usePageTitle } from '../context/PageTitleContext';
import { useAppServices } from '../context/AppServicesContext';
import { useNavController } from '../migration/controllers/navController';
import { usePopoverController } from '../hooks/usePopoverController';
import { useDrawerController } from '../hooks/useDrawerController';
import {
  resolveUserMenuPopover,
  resolveBusinessContextPopover,
  resolveStoreAvatarPopover,
  resolveCartDrawer
} from '../migration/switchboard';
import { migrationFlags } from '../migration/flags';

interface UnifiedAppShellProps {
  children: React.ReactNode;
}

function HeaderContent(props: {
  title: string;
  subtitle?: string;
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
  dataStore?: any;
  showBackButton?: boolean;
  onBack?: () => void;
  onMenuClick?: (anchor: HTMLElement) => void;
  onAvatarClick?: () => void;
  onBusinessContextClick?: (anchor: HTMLElement) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {props.showBackButton && (
          <button
            onClick={props.onBack}
            style={{
              padding: '8px',
              border: 'none',
              background: 'transparent',
              color: 'var(--color-text)',
              cursor: 'pointer',
              fontSize: '20px',
            }}
          >
            ←
          </button>
        )}
        <div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>
            {props.title}
          </div>
          {props.subtitle && (
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              {props.subtitle}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={(e) => props.onMenuClick?.(e.currentTarget)}
          style={{
            padding: '8px 12px',
            border: 'none',
            background: 'var(--color-panel)',
            color: 'var(--color-text)',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Menu
        </button>
      </div>
    </div>
  );
}

export function UnifiedAppShell({ children }: UnifiedAppShellProps) {
  const { userRole, dataStore, logout } = useAppServices();
  const { title, subtitle } = usePageTitle();
  const location = useLocation();
  const navigate = useNavigate();

  const nav = (() => {
    try {
      return useNavController();
    } catch {
      return null;
    }
  })();

  // Use resolver functions directly - they handle lazy loading internally
  const userMenu = usePopoverController(resolveUserMenuPopover);
  const businessMenu = usePopoverController(resolveBusinessContextPopover);
  const avatarMenu = usePopoverController(resolveStoreAvatarPopover);
  const cartDrawer = useDrawerController(resolveCartDrawer);

  const resolvedTitle = title || 'UndergroundLab';
  const resolvedSubtitle = subtitle;

  // Get navigation configuration based on role
  const navigationConfig = useMemo(() => {
    return getNavigationConfig(userRole, location.pathname, (path: string) => {
      navigate(path);
    });
  }, [userRole, location.pathname, navigate]);

  // Create header with all controls
  const header = (
    <AppHeader
      title={navigationConfig.headerTitle || resolvedTitle}
      right={
        <HeaderContent
          title={navigationConfig.headerTitle || resolvedTitle}
          subtitle={resolvedSubtitle}
          onNavigate={navigate}
          onLogout={logout}
          dataStore={dataStore}
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
                >
                  Profile
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
                >
                  Orders
                </button>
                <div style={{ height: 1, background: 'var(--color-border)', margin: '8px 0' }} />
                <button
                  onClick={() => {
                    userMenu.close();
                    logout?.();
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
                >
                  Logout
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
    <>
      <LayoutShell
        header={header}
        sidebar={navigationConfig.sidebar}
        bottomNav={navigationConfig.bottomNav}
      >
        {children}
      </LayoutShell>
      <userMenu.Render />
      <businessMenu.Render />
      <avatarMenu.Render />
      <cartDrawer.Render />
    </>
  );
}
