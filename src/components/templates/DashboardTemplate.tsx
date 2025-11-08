import React from 'react';
import { colors, spacing } from '../../styles/design-system';

export interface DashboardTemplateProps {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  bottomNav?: React.ReactNode;
  children: React.ReactNode;
  showSidebar?: boolean;
}

export function DashboardTemplate({
  header,
  sidebar,
  bottomNav,
  children,
  showSidebar = false,
}: DashboardTemplateProps) {
  const containerStyles: React.CSSProperties = {
    minHeight: '100vh',
    background: colors.background.primary,
    display: 'flex',
    flexDirection: 'column',
  };

  const mainContainerStyles: React.CSSProperties = {
    display: 'flex',
    flex: 1,
    position: 'relative',
  };

  const sidebarStyles: React.CSSProperties = {
    width: '280px',
    background: colors.background.secondary,
    borderRight: `1px solid ${colors.border.primary}`,
    position: 'fixed',
    top: header ? '64px' : '0',
    left: 0,
    bottom: bottomNav ? '64px' : '0',
    overflowY: 'auto',
    zIndex: 10,
  };

  const contentStyles: React.CSSProperties = {
    flex: 1,
    padding: spacing['2xl'],
    paddingBottom: bottomNav ? '100px' : spacing['2xl'],
    marginLeft: showSidebar && sidebar ? '280px' : '0',
    transition: 'margin-left 0.3s ease',
  };

  return (
    <div style={containerStyles}>
      {header}
      <div style={mainContainerStyles}>
        {showSidebar && sidebar && <aside style={sidebarStyles}>{sidebar}</aside>}
        <main style={contentStyles}>{children}</main>
      </div>
      {bottomNav}
    </div>
  );
}
