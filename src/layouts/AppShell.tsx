import React, { ReactNode } from 'react';
import { colors, spacing, zIndex } from '../design-system';

export interface AppShellProps {
  header?: ReactNode;
  sidebar?: ReactNode;
  bottomNav?: ReactNode;
  children: ReactNode;
  sidebarCollapsed?: boolean;
}

export function AppShell({ header, sidebar, bottomNav, children, sidebarCollapsed = false }: AppShellProps) {
  const sidebarWidth = sidebarCollapsed ? '64px' : '240px';

  const shellStyles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: sidebar ? `${sidebarWidth} 1fr` : '1fr',
    gridTemplateRows: header ? 'auto 1fr' : '1fr',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    background: colors.background.primary,
  };

  const headerStyles: React.CSSProperties = {
    gridColumn: '1 / -1',
    borderBottom: `1px solid ${colors.border.primary}`,
    zIndex: zIndex.sticky,
    background: colors.background.primary,
  };

  const sidebarStyles: React.CSSProperties = {
    borderRight: `1px solid ${colors.border.primary}`,
    background: colors.background.secondary,
    overflowY: 'auto',
    transition: 'width 200ms ease-in-out',
    width: sidebarWidth,
  };

  const mainStyles: React.CSSProperties = {
    overflowY: 'auto',
    position: 'relative',
    background: colors.background.primary,
  };

  const bottomNavStyles: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    borderTop: `1px solid ${colors.border.primary}`,
    background: colors.background.primary,
    zIndex: zIndex.sticky,
  };

  return (
    <div style={shellStyles}>
      {header && <header style={headerStyles}>{header}</header>}
      {sidebar && <aside style={sidebarStyles}>{sidebar}</aside>}
      <main style={mainStyles}>{children}</main>
      {bottomNav && <nav style={bottomNavStyles}>{bottomNav}</nav>}
    </div>
  );
}

export interface AppHeaderProps {
  title?: string;
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
}

export function AppHeader({ title, left, center, right }: AppHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${spacing[3]} ${spacing[4]}`,
        height: '56px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>{left}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        {center || (title && <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: colors.text.primary }}>{title}</h1>)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flex: 1 }}>{right}</div>
    </div>
  );
}

export interface NavItemProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
}

export function NavItem({ icon, label, active = false, onClick, collapsed = false }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing[3],
        width: '100%',
        padding: `${spacing[3]} ${spacing[4]}`,
        border: 'none',
        background: active ? colors.brand.faded : 'transparent',
        color: active ? colors.brand.primary : colors.text.secondary,
        cursor: 'pointer',
        textAlign: 'left',
        fontSize: '15px',
        fontWeight: active ? 600 : 400,
        transition: 'all 150ms ease-in-out',
      }}
    >
      <span style={{ fontSize: '20px', display: 'flex', alignItems: 'center' }}>{icon}</span>
      {!collapsed && <span>{label}</span>}
    </button>
  );
}

export interface BottomNavItemProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function BottomNavItem({ icon, label, active = false, onClick }: BottomNavItemProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing[1],
        flex: 1,
        padding: `${spacing[2]} ${spacing[1]}`,
        border: 'none',
        background: 'transparent',
        color: active ? colors.brand.primary : colors.text.secondary,
        cursor: 'pointer',
        fontSize: '11px',
        fontWeight: active ? 600 : 400,
      }}
    >
      <span style={{ fontSize: '24px', display: 'flex', alignItems: 'center' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
