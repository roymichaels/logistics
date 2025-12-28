import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePageTitle } from '../context/PageTitleContext';
import { useAppServices } from '../context/AppServicesContext';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../lib/i18n';
import { UnifiedMenuPanel, MenuItemConfig } from '../components/navigation/UnifiedMenuPanel';
import { UserMenu } from '../components/organisms/UserMenu';
import { getNavigationForRole } from './navigationSchema';
import { DevConsoleDrawer } from '../components/dev/DevConsoleDrawer';

interface UnifiedAppShellProps {
  children: React.ReactNode;
}


export function UnifiedAppShell({ children }: UnifiedAppShellProps) {
  const { userRole, isAuthenticated } = useAppServices();
  const { user } = useAuth();
  const { title, subtitle } = usePageTitle();
  const location = useLocation();
  const navigate = useNavigate();
  const { translations } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [devConsoleOpen, setDevConsoleOpen] = useState(false);

  const resolvedTitle = title === undefined ? 'UndergroundLab' : title;
  const resolvedSubtitle = subtitle;

  const navigationItems = useMemo(() => getNavigationForRole(userRole), [userRole]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setDevConsoleOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const menuItems: MenuItemConfig[] = navigationItems
    .filter(item => item.visible)
    .map(item => ({
      id: item.id,
      label: item.label,
      icon: item.icon || '📌',
      path: item.path,
    }));

  const headerContent = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 'var(--spacing-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 2vw, 16px)', flex: 1, minWidth: 0 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 'clamp(14px, 4vw, 18px)', fontWeight: 700, color: 'rgba(255, 255, 255, 0.95)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {resolvedTitle}
          </div>
          {resolvedSubtitle && (
            <div style={{ fontSize: 'clamp(11px, 3vw, 13px)', color: 'rgba(255, 255, 255, 0.6)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {resolvedSubtitle}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 2vw, 12px)', flexShrink: 0 }}>
        <button
          onClick={() => setMenuOpen(true)}
          style={{
            width: 'clamp(40px, 10vw, 48px)',
            height: 'clamp(40px, 10vw, 48px)',
            minWidth: '44px',
            minHeight: '44px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: 'clamp(18px, 5vw, 20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            flexShrink: 0,
            padding: 0,
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
        <UserMenu
          user={user ? {
            name: user.name || user.username || user.wallet_address?.slice(0, 8),
            username: user.username,
            role: userRole || undefined,
            photo_url: user.photo_url
          } : undefined}
          onNavigate={(page) => {
            if (page === 'profile') navigate('/store/profile');
            else if (page === 'settings') navigate('/settings');
          }}
          onLogout={() => {
            localStorage.clear();
            navigate('/login');
          }}
        />
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
      {isAuthenticated && (
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'clamp(12px, 3vw, 20px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            backgroundColor: 'rgba(10, 10, 12, 0.3)',
            minHeight: 'var(--header-height-mobile)',
          }}
        >
          {headerContent}
        </header>
      )}

      <div
        style={{
          flex: 1,
          overflow: 'auto',
          width: '100%',
        }}
      >
        {children}
      </div>

      {isAuthenticated && (
        <UnifiedMenuPanel
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
          items={menuItems}
          currentPath={location.pathname}
          onNavigate={navigate}
          title="Menu"
        />
      )}

      <button
        onClick={() => setDevConsoleOpen(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: '1px solid rgba(29, 155, 240, 0.3)',
          backgroundColor: 'rgba(29, 155, 240, 0.1)',
          backdropFilter: 'blur(10px)',
          color: '#1D9BF0',
          fontSize: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 12px rgba(29, 155, 240, 0.2)',
          zIndex: 9999,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(29, 155, 240, 0.2)';
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(29, 155, 240, 0.1)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
        aria-label="Open Dev Console"
        title="Dev Console (Ctrl+Shift+D)"
      >
        ⚙️
      </button>

      <DevConsoleDrawer
        isOpen={devConsoleOpen}
        onClose={() => setDevConsoleOpen(false)}
      />
    </div>
  );
}
