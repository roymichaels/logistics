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
import { useI18n } from '../lib/i18n';

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
  onHamburgerClick?: () => void;
  hasSidebar?: boolean;
}) {
  // Don't render header content if title is empty (custom shell is handling it)
  if (!props.title || props.title.trim() === '') {
    return null;
  }

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
        {props.hasSidebar && (
          <button
            onClick={props.onHamburgerClick}
            style={{
              width: 36,
              height: 36,
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-panel)',
              color: 'var(--color-text)',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              fontSize: '20px',
              fontWeight: 400,
            }}
            aria-label="Menu"
          >
            ☰
          </button>
        )}
        <button
          onClick={(e) => props.onMenuClick?.(e.currentTarget)}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '1px solid var(--color-border)',
            background: 'var(--color-panel)',
            color: 'var(--color-text)',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            fontSize: '18px',
          }}
          aria-label="User menu"
        >
          👤
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
  const { t, translations } = useI18n();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

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

  // Allow empty title (don't default to 'UndergroundLab' if explicitly empty)
  const resolvedTitle = title === undefined ? 'UndergroundLab' : title;
  const resolvedSubtitle = subtitle;

  // Get navigation configuration based on role
  const navigationConfig = useMemo(() => {
    return getNavigationConfig(userRole, location.pathname, (path: string) => {
      navigate(path);
      setSidebarOpen(false); // Close sidebar on navigation
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
          hasSidebar={!!navigationConfig.sidebar}
          onHamburgerClick={() => setSidebarOpen(!sidebarOpen)}
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
                  {translations.header?.myProfile || 'Profile'}
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
                  {translations.orders || 'Orders'}
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
                  {translations.header?.logout || 'Logout'}
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

  // Wrap sidebar in overlay if it exists
  const sidebarContent = navigationConfig.sidebar ? (
    <>
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
          }}
        />
      )}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: sidebarOpen ? 0 : '-280px',
          bottom: 0,
          width: '280px',
          background: 'var(--color-panel)',
          boxShadow: sidebarOpen ? '-4px 0 12px rgba(0, 0, 0, 0.15)' : 'none',
          transition: 'right 0.3s ease-in-out',
          zIndex: 1000,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>
            Menu
          </h3>
          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              width: 32,
              height: 32,
              border: 'none',
              background: 'transparent',
              color: 'var(--color-text)',
              cursor: 'pointer',
              fontSize: '24px',
              display: 'grid',
              placeItems: 'center',
            }}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>
        <div style={{ flex: 1, padding: '16px' }}>
          {navigationConfig.sidebar}
        </div>
      </div>
    </>
  ) : null;

  return (
    <>
      <LayoutShell
        header={header}
        sidebar={null}
        bottomNav={navigationConfig.bottomNav}
      >
        {children}
      </LayoutShell>
      {sidebarContent}
      <userMenu.Render />
      <businessMenu.Render />
      <avatarMenu.Render />
      <cartDrawer.Render />
    </>
  );
}
