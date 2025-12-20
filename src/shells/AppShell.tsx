import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePageTitle } from '../context/PageTitleContext';
import { useAppServices } from '../context/AppServicesContext';
import { useI18n } from '../lib/i18n';
import { UnifiedMenuPanel, MenuItemConfig } from '../components/navigation/UnifiedMenuPanel';
import { getNavigationForRole } from './navigationSchema';

interface UnifiedAppShellProps {
  children: React.ReactNode;
}


export function UnifiedAppShell({ children }: UnifiedAppShellProps) {
  const { userRole, logout } = useAppServices();
  const { title, subtitle } = usePageTitle();
  const location = useLocation();
  const navigate = useNavigate();
  const { translations } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

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

  console.log("UnifiedAppShell mounted");

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
        <button
          onClick={() => navigate('/store/profile')}
          style={{
            width: 'clamp(40px, 10vw, 44px)',
            height: 'clamp(40px, 10vw, 44px)',
            minWidth: '44px',
            minHeight: '44px',
            borderRadius: '50%',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'rgba(255, 255, 255, 0.7)',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            fontSize: 'clamp(16px, 5vw, 18px)',
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
    </div>
  );
}
