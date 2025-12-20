import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { UnifiedMenuPanel, MenuItemConfig } from '../components/navigation/UnifiedMenuPanel';
import { getNavigationForRole } from './navigationSchema';

interface UnifiedAppShellProps {
  children: React.ReactNode;
}


export function UnifiedAppShell({ children }: UnifiedAppShellProps) {
  const { userRole, dataStore, logout } = useAppServices();
  const { title, subtitle } = usePageTitle();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, translations } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  const nav = (() => {
    try {
      return useNavController();
    } catch {
      return null;
    }
  })();

  const userMenu = usePopoverController(resolveUserMenuPopover);
  const businessMenu = usePopoverController(resolveBusinessContextPopover);
  const avatarMenu = usePopoverController(resolveStoreAvatarPopover);
  const cartDrawer = useDrawerController(resolveCartDrawer);

  const resolvedTitle = title === undefined ? 'UndergroundLab' : title;
  const resolvedSubtitle = subtitle;

  const navigationItems = useMemo(() => getNavigationForRole(userRole), [userRole]);

  const menuItems: MenuItemConfig[] = navigationItems
    .filter(item => item.visible)
    .map(item => ({
      id: item.id,
      label: item.label,
      icon: item.icon || '📌',
      path: item.path,
    }));

  const headerContent = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.95)' }}>
            {resolvedTitle}
          </div>
          {resolvedSubtitle && (
            <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '4px' }}>
              {resolvedSubtitle}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => setMenuOpen(true)}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.95)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
          }}
          aria-label="Menu"
        >
          ☰
        </button>
        <button
          onClick={(e) => {
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
              anchorEl: e.currentTarget,
              onClose: () => userMenu.close(),
              children: menuContent
            });
          }}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'rgba(255, 255, 255, 0.7)',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            fontSize: '18px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.95)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
          }}
          aria-label="User menu"
        >
          👤
        </button>
      </div>
    </div>
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100vh',
        backgroundColor: 'rgba(18, 18, 20, 0.95)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          backgroundColor: 'rgba(10, 10, 12, 0.3)',
        }}
      >
        {headerContent}
      </div>

      <div
        style={{
          flex: 1,
          overflow: 'auto',
          width: '100%',
        }}
      >
        {children}
      </div>

      <UnifiedMenuPanel
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={menuItems}
        currentPath={location.pathname}
        onNavigate={navigate}
        title="Menu"
      />

      <userMenu.Render />
      <businessMenu.Render />
      <avatarMenu.Render />
      <cartDrawer.Render />
    </div>
  );
}
