import React from 'react';
import { appTokens } from '../theme/app/tokens';
import { AppContainer } from './layout/AppContainer';
import { PageContainer } from './layout/PageContainer';
import { HeaderRoute } from '../migration/MigrationRouter';
import { migrationFlags } from '../migration/flags';

type ShellSlots = {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  actions?: React.ReactNode;
};

type Props = ShellSlots & {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
  dataStore?: any;
};

const ENABLE_TELEGRAMX_UI = true;

/**
 * Minimal store shell wrapper.
 * No logic yet; slots reserved for future use.
 */
export function StoreShell({ header, sidebar, actions, children, title, subtitle, onNavigate, onLogout, dataStore }: Props) {
  if (migrationFlags.unifiedShell || migrationFlags.unifiedApp) {
    return null;
  }

  const headerNode = header ? (
    <div style={{ maxWidth: '100%', overflow: 'hidden' }}>{header}</div>
  ) : (
    <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
      <HeaderRoute
        title={title || 'Store'}
        subtitle={subtitle}
        onNavigate={onNavigate}
        onLogout={onLogout}
        dataStore={dataStore}
        popoverEnabled={migrationFlags.popover}
      />
    </div>
  );
  const actionsNode = actions ? (
    <div style={{ maxWidth: '100%', overflow: 'hidden' }}>{actions}</div>
  ) : null;

  if (!ENABLE_TELEGRAMX_UI) {
    return (
      <AppContainer>
        <PageContainer>
          {headerNode}
          {sidebar}
          {actionsNode}
          <div>{children}</div>
        </PageContainer>
      </AppContainer>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: appTokens.colors.background, color: appTokens.colors.text, transition: appTokens.motion.base }}>
      <AppContainer>
        <PageContainer>
          {headerNode}
          {actionsNode}
          <main style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>{children}</main>
        </PageContainer>
      </AppContainer>
    </div>
  );
}
